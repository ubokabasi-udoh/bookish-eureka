import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthUser } from "@/domain/entities";
import { AuthProviderError } from "@/domain/errors";
import type { AuthService } from "@/domain/ports";

const COOKIE = "shop_memory_session";
const CODE_PREFIX = "memory:";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Deterministic RFC-4122-shaped id so the same email always maps to the same user. */
export function memoryUserId(email: string): string {
  const h = createHash("sha256").update(email.toLowerCase()).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function memoryUserFromEmail(email: string): AuthUser {
  const local = email.split("@")[0] ?? "Shopper";
  const name = local.split(/[._-]/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
  return { id: memoryUserId(email), email: email.toLowerCase(), name: name || "Shopper", avatarUrl: null };
}

/**
 * Fake Google sign-in for automated tests and credential-free demos ONLY (INTEGRATIONS_DRIVER=memory).
 * Code format: "memory:<email>" signs that user in; "memory:fail" simulates a provider failure.
 */
export class MemoryAuthService implements AuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    const email = (await cookies()).get(COOKIE)?.value;
    return email && EMAIL.test(email) ? memoryUserFromEmail(email) : null;
  }

  async startGoogleSignIn({ redirectTo }: { redirectTo: string }): Promise<{ url: string }> {
    const url = new URL(redirectTo);
    url.searchParams.set("code", `${CODE_PREFIX}shopper@example.com`);
    return { url: url.toString() };
  }

  async completeSignIn(code: string): Promise<AuthUser> {
    const email = code.startsWith(CODE_PREFIX) ? code.slice(CODE_PREFIX.length) : "";
    if (!EMAIL.test(email)) throw new AuthProviderError("Simulated Google sign-in failure.");
    (await cookies()).set(COOKIE, email.toLowerCase(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return memoryUserFromEmail(email);
  }

  async signOut(): Promise<void> {
    (await cookies()).delete(COOKIE);
  }
}
