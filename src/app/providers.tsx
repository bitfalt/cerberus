// app/providers.tsx - Wagmi + ConvexProvider
'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Wagmi + RainbowKit config
const config = getDefaultConfig({
  appName: 'Cerberus Agent',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'development',
  chains: [base],
  ssr: true,
});

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const content = (
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </QueryClientProvider>
  );

  // Wrap with Convex if available
  if (convexClient) {
    return (
      <WagmiProvider config={config}>
        <ConvexProvider client={convexClient}>
          {content}
        </ConvexProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={config}>
      {content}
    </WagmiProvider>
  );
}
