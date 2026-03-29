import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { ensureRedisReady } from "@/lib/server/redis";
import { getWorkerHeartbeat } from "@/lib/server/workflow";

export async function GET() {
  try {
    await ensureRedisReady();
    const heartbeat = await getWorkerHeartbeat();
    const now = Date.now();
    const workerAgeMs = heartbeat ? now - heartbeat.timestamp : null;

    return NextResponse.json({
      ok: true,
      redis: {
        ok: true,
      },
      worker: {
        seen: Boolean(heartbeat),
        stale: heartbeat ? workerAgeMs! > 120_000 : true,
        ageMs: workerAgeMs,
        heartbeat,
      },
      xmtp: {
        env: publicEnv.NEXT_PUBLIC_XMTP_ENV,
        agentAddressConfigured: Boolean(publicEnv.NEXT_PUBLIC_XMTP_AGENT_ADDRESS),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 }
    );
  }
}
