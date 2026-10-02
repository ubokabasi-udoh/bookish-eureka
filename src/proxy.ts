import type { NextRequest } from "next/server";
import { refreshAuthSession } from "@/integrations/proxy";

export function proxy(request: NextRequest) {
  return refreshAuthSession(request);
}

export const config = {
  // Skip static assets and image optimization; run for pages, route handlers and actions.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|products/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
