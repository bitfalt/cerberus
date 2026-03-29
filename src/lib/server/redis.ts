import Redis from "ioredis";
let client: Redis | null = null;

function getRedisUrl() {
  const url = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error("Redis is required in production mode. Set REDIS_URL or UPSTASH_REDIS_URL.");
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    throw new Error(
      "Redis URL is misconfigured. Use the Upstash TCP Redis URL (redis:// or rediss://), not the Upstash REST URL (https://)."
    );
  }

  return url;
}

export function getRedis(): Redis {
  if (client) {
    return client;
  }

  const url = getRedisUrl();

  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("error", (error) => {
    console.error("[Cerberus][Redis]", error);
  });

  return client;
}

export async function ensureRedisReady() {
  const redis = getRedis();
  await redis.ping();
  return redis;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await getRedis().set(key, payload, "EX", ttlSeconds);
    return;
  }
  await getRedis().set(key, payload);
}

export async function setIfNotExists(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const payload = JSON.stringify(value);
  const result = await getRedis().set(key, payload, "EX", ttlSeconds, "NX");
  return result === "OK";
}

export async function deleteKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await getRedis().del(...keys);
}
