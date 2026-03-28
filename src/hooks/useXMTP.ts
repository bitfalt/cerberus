// hooks/useXMTP.ts - React hook for XMTP V3
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletClient } from 'wagmi';
import { 
  initializeXMTP, 
  disconnectXMTP, 
  startConversation, 
  sendMessage, 
  loadConversations,
  subscribeToMessages,
  type XMTPMessage,
  type XMTPConversation,
} from '@/lib/xmtp/client';
import { clearCache } from '@/lib/xmtp/cache';

interface UseXMTPReturn {
  client: any | null;
  isInitializing: boolean;
  isConnected: boolean;
  error: string | null;
  conversations: XMTPConversation[];
  activeConversation: XMTPConversation | null;
  messages: XMTPMessage[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startChat: (address: string) => Promise<void>;
  send: (content: string) => Promise<void>;
  setActiveConversation: (conversation: XMTPConversation | null) => void;
}

export function useXMTP(): UseXMTPReturn {
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<XMTPConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<XMTPConversation | null>(null);
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const subscriptionRef = useRef<AsyncGenerator | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Connect to XMTP
  const connect = useCallback(async () => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const xmtpClient = await initializeXMTP(walletClient);
      setClient(xmtpClient);
      setIsConnected(true);

      // Load existing conversations
      const loadedConversations = await loadConversations();
      setConversations(loadedConversations);

      // Start message subscription
      abortControllerRef.current = new AbortController();
      subscribeToNewMessages();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize XMTP';
      setError(message);
      console.error('XMTP connection error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [walletClient]);

  // Subscribe to new messages
  const subscribeToNewMessages = useCallback(async () => {
    try {
      const messageStream = subscribeToMessages();
      subscriptionRef.current = messageStream;

      for await (const message of messageStream) {
        if (abortControllerRef.current?.signal.aborted) break;

        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Update conversation if needed
        setConversations(prev => {
          const exists = prev.some(c => c.topic === message.topic);
          if (!exists) {
            return [...prev, {
              topic: message.topic,
              peerAddress: message.senderAddress,
              messages: [message],
            }];
          }
          return prev.map(c => 
            c.topic === message.topic 
              ? { ...c, messages: [...c.messages, message] }
              : c
          );
        });
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Message subscription error:', err);
      }
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    abortControllerRef.current?.abort();
    
    if (subscriptionRef.current) {
      try {
        // Force close the stream
        await subscriptionRef.current.return?.(undefined);
      } catch {
        // Ignore cleanup errors
      }
    }

    await disconnectXMTP();
    await clearCache();
    
    setClient(null);
    setIsConnected(false);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    subscriptionRef.current = null;
  }, []);

  // Start a new chat
  const startChat = useCallback(async (address: string) => {
    if (!isConnected) {
      setError('XMTP not connected');
      return;
    }

    try {
      const { topic } = await startConversation(address);
      
      // Check if conversation already exists
      const existing = conversations.find(c => c.topic === topic);
      if (!existing) {
        const newConversation: XMTPConversation = {
          topic,
          peerAddress: address,
          messages: [],
        };
        setConversations(prev => [...prev, newConversation]);
        setActiveConversation(newConversation);
      } else {
        setActiveConversation(existing);
        setMessages(existing.messages);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(message);
    }
  }, [isConnected, conversations]);

  // Send a message
  const send = useCallback(async (content: string) => {
    if (!isConnected || !activeConversation) {
      setError('No active conversation');
      return;
    }

    try {
      await sendMessage(activeConversation.topic, content);
      // Message will be added via subscription, but we can optimistically update
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
    }
  }, [isConnected, activeConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (isConnected) {
        disconnectXMTP().catch(console.error);
      }
    };
  }, []);

  // Update messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setMessages(activeConversation.messages);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  return {
    client,
    isInitializing,
    isConnected,
    error,
    conversations,
    activeConversation,
    messages,
    connect,
    disconnect,
    startChat,
    send,
    setActiveConversation,
  };
}
