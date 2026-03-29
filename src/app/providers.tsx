'use client';

import { ReactNode, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { ConvexProvider } from 'convex/react';
import { publicEnv } from '@/lib/env';
import { getConvexReactClient } from '@/lib/convex/react-client';

const wagmiConfig = getDefaultConfig({
  appName: 'Cerberus',
  projectId: publicEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [baseSepolia],
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 15_000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={getConvexReactClient()}>
          <RainbowKitProvider>{children}</RainbowKitProvider>
        </ConvexProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
