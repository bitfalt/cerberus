import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  basePath: '/agentkit-hackathon-agentauth',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
