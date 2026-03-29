import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Handle external packages that don't work with Next.js bundling
  serverExternalPackages: [
    'ioredis', 
    '@coinbase/agentkit', 
    '@coinbase/agentkit-langchain',
    '@xmtp/user-preferences-bindings-wasm',
    '@xmtp/node-sdk',
    '@worldcoin/idkit-server'
  ],
  // Turbopack config to handle XMTP
  turbopack: {
    root: process.cwd(),
    // Externalize XMTP on server side
    resolveAlias: {
      '@xmtp/xmtp-js': 'commonjs @xmtp/xmtp-js',
    },
  },
  // Note: API routes require server-side rendering
  // For Vercel deployment, connect GitHub repo to Vercel
};

export default nextConfig;
