// lib/xmtp/client.ts - XMTP V3 client initialization
// XMTP is client-side only due to WASM dependencies
import type { WalletClient } from 'viem';
import { toBytes } from 'viem';
import { cacheMessage, getCachedMessages } from './cache';

// XMTP V3 types - these will be dynamically imported
type ClientType = import('@xmtp/browser-sdk').Client;
type SignerType = import('@xmtp/browser-sdk').Signer;
type IdentifierType = import('@xmtp/browser-sdk').Identifier;
type IdentifierKindType = import('@xmtp/browser-sdk').IdentifierKind;
type DmType = import('@xmtp/browser-sdk').Dm;
type DecodedMessageType = import('@xmtp/browser-sdk').DecodedMessage;

let XMTPModule: typeof import('@xmtp/browser-sdk') | null = null;

// Dynamically import XMTP only on client side
async function getXMTPModule() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!XMTPModule) {
    XMTPModule = await import('@xmtp/browser-sdk');
  }
  return XMTPModule;
}

export type { ClientType as XMTPClient };

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

let xmtpClient: ClientType | null = null;

// Create an Identifier from an Ethereum address
function createIdentifier(
  address: string,
  IdentifierKind: typeof import('@xmtp/browser-sdk').IdentifierKind
): IdentifierType {
  return {
    identifier: address.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum,
  };
}

// Create a signer from viem wallet client
async function createViemSigner(
  walletClient: WalletClient,
  xmtpModule: typeof import('@xmtp/browser-sdk')
): Promise<SignerType> {
  const address = walletClient.account?.address;
  if (!address) {
    throw new Error('Wallet not connected');
  }

  const identifier = createIdentifier(address, xmtpModule.IdentifierKind);

  return {
    type: 'EOA',
    getIdentifier: () => identifier,
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message,
      });
      // Convert hex signature to Uint8Array
      return toBytes(signature);
    },
  } as SignerType;
}

// Initialize XMTP client
export async function initializeXMTP(
  walletClient: WalletClient
): Promise<ClientType> {
  if (xmtpClient) {
    return xmtpClient;
  }

  const xmtpModule = await getXMTPModule();
  if (!xmtpModule) {
    throw new Error('XMTP not available on server side');
  }

  // Create XMTP signer from viem wallet
  const signer = await createViemSigner(walletClient, xmtpModule);

  // Create or get client
  const env = process.env.NEXT_PUBLIC_XMTP_ENV === 'production' ? 'production' : 'dev';

  // Use type assertion to bypass complex union type checking
  const options = {
    env,
    appVersion: 'cerberus/0.1.0',
  } as any;

  xmtpClient = await xmtpModule.Client.create(signer, options);

  return xmtpClient;
}

// Get existing client (must call initialize first)
export function getXMTPClient(): ClientType {
  if (!xmtpClient) {
    throw new Error('XMTP client not initialized. Call initializeXMTP first.');
  }
  return xmtpClient;
}

// Get or create DM conversation with an address
export async function startConversation(
  peerAddress: string
): Promise<{ topic: string; conversation: DmType }> {
  const client = getXMTPClient();
  
  // In V3, DMs are created using inboxId
  // First, get the inboxId for the peer address
  const xmtpModule = await getXMTPModule();
  if (!xmtpModule) {
    throw new Error('XMTP module not available');
  }
  
  const identifier = createIdentifier(peerAddress, xmtpModule.IdentifierKind);
  const env = process.env.NEXT_PUBLIC_XMTP_ENV === 'production' ? 'production' : 'dev';
  const backend = await xmtpModule.createBackend({ env } as any);
  const inboxId = await xmtpModule.getInboxIdForIdentifier(backend, identifier);
  
  if (!inboxId) {
    throw new Error(`Could not find inbox for address: ${peerAddress}`);
  }
  
  // Create or get DM
  const dm = await client.conversations.createDm(inboxId);
  
  return {
    topic: dm.id,
    conversation: dm,
  };
}

// Send a message
export async function sendMessage(
  topic: string,
  content: string
): Promise<{ id: string; sentAt: Date }> {
  const client = getXMTPClient();
  
  // Try to find in DMs first using the conversation ID
  const conversations = await client.conversations.listDms();
  const dm = conversations.find((c: DmType) => c.id === topic);
  
  if (!dm) {
    throw new Error(`Conversation not found: ${topic}`);
  }
  
  // Send message using the DM (V3 requires encoded content)
  const encodedContent = new TextEncoder().encode(content);
  const messageContent = {
    type: { authorityId: 'xmtp.org', typeId: 'text', versionMajor: 1, versionMinor: 0 },
    parameters: {},
    content: encodedContent,
    fallback: content,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sent = await dm.send(messageContent as any);
  
  // Cache the sent message
  await cacheMessage({
    id: typeof sent === 'string' ? sent : (sent as { id: string }).id,
    content: content,
    senderAddress: client.inboxId || '',
    sentAt: new Date(),
    topic: topic,
  });
  
  const messageId = typeof sent === 'string' ? sent : (sent as { id: string }).id;
  return { id: messageId, sentAt: new Date() };
}

// Helper function to extract content from decoded message
function extractMessageContent(message: DecodedMessageType): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (message.content && typeof message.content === 'object') {
    return JSON.stringify(message.content);
  }
  return '';
}

// Load conversations with cached messages
export async function loadConversations(): Promise<XMTPConversation[]> {
  const client = getXMTPClient();
  
  // Sync conversations first
  await client.conversations.sync();
  
  // Get all DMs (V3 uses separate DMs and Groups)
  const dms = await client.conversations.listDms();
  
  const result: XMTPConversation[] = [];
  
  for (const dm of dms) {
    const topic = dm.id;
    // peerInboxId is a function in V3 that returns Promise<string>
    const peerAddress = await dm.peerInboxId();
    
    // Get cached messages first for fast UI
    const cached = await getCachedMessages(topic);
    
    // Sync messages for this conversation
    await dm.sync();
    
    // Get messages from the DM
    const newMessages = await dm.messages();
    
    // Merge and deduplicate
    const allMessages = new Map<string, XMTPMessage>();
    
    for (const msg of cached) {
      allMessages.set(msg.id, {
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        sentAt: new Date(msg.sentAt),
        topic,
      });
    }
    
    for (const msg of newMessages) {
      if (!allMessages.has(msg.id)) {
        const content = extractMessageContent(msg);
        const messageData = {
          id: msg.id,
          content,
          senderAddress: msg.senderInboxId,
          sentAt: msg.sentAt,
          topic,
        };
        allMessages.set(msg.id, messageData);
        // Cache new message
        await cacheMessage(messageData);
      }
    }
    
    result.push({
      topic,
      peerAddress,
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
  
  // Stream all messages from conversations
  const stream = await client.conversations.streamAllMessages();
  
  for await (const message of stream) {
    const content = extractMessageContent(message);
    
    const messageData: XMTPMessage = {
      id: message.id,
      content,
      senderAddress: message.senderInboxId,
      sentAt: message.sentAt,
      topic: message.conversationId,
    };
    
    // Cache the message
    await cacheMessage(messageData);
    
    yield messageData;
  }
}

// Disconnect XMTP client
export async function disconnectXMTP(): Promise<void> {
  if (xmtpClient) {
    // V3 client has a close method
    xmtpClient.close();
    xmtpClient = null;
  }
}
