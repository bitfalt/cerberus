import "server-only";

import Redis from "ioredis";
import { serverEnv } from "@/lib/env";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) {
    return client;
  }

  const url = serverEnv.UPSTASH_REDIS_URL ?? serverEnv.REDIS_URL;
  if (!url) {
    throw new Error("Redis is required in production mode. Set REDIS_URL or UPSTASH_REDIS_URL.");
  }

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
