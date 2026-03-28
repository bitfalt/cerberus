import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cerberus | Human-in-the-Loop Agent Governance",
  description: "The 3-Headed Guardian for AI Agent Governance. Autonomous agents propose actions, but funds only move via x402 after World ID-verified human approval via XMTP messaging.",
  keywords: ["World ID", "x402", "XMTP", "AI Agent", "Governance", "Base", "Ethereum"],
  openGraph: {
    title: "Cerberus — 3-Headed Guardian for AI Agents",
    description: "Human-in-the-Loop Agent Governance with World ID, x402, and XMTP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-950 text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
