import { NextResponse } from "next/server";
import { maxUint256 } from "viem";
import { z } from "zod";
import { cerberusVaultAbi } from "@/lib/contracts";
import { publicEnv } from "@/lib/env";
import { getCerberusWalletClient, getBaseSepoliaPublicClient } from "@/lib/server/wallet";

const bodySchema = z.object({
  owner: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ vault: string }> }) {
  try {
    const { vault } = await context.params;
    const body = bodySchema.parse(await request.json());
    const walletClient = getCerberusWalletClient();
    const publicClient = getBaseSepoliaPublicClient();

    const hash1 = await walletClient.writeContract({
      address: vault as `0x${string}`,
      abi: cerberusVaultAbi,
      functionName: 'setAllowedToken',
      args: ['0x0000000000000000000000000000000000000000', true],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash1 });

    const hash2 = await walletClient.writeContract({
      address: vault as `0x${string}`,
      abi: cerberusVaultAbi,
      functionName: 'setAllowedToken',
      args: [publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC as `0x${string}`, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash2 });

    const hash3 = await walletClient.writeContract({
      address: vault as `0x${string}`,
      abi: cerberusVaultAbi,
      functionName: 'setAllowedAdapter',
      args: [publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER as `0x${string}`, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash3 });

    const hash4 = await walletClient.writeContract({
      address: vault as `0x${string}`,
      abi: cerberusVaultAbi,
      functionName: 'setAllowedRecipient',
      args: [body.owner.toLowerCase() as `0x${string}`, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash4 });

    const hash5 = await walletClient.writeContract({
      address: vault as `0x${string}`,
      abi: cerberusVaultAbi,
      functionName: 'setTokenApproval',
      args: [
        publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC as `0x${string}`,
        publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER as `0x${string}`,
        maxUint256,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash5 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to bootstrap vault' }, { status: 400 });
  }
}
