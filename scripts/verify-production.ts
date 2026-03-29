import { publicEnv, serverEnv } from "../src/lib/env";

async function main() {
  const missing = [
    !publicEnv.NEXT_PUBLIC_WORLDCOIN_APP_ID && "NEXT_PUBLIC_WORLDCOIN_APP_ID",
    !publicEnv.NEXT_PUBLIC_CONVEX_URL && "NEXT_PUBLIC_CONVEX_URL",
    !serverEnv.WORLDID_API_KEY && "WORLDID_API_KEY",
    !serverEnv.WORLD_ID_RP_ID && "WORLD_ID_RP_ID",
    !serverEnv.WORLD_ID_RP_SIGNING_KEY && "WORLD_ID_RP_SIGNING_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  console.log("Cerberus production verification bootstrap succeeded.");
  console.log(`World App ID: ${publicEnv.NEXT_PUBLIC_WORLDCOIN_APP_ID}`);
  console.log(`Convex URL: ${publicEnv.NEXT_PUBLIC_CONVEX_URL}`);
  console.log(`World RP ID: ${serverEnv.WORLD_ID_RP_ID}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
