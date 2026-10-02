import { cookies } from "next/headers";
import { safeRedirectPath } from "./safe-redirect";

const COOKIE = "shop_post_login";

/** Remembers where to send the shopper after OAuth, without putting it in the callback URL (keeps the provider allow-list exact). */
export async function setPostLoginRedirect(path: string): Promise<void> {
  (await cookies()).set(COOKIE, safeRedirectPath(path), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function consumePostLoginRedirect(fallback = "/"): Promise<string> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  return safeRedirectPath(value, fallback);
}
