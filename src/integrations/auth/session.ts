import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getDriver, getSupabaseConfig } from "../config";

/**
 * Keeps the Supabase session fresh: access tokens expire, and Server Components cannot write cookies,
 * so the proxy refreshes them on each navigation. No-op for the memory driver or when unconfigured.
 */
export async function refreshAuthSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  try {
    if (getDriver() !== "live") return response;
    const { url, anonKey } = getSupabaseConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  } catch (error) {
    logger.warn("auth.session_refresh_failed", { error });
  }
  return response;
}
