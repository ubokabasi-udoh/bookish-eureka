import { NextResponse, type NextRequest } from "next/server";
import { completeSignIn } from "@/application/auth/complete-sign-in";
import { getServices } from "@/integrations/container";
import { logger } from "@/lib/logger";
import { consumePostLoginRedirect } from "@/lib/post-login-redirect";

function failure(request: NextRequest, reason: string, next: string) {
  const url = new URL("/sign-in", request.nextUrl.origin);
  url.searchParams.set("error", reason);
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const next = await consumePostLoginRedirect();
  const params = request.nextUrl.searchParams;

  const providerError = params.get("error");
  if (providerError) {
    // e.g. the shopper pressed "Cancel" on Google's consent screen (error=access_denied).
    logger.warn("auth.callback_provider_error", { providerError, description: params.get("error_description") });
    return failure(request, providerError === "access_denied" ? "denied" : "failed", next);
  }

  const code = params.get("code");
  if (!code) {
    logger.warn("auth.callback_missing_code");
    return failure(request, "missing_code", next);
  }

  try {
    await completeSignIn(getServices(), code);
  } catch (error) {
    logger.error("auth.callback_failed", { error });
    return failure(request, "failed", next);
  }
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
