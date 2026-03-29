import "server-only";

import { getRedis } from "./redis";

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  if (count > limit) {
    throw new Error("Rate limit exceeded");
  }
}
