import "server-only";
import { cache } from "react";
import type { Services } from "@/application/services";
import { MemoryAuthService, SupabaseGoogleAuthService } from "./auth";
import { getDriver } from "./config";
import {
  createPublicClient,
  createServiceClient,
  getSharedMemoryStore,
  MemoryOrderRepository,
  MemoryProductRepository,
  MemoryProfileRepository,
  SupabaseOrderRepository,
  SupabaseProductRepository,
  SupabaseProfileRepository,
} from "./database";
import { getSharedMockEmailService, MailgunEmailService } from "./email";

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
      orders: new MemoryOrderRepository(store),
      auth: new MemoryAuthService(),
      email: getSharedMockEmailService(),
    };
  }
  const serviceClient = createServiceClient();
  return {
    products: new SupabaseProductRepository(createPublicClient()),
    profiles: new SupabaseProfileRepository(serviceClient),
    orders: new SupabaseOrderRepository(serviceClient),
    auth: new SupabaseGoogleAuthService(),
    email: new MailgunEmailService(),
  };
}

/** Memoized per request. */
export const getServices = cache(build);
