import "server-only";
import { cache } from "react";
import type { Services } from "@/application/services";
import { MemoryAuthService, SupabaseGoogleAuthService } from "./auth";
import { getDriver } from "./config";
import {
  createPublicClient,
  createServiceClient,
  getSharedMemoryStore,
  MemoryProductRepository,
  MemoryProfileRepository,
  SupabaseProductRepository,
  SupabaseProfileRepository,
} from "./database";

/**
 * COMPOSITION ROOT — the only place that decides which adapter implements each port.
 * To replace a vendor: write a new adapter for the port and switch it here.
 */
function build(): Services {
  if (getDriver() === "memory") {
    const store = getSharedMemoryStore();
    return {
      products: new MemoryProductRepository(store),
      profiles: new MemoryProfileRepository(store),
      auth: new MemoryAuthService(),
    };
  }
  return {
    products: new SupabaseProductRepository(createPublicClient()),
    profiles: new SupabaseProfileRepository(createServiceClient()),
    auth: new SupabaseGoogleAuthService(),
  };
}

/** Memoized per request. */
export const getServices = cache(build);
