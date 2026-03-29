import { ConvexReactClient } from "convex/react";
import { publicEnv } from "@/lib/env";

let reactClient: ConvexReactClient | null = null;

export function getConvexReactClient() {
  if (!reactClient) {
    reactClient = new ConvexReactClient(publicEnv.NEXT_PUBLIC_CONVEX_URL);
  }

  return reactClient;
}
