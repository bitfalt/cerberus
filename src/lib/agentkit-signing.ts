import { Buffer } from "node:buffer";
import { formatSIWEMessage } from "@worldcoin/agentkit";

type AgentkitChallenge = {
  info: {
    domain: string;
    uri: string;
    version: string;
    nonce: string;
    issuedAt: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
    statement?: string;
  };
  supportedChains: Array<{ chainId: string; type: string }>;
};

export function encodeAgentkitHeader(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function buildSignedAgentkitHeader(input: {
  challenge: AgentkitChallenge;
  address: string;
  signature: string;
}) {
  const supportedChain = input.challenge.supportedChains.find(
    (chain) => chain.chainId === "eip155:8453" && chain.type === "eip191"
  );

  if (!supportedChain) {
    throw new Error("AgentKit challenge did not include an EIP-191 Base Mainnet signing option.");
  }

  return encodeAgentkitHeader({
    ...input.challenge.info,
    address: input.address.toLowerCase(),
    chainId: supportedChain.chainId,
    type: supportedChain.type,
    signatureScheme: "eip191",
    signature: input.signature,
  });
}

export function buildAgentkitSignMessage(input: {
  challenge: { info: AgentkitChallenge["info"] };
  address: string;
}) {
  return formatSIWEMessage(
    {
      ...input.challenge.info,
      chainId: "eip155:8453",
      type: "eip191",
      signatureScheme: "eip191",
    },
    input.address.toLowerCase()
  );
}
