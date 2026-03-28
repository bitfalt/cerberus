// lib/x402/state.ts - Redis state for ephemeral x402 payments
// Payment state types
export type PaymentStatus = 'pending' | 'verified' | 'settled' | 'failed' | 'expired';

export interface PaymentState {
  id: string;
  status: PaymentStatus;
  opportunityId: string;
  payerAddress: string;
  amount: string; // in wei
  tokenAddress: string;
  expiresAt: number; // timestamp
  createdAt: number;
  settledAt?: number;
  settlementTxHash?: string;
  failureReason?: string;
}

// Mock Redis type
interface MockRedis {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

// Redis client singleton
let redisClient: import('ioredis').Redis | MockRedis | null = null;

// Dynamic import for Redis (server-side only)
async function getRedisModule() {
  if (typeof window === 'undefined') {
    const ioredis = await import('ioredis');
    return ioredis.Redis;
  }
  return null;
}

async function getRedisClient(): Promise<import('ioredis').Redis | MockRedis> {
  if (redisClient) {
    return redisClient;
  }

  // Browser fallback - always use mock
  if (typeof window !== 'undefined') {
    redisClient = createMockRedis();
    return redisClient;
  }

  const RedisModule = await getRedisModule();
  
  if (!RedisModule) {
    console.warn('Redis not available, using in-memory fallback');
    redisClient = createMockRedis();
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('No Redis URL configured, using in-memory fallback');
    redisClient = createMockRedis();
    return redisClient;
  }
  
  const client = new RedisModule(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  
  client.on('error', (err: Error) => {
    console.error('Redis error:', err);
  });
  
  redisClient = client;
  return redisClient;
}

// Mock Redis for development without Redis
function createMockRedis(): MockRedis {
  const store = new Map<string, { value: string; expiresAt: number }>();
  
  return {
    get: async (key: string) => {
      const item = store.get(key);
      if (item && item.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return item?.value || null;
    },
    setex: async (key: string, seconds: number, value: string) => {
      store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      return 'OK';
    },
    del: async (key: string) => {
      store.delete(key);
      return 1;
    },
    keys: async (pattern: string) => {
      const keys: string[] = [];
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of store.keys()) {
        if (regex.test(key)) keys.push(key);
      }
      return keys;
    },
  };
}

// Create new payment state
export async function createPaymentState(
  state: Omit<PaymentState, 'createdAt'>
): Promise<PaymentState> {
  const redis = await getRedisClient();
  const fullState: PaymentState = {
    ...state,
    createdAt: Date.now(),
  };
  
  const ttlSeconds = Math.max(1, Math.floor((state.expiresAt - Date.now()) / 1000) + 3600); // +1 hour buffer
  
  await redis.setex(
    `payment:${state.id}`,
    ttlSeconds,
    JSON.stringify(fullState)
  );
  
  // Also index by opportunity
  await redis.setex(
    `payment:opportunity:${state.opportunityId}`,
    ttlSeconds,
    state.id
  );
  
  return fullState;
}

// Get payment state
export async function getPaymentState(id: string): Promise<PaymentState | null> {
  const redis = await getRedisClient();
  const data = await redis.get(`payment:${id}`);
  return data ? JSON.parse(data) : null;
}

// Get payment by opportunity ID
export async function getPaymentByOpportunity(opportunityId: string): Promise<PaymentState | null> {
  const redis = await getRedisClient();
  const paymentId = await redis.get(`payment:opportunity:${opportunityId}`);
  if (!paymentId) return null;
  return getPaymentState(paymentId);
}

// Update payment status
export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  updates?: Partial<PaymentState>
): Promise<PaymentState | null> {
  const existing = await getPaymentState(id);
  
  if (!existing) return null;
  
  const updated: PaymentState = {
    ...existing,
    status,
    ...updates,
  };
  
  const redis = await getRedisClient();
  
  // Calculate remaining TTL
  const ttlSeconds = Math.max(1, Math.floor((existing.expiresAt - Date.now()) / 1000) + 3600);
  
  await redis.setex(
    `payment:${id}`,
    ttlSeconds,
    JSON.stringify(updated)
  );
  
  return updated;
}

// Mark payment as settled
export async function settlePayment(
  id: string,
  txHash: string
): Promise<PaymentState | null> {
  return updatePaymentStatus(id, 'settled', {
    settlementTxHash: txHash,
    settledAt: Date.now(),
  });
}

// Mark payment as failed
export async function failPayment(
  id: string,
  reason: string
): Promise<PaymentState | null> {
  return updatePaymentStatus(id, 'failed', {
    failureReason: reason,
  });
}

// Clean up expired payments
export async function cleanupExpiredPayments(): Promise<number> {
  const redis = await getRedisClient();
  const keys = await redis.keys('payment:*');
  let cleaned = 0;
  
  for (const key of keys) {
    if (key.startsWith('payment:opportunity:')) continue;
    
    const data = await redis.get(key);
    if (data) {
      const state: PaymentState = JSON.parse(data);
      if (state.expiresAt < Date.now() && state.status === 'pending') {
        await updatePaymentStatus(state.id, 'expired');
        cleaned++;
      }
    }
  }
  
  return cleaned;
}

// Get all active payments for a wallet
export async function getActivePayments(walletAddress: string): Promise<PaymentState[]> {
  const redis = await getRedisClient();
  const keys = await redis.keys('payment:*');
  const payments: PaymentState[] = [];
  
  for (const key of keys) {
    if (key.startsWith('payment:opportunity:')) continue;
    
    const data = await redis.get(key);
    if (data) {
      const state: PaymentState = JSON.parse(data);
      if (state.payerAddress.toLowerCase() === walletAddress.toLowerCase() &&
          ['pending', 'verified'].includes(state.status)) {
        payments.push(state);
      }
    }
  }
  
  return payments.sort((a, b) => b.createdAt - a.createdAt);
}
