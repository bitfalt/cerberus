import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Note: API routes require server-side rendering
  // For Vercel deployment, connect GitHub repo to Vercel
};

export default nextConfig;
