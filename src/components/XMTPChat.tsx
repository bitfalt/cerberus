// components/XMTPChat.tsx - XMTP chat interface
'use client';

import { useState, useEffect, useRef } from 'react';
import { useXMTP } from '@/hooks/useXMTP';
import { useAccount } from 'wagmi';

interface XMTPChatProps {
  className?: string;
}

export function XMTPChat({ className = '' }: XMTPChatProps) {
  const { address } = useAccount();
  const {
    isConnected,
    isInitializing,
    error,
    conversations,
    activeConversation,
    messages,
    connect,
    disconnect,
    startChat,
    send,
    setActiveConversation,
  } = useXMTP();

  const [newAddress, setNewAddress] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = async () => {
    if (!newAddress || !newAddress.startsWith('0x')) return;
    await startChat(newAddress);
    setNewAddress('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await send(newMessage);
    setNewMessage('');
  };

  if (!address) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 ${className}`}>
        <p className="text-gray-500 text-center">Connect your wallet to use XMTP messaging</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[500px] bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">XMTP Chat</h3>
        {isConnected ? (
          <button
            onClick={disconnect}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={isInitializing}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isInitializing ? 'Connecting...' : 'Connect XMTP'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Connect to XMTP to start encrypted messaging</p>
            <button
              onClick={connect}
              disabled={isInitializing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isInitializing ? 'Initializing...' : 'Connect XMTP'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations sidebar */}
          <div className="w-64 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Enter address (0x...)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartChat()}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleStartChat}
                disabled={!newAddress.startsWith('0x')}
                className="mt-2 w-full px-2 py-1.5 bg-gray-100 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Start Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-3 text-sm text-gray-400 text-center">No conversations yet</p>
              ) : (
                conversations.map((convo) => (
                  <button
                    key={convo.topic}
                    onClick={() => setActiveConversation(convo)}
                    className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                      activeConversation?.topic === convo.topic ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {convo.peerAddress.slice(0, 6)}...{convo.peerAddress.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {convo.messages.length} messages
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-400">No messages yet</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderAddress.toLowerCase() === address.toLowerCase();
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] px-3 py-2 rounded-lg ${
                              isMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                              {new Date(msg.sentAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400">Select a conversation or start a new chat</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
