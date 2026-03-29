import "server-only";

import {
  createPublicClient,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
  http,
  keccak256,
  parseAbiParameters,
} from "viem";
import type { Address, Hex } from "viem";
import { base } from "viem/chains";
import { baseMainnetRpcUrl } from "@/lib/env";
import { OPPORTUNITY_CHAIN, QUOTE_AMOUNT_USDC, SLIPPAGE_BPS, UNISWAP_V3_FEE_TIERS } from "@/lib/protocol/constants";

export const BASE_MAINNET_UNISWAP = {
  factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
  quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  weth: "0x4200000000000000000000000000000000000006",
} as const;

const factoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const mockExecutionAdapterAbi = [
  {
    type: "function",
    name: "executeSwap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketQuoteHash", type: "bytes32" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "result", type: "bytes32" }],
  },
] as const;

export type BaseMainnetQuote = {
  chainId: typeof OPPORTUNITY_CHAIN.id;
  network: typeof OPPORTUNITY_CHAIN.name;
  source: "uniswap-v3";
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  quotedAmountOut: string;
  minAmountOut: string;
  feeTier: number;
  quoteTimestamp: number;
  quoteHash: Hex;
  targetRouter: Address;
  summary: string;
};

function getBaseMainnetClient() {
  if (!baseMainnetRpcUrl) {
    throw new Error("BASE_MAINNET_RPC_URL is required for live Base Mainnet quote discovery.");
  }

  return createPublicClient({
    chain: base,
    transport: http(baseMainnetRpcUrl),
  });
}

function createQuoteHash(input: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  quotedAmountOut: bigint;
  feeTier: number;
  quoteTimestamp: number;
}) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("address tokenIn,address tokenOut,uint256 amountIn,uint256 quotedAmountOut,uint24 feeTier,uint256 quoteTimestamp"),
      [
        input.tokenIn,
        input.tokenOut,
        input.amountIn,
        input.quotedAmountOut,
        input.feeTier,
        BigInt(input.quoteTimestamp),
      ]
    )
  );
}

function applySlippage(amountOut: bigint) {
  const bps = BigInt(SLIPPAGE_BPS);
  const maxBps = BigInt(10_000);
  return (amountOut * (maxBps - bps)) / maxBps;
}

export async function fetchBaseMainnetUsdcWethQuote(amountIn: bigint = QUOTE_AMOUNT_USDC): Promise<BaseMainnetQuote> {
  const client = getBaseMainnetClient();
  let best:
    | {
        amountOut: bigint;
        feeTier: number;
      }
    | null = null;

  for (const feeTier of UNISWAP_V3_FEE_TIERS) {
    const pool = await client.readContract({
      address: BASE_MAINNET_UNISWAP.factory,
      abi: factoryAbi,
      functionName: "getPool",
      args: [BASE_MAINNET_UNISWAP.usdc, BASE_MAINNET_UNISWAP.weth, feeTier],
    });

    if (!pool || pool === "0x0000000000000000000000000000000000000000") {
      continue;
    }

    const callData = encodeFunctionData({
      abi: quoterV2Abi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: BASE_MAINNET_UNISWAP.usdc,
          tokenOut: BASE_MAINNET_UNISWAP.weth,
          amountIn,
          fee: feeTier,
          sqrtPriceLimitX96: BigInt(0),
        },
      ],
    });

    const response = await client.call({
      to: BASE_MAINNET_UNISWAP.quoterV2,
      data: callData,
    });

    if (!response.data) {
      continue;
    }

    const [amountOut] = decodeFunctionResult({
      abi: quoterV2Abi,
      functionName: "quoteExactInputSingle",
      data: response.data,
    }) as [bigint, bigint, number, bigint];

    if (!best || amountOut > best.amountOut) {
      best = { amountOut, feeTier };
    }
  }

  if (!best) {
    throw new Error("No live Uniswap v3 USDC/WETH pool quote was available on Base Mainnet.");
  }

  const quoteTimestamp = Date.now();
  const quoteHash = createQuoteHash({
    tokenIn: BASE_MAINNET_UNISWAP.usdc,
    tokenOut: BASE_MAINNET_UNISWAP.weth,
    amountIn,
    quotedAmountOut: best.amountOut,
    feeTier: best.feeTier,
    quoteTimestamp,
  });

  return {
    chainId: OPPORTUNITY_CHAIN.id,
    network: OPPORTUNITY_CHAIN.name,
    source: "uniswap-v3",
    tokenIn: BASE_MAINNET_UNISWAP.usdc,
    tokenOut: BASE_MAINNET_UNISWAP.weth,
    amountIn: amountIn.toString(),
    quotedAmountOut: best.amountOut.toString(),
    minAmountOut: applySlippage(best.amountOut).toString(),
    feeTier: best.feeTier,
    quoteTimestamp,
    quoteHash,
    targetRouter: BASE_MAINNET_UNISWAP.swapRouter02,
    summary: `${formatUnits(amountIn, 6)} USDC quoted to ${formatUnits(best.amountOut, 18)} WETH on Base Mainnet via Uniswap v3 ${best.feeTier / 10_000}% pool`,
  };
}

export function encodeExecutionCalldata(input: {
  marketQuoteHash: Hex;
  amountIn: string;
  minAmountOut: string;
}) {
  return encodeFunctionData({
    abi: mockExecutionAdapterAbi,
    functionName: "executeSwap",
    args: [input.marketQuoteHash, BigInt(input.amountIn), BigInt(input.minAmountOut)],
  });
}
