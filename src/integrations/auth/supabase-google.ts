import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { AuthUser } from "@/domain/entities";
import { AuthProviderError } from "@/domain/errors";
import type { AuthService } from "@/domain/ports";
import { logger } from "@/lib/logger";
import { getSupabaseConfig } from "../config";

function metaString(meta: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = meta?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function mapSupabaseUser(user: User): AuthUser | null {
  if (!user.email) return null;
  return {
    id: user.id,
    email: user.email,
    name: metaString(user.user_metadata, "full_name", "name"),
    avatarUrl: metaString(user.user_metadata, "avatar_url", "picture"),
  };
}

/** Google sign-in via Supabase Auth. The Google Client ID/Secret live in the Supabase dashboard. */
export class SupabaseGoogleAuthService implements AuthService {
  private async client(): Promise<SupabaseClient> {
    const { url, anonKey } = getSupabaseConfig();
    const store = await cookies();
    return createServerClient(url, anonKey, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only. proxy.ts refreshes the session instead.
          }
        },
      },
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await this.client();
    // getUser() re-validates the token with the Auth server; never trust the cookie alone.
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (error.name !== "AuthSessionMissingError") logger.warn("auth.get_user_failed", { error });
      return null;
    }
    return data.user ? mapSupabaseUser(data.user) : null;
  }

  async startGoogleSignIn({ redirectTo }: { redirectTo: string }): Promise<{ url: string }> {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
    });
    if (error || !data.url) throw new AuthProviderError("Could not start Google sign-in.", error ?? undefined);
    return { url: data.url };
  }

  async completeSignIn(code: string): Promise<AuthUser> {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw new AuthProviderError("Could not complete Google sign-in.", error ?? undefined);
    const user = mapSupabaseUser(data.user);
    if (!user) throw new AuthProviderError("Google account did not provide an email address.");
    return user;
  }

  async signOut(): Promise<void> {
    const supabase = await this.client();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthProviderError("Could not sign out.", error);
  }
}
