// lib/xmtp/cache.ts - IndexedDB cache for XMTP messages
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MessageData {
  id: string;
  content: string;
  senderAddress: string;
  sentAt: number;
  topic: string;
}

interface XMTPDB extends DBSchema {
  messages: {
    key: string;
    value: MessageData;
    indexes: { 'by-topic': string; 'by-sender': string };
  };
  conversations: {
    key: string;
    value: {
      topic: string;
      peerAddress: string;
      createdAt: number;
      lastMessageAt?: number;
    };
    indexes: { 'by-peer': string };
  };
}

const DB_NAME = 'xmtp-cache-v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<XMTPDB>> | null = null;

function getDB(): Promise<IDBPDatabase<XMTPDB>> {
  if (!dbPromise) {
    dbPromise = openDB<XMTPDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Messages store
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('by-topic', 'topic');
        messageStore.createIndex('by-sender', 'senderAddress');
        
        // Conversations store
        const convoStore = db.createObjectStore('conversations', { keyPath: 'topic' });
        convoStore.createIndex('by-peer', 'peerAddress');
      },
    });
  }
  return dbPromise;
}

// Cache a message
export async function cacheMessage(message: {
  id: string;
  content: string;
  senderAddress: string;
  sentAt: Date | number;
  topic: string;
}): Promise<void> {
  const db = await getDB();
  const sentAt = message.sentAt instanceof Date 
    ? message.sentAt.getTime() 
    : message.sentAt;
  
  await db.put('messages', {
    id: message.id,
    content: message.content,
    senderAddress: message.senderAddress.toLowerCase(),
    sentAt,
    topic: message.topic,
  });
}

// Get cached messages for a topic
export async function getCachedMessages(topic: string): Promise<MessageData[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-topic', topic);
  return messages.sort((a, b) => a.sentAt - b.sentAt);
}

// Get all cached messages
export async function getAllCachedMessages(): Promise<MessageData[]> {
  const db = await getDB();
  return await db.getAll('messages');
}

// Cache conversation
export async function cacheConversation(conversation: {
  topic: string;
  peerAddress: string;
  createdAt: Date | number;
  lastMessageAt?: Date | number;
}): Promise<void> {
  const db = await getDB();
  
  await db.put('conversations', {
    topic: conversation.topic,
    peerAddress: conversation.peerAddress.toLowerCase(),
    createdAt: conversation.createdAt instanceof Date 
      ? conversation.createdAt.getTime() 
      : conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt instanceof Date 
      ? conversation.lastMessageAt.getTime() 
      : conversation.lastMessageAt,
  });
}

// Get cached conversations
export async function getCachedConversations(): Promise<Array<{ topic: string; peerAddress: string; createdAt: number; lastMessageAt?: number }>> {
  const db = await getDB();
  return await db.getAll('conversations');
}

// Clear cache (useful for logout)
export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear('messages');
  await db.clear('conversations');
}

// Delete specific message
export async function deleteCachedMessage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('messages', id);
}
