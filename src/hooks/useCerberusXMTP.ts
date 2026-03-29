'use client';

import { useCallback, useMemo, useState } from 'react';
import { hexToBytes } from 'viem';
import { useWalletClient } from 'wagmi';
import { publicEnv } from '@/lib/public-env';

type BrowserClient = typeof import('@xmtp/browser-sdk').Client;
type BrowserDm = import('@xmtp/browser-sdk').Dm;
type BrowserDecodedMessage = import('@xmtp/browser-sdk').DecodedMessage;
type BrowserIdentifier = import('@xmtp/browser-sdk').Identifier;
type BrowserModule = typeof import('@xmtp/browser-sdk');

type XMTPViewMessage = {
  id: string;
  senderInboxId: string;
  sentAt: Date;
  content: string;
};

let modulePromise: Promise<BrowserModule> | null = null;

async function getXMTPModule() {
  if (!modulePromise) {
    modulePromise = import('@xmtp/browser-sdk');
  }
  return modulePromise;
}

export function useCerberusXMTP() {
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<InstanceType<BrowserClient> | null>(null);
  const [conversation, setConversation] = useState<BrowserDm | null>(null);
  const [messages, setMessages] = useState<XMTPViewMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentAddress = publicEnv.NEXT_PUBLIC_XMTP_AGENT_ADDRESS;

  const connect = useCallback(async () => {
    if (!walletClient?.account) {
      throw new Error('Connect wallet before XMTP');
    }
    if (!agentAddress) {
      throw new Error('NEXT_PUBLIC_AGENT_XMTP_ADDRESS is not configured');
    }

    setIsConnecting(true);
    setError(null);

    try {
      const xmtp = await getXMTPModule();
      const identifier: BrowserIdentifier = {
        identifier: walletClient.account.address.toLowerCase(),
        identifierKind: 0,
      };

      const signer = {
        type: 'EOA' as const,
        getIdentifier: () => identifier,
        signMessage: async (message: string) => {
          const signature = await walletClient.signMessage({
            account: walletClient.account!,
            message,
          });
          return hexToBytes(signature);
        },
      };

      const backend = await xmtp.createBackend({ env: publicEnv.NEXT_PUBLIC_XMTP_ENV });
      const xmtpClient = await xmtp.Client.create(signer, {
        backend,
        appVersion: 'cerberus/1.0.0',
      } as unknown as Parameters<typeof xmtp.Client.create>[1]);

      await xmtpClient.conversations.syncAll();
      const dm = await xmtpClient.conversations.createDmWithIdentifier({
        identifier: agentAddress.toLowerCase(),
        identifierKind: 0,
      });
      await dm.sync();
      const history = await dm.messages();

      setClient(xmtpClient);
      setConversation(dm);
      setMessages(
        history.map((message: BrowserDecodedMessage) => ({
          id: message.id,
          senderInboxId: message.senderInboxId,
          sentAt: message.sentAt,
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        }))
      );
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : 'Failed to connect XMTP';
      setError(message);
      throw connectError;
    } finally {
      setIsConnecting(false);
    }
  }, [agentAddress, walletClient]);

  const refreshMessages = useCallback(async () => {
    if (!conversation) {
      return;
    }

    await conversation.sync();
    const history = await conversation.messages();
    setMessages(
      history.map((message: BrowserDecodedMessage) => ({
        id: message.id,
        senderInboxId: message.senderInboxId,
        sentAt: message.sentAt,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      }))
    );
  }, [conversation]);

  const sendJsonMessage = useCallback(
    async (payload: unknown) => {
      if (!conversation) {
        throw new Error('XMTP conversation not connected');
      }
      const messageId = await conversation.sendText(JSON.stringify(payload));
      await refreshMessages();
      return messageId;
    },
    [conversation, refreshMessages]
  );

  const agentInboxId = useMemo(() => null, []);

  return {
    client,
    conversation,
    messages,
    isConnecting,
    error,
    agentAddress,
    agentInboxId,
    connect,
    refreshMessages,
    sendJsonMessage,
  };
}
