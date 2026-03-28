// lib/convex/client.ts - Convex client configuration
import { ConvexReactClient } from 'convex/react';

// Get the Convex URL from environment
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Create singleton client
let convexClient: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (!convexClient) {
    if (!convexUrl) {
      // Return mock client for development without Convex
      console.warn('NEXT_PUBLIC_CONVEX_URL not set, using mock client');
      return createMockConvexClient();
    }
    
    convexClient = new ConvexReactClient(convexUrl);
  }
  
  return convexClient;
}

// Mock client for development
function createMockConvexClient(): ConvexReactClient {
  // This is a simplified mock - in production you'd want full mock functionality
  const mockClient = {
    query: () => ({
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    }),
    mutation: () => Promise.resolve({}),
    action: () => Promise.resolve({}),
    close: () => {},
  } as unknown as ConvexReactClient;
  
  return mockClient;
}

// Hook-compatible client getter
export function useConvexClient(): ConvexReactClient {
  return getConvexClient();
}
