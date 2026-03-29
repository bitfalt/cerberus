import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { publicEnv } from "@/lib/public-env";

let httpClient: ConvexHttpClient | null = null;

export function getConvexServerClient() {
  if (!httpClient) {
    httpClient = new ConvexHttpClient(publicEnv.NEXT_PUBLIC_CONVEX_URL);
  }

  return httpClient;
}
