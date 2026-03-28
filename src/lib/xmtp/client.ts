// lib/xmtp/client.ts - XMTP V3 client initialization
// XMTP is client-side only due to WASM dependencies
import type { WalletClient } from 'viem';
import { cacheMessage, getCachedMessages } from './cache';

// Dynamically import XMTP only on client side
type XMTPClientType = import('@xmtp/xmtp-js').Client;
type XMTPSignerType = import('@xmtp/xmtp-js').Signer;

let Client: typeof import('@xmtp/xmtp-js').Client | null = null;

async function getXMTPModule() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!Client) {
    const xmtp = await import('@xmtp/xmtp-js');
    Client = xmtp.Client;
    return xmtp;
  }
  return { Client };
}

export type XMTPClient = import('@xmtp/xmtp-js').Client;

export interface XMTPMessage {
  id: string;
  content: string;
  senderAddress: string;
  sentAt: Date;
  topic: string;
}

export interface XMTPConversation {
  topic: string;
  peerAddress: string;
  messages: XMTPMessage[];
}

let xmtpClient: import('@xmtp/xmtp-js').Client | null = null;

// Initialize XMTP client
export async function initializeXMTP(
  walletClient: WalletClient
): Promise<import('@xmtp/xmtp-js').Client> {
  if (xmtpClient) {
    return xmtpClient;
  }

  const xmtpModule = await getXMTPModule();
  if (!xmtpModule || !xmtpModule.Client) {
    throw new Error('XMTP not available on server side');
  }

  // Create XMTP signer from viem wallet
  const signer: import('@xmtp/xmtp-js').Signer = {
    getAddress: async () => walletClient.account?.address || '',
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message,
      });
      return signature;
    },
  };

  // Create or get client
  const env = process.env.NEXT_PUBLIC_XMTP_ENV === 'production' ? 'production' : 'dev';
  
  xmtpClient = await xmtpModule.Client.create(signer, {
    env,
    appVersion: 'cerberus/0.1.0',
  });

  return xmtpClient;
}

// Get existing client (must call initialize first)
export function getXMTPClient(): import('@xmtp/xmtp-js').Client {
  if (!xmtpClient) {
    throw new Error('XMTP client not initialized. Call initializeXMTP first.');
  }
  return xmtpClient;
}

// Start a conversation with an address
export async function startConversation(
  peerAddress: string
): Promise<{ topic: string; stream: AsyncIterable<any> }> {
  const client = getXMTPClient();
  const conversation = await client.conversations.newConversation(peerAddress);
  
  return {
    topic: conversation.topic,
    stream: await conversation.streamMessages(),
  };
}

// Send a message
export async function sendMessage(
  topic: string,
  content: string
): Promise<{ id: string; sentAt: Date }> {
  const client = getXMTPClient();
  const conversations = await client.conversations.list();
  const conversation = conversations.find(c => c.topic === topic);
  
  if (!conversation) {
    throw new Error(`Conversation not found: ${topic}`);
  }
  
  const sent = await conversation.send(content);
  
  // Cache the sent message
  await cacheMessage({
    id: sent.id,
    content: sent.content as string,
    senderAddress: client.address,
    sentAt: sent.sent,
    topic,
  });
  
  return { id: sent.id, sentAt: sent.sent };
}

// Load conversations with cached messages
export async function loadConversations(): Promise<XMTPConversation[]> {
  const client = getXMTPClient();
  const conversations = await client.conversations.list();
  
  const result: XMTPConversation[] = [];
  
  for (const conversation of conversations) {
    // Get cached messages first for fast UI
    const cached = await getCachedMessages(conversation.topic);
    
    // Then fetch new messages from network
    const newMessages = await conversation.messages();
    
    // Merge and deduplicate
    const allMessages = new Map<string, XMTPMessage>();
    
    for (const msg of cached) {
      allMessages.set(msg.id, {
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        sentAt: new Date(msg.sentAt),
        topic: conversation.topic,
      });
    }
    
    for (const msg of newMessages) {
      if (!allMessages.has(msg.id)) {
        const messageData = {
          id: msg.id,
          content: msg.content as string,
          senderAddress: msg.senderAddress,
          sentAt: msg.sent,
          topic: conversation.topic,
        };
        allMessages.set(msg.id, messageData);
        // Cache new message
        await cacheMessage(messageData);
      }
    }
    
    result.push({
      topic: conversation.topic,
      peerAddress: conversation.peerAddress,
      messages: Array.from(allMessages.values()).sort((a, b) => 
        a.sentAt.getTime() - b.sentAt.getTime()
      ),
    });
  }
  
  return result;
}

// Subscribe to new messages
export async function* subscribeToMessages(): AsyncGenerator<XMTPMessage, void, unknown> {
  const client = getXMTPClient();
  const stream = await client.conversations.streamAllMessages();
  
  for await (const message of stream) {
    const messageData = {
      id: message.id,
      content: message.content as string,
      senderAddress: message.senderAddress,
      sentAt: message.sent,
      topic: message.conversation.topic,
    };
    
    // Cache the message
    await cacheMessage(messageData);
    
    yield messageData;
  }
}

// Disconnect XMTP client
export async function disconnectXMTP(): Promise<void> {
  if (xmtpClient) {
    await xmtpClient.close();
    xmtpClient = null;
  }
}
