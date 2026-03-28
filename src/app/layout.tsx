import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgentAuth | Human-in-the-Loop Agent Governance",
  description: "Autonomous AI agents with verified human approval via World ID, x402 payments, and XMTP messaging",
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
