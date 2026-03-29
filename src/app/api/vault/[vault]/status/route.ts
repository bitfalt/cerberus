import { NextResponse } from "next/server";
import { erc20Abi, formatEther, formatUnits } from 'viem';
import { cerberusVaultAbi } from '@/lib/contracts';
import { publicEnv } from '@/lib/public-env';
import { getBaseSepoliaPublicClient } from '@/lib/server/wallet';

export async function GET(_request: Request, context: { params: Promise<{ vault: string }> }) {
  try {
    const { vault } = await context.params;
    const client = getBaseSepoliaPublicClient();

    const [ethBalance, usdcBalance, owner, recoveryAddress, paused] = await Promise.all([
      client.getBalance({ address: vault as `0x${string}` }),
      client.readContract({
        address: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vault as `0x${string}`],
      }),
      client.readContract({
        address: vault as `0x${string}`,
        abi: cerberusVaultAbi,
        functionName: 'owner',
      }),
      client.readContract({
        address: vault as `0x${string}`,
        abi: cerberusVaultAbi,
        functionName: 'recoveryAddress',
      }),
      client.readContract({
        address: vault as `0x${string}`,
        abi: cerberusVaultAbi,
        functionName: 'paused',
      }),
    ]);

    return NextResponse.json({
      vault,
      owner,
      recoveryAddress,
      paused,
      balances: {
        eth: formatEther(ethBalance),
        usdc: formatUnits(usdcBalance as bigint, 6),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load vault status' }, { status: 400 });
  }
}
