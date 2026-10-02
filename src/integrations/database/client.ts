import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getSupabaseServiceRoleKey } from "../config";

const stateless = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

/** Anonymous, cookie-less client: reads only what RLS exposes to the public (active products). */
export function createPublicClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, stateless);
}

/**
 * Service-role client. BYPASSES RLS. Server-only, and used only for operations that run after the
 * application layer has verified the user (profile sync, order creation, email status).
 */
export function createServiceClient(): SupabaseClient {
  const { url } = getSupabaseConfig();
  return createClient(url, getSupabaseServiceRoleKey(), stateless);
}
