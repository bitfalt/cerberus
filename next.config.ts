import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // XMTP V3 uses WebAssembly, requires special handling in Next.js 15+
  serverExternalPackages: ["@xmtp/user-preferences-bindings-wasm"],
  // Note: API routes require server-side rendering
  // For Vercel deployment, connect GitHub repo to Vercel
};

export default nextConfig;
