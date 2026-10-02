import type { AuthUser } from "../entities";

export interface AuthService {
  /** The signed-in user for the current request, or null. Must validate the session server-side. */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Begins Google sign-in; returns the URL the browser must be sent to. */
  startGoogleSignIn(options: { redirectTo: string }): Promise<{ url: string }>;
  /** Completes the OAuth callback using the one-time code and establishes the session. */
  completeSignIn(code: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}
