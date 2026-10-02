"use server";

import { redirect } from "next/navigation";
import { getServices } from "@/integrations/container";
import { getAppUrl } from "@/lib/config";
import { logger } from "@/lib/logger";
import { setPostLoginRedirect } from "@/lib/post-login-redirect";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeRedirectPath(formData.get("next"));
  let url: string;
  try {
    await setPostLoginRedirect(next);
    ({ url } = await getServices().auth.startGoogleSignIn({ redirectTo: `${getAppUrl()}/auth/callback` }));
  } catch (error) {
    logger.error("auth.start_failed", { error });
    redirect(`/sign-in?error=start_failed&next=${encodeURIComponent(next)}`);
  }
  redirect(url);
}

export async function signOutAction(): Promise<void> {
  try {
    await getServices().auth.signOut();
  } catch (error) {
    logger.error("auth.sign_out_failed", { error });
  }
  redirect("/");
}
