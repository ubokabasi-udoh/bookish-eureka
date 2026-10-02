import type { AuthUser } from "@/domain/entities";
import { AuthRequiredError } from "@/domain/errors";
import type { Services } from "../services";

/** Finishes OAuth and makes sure the application has a profile for the identity. */
export async function completeSignIn(services: Pick<Services, "auth" | "profiles">, code: string): Promise<AuthUser> {
  const user = await services.auth.completeSignIn(code);
  await services.profiles.upsertFromAuthUser(user);
  return user;
}

/** For server actions: returns the verified user or throws AuthRequiredError. */
export async function requireUser(services: Pick<Services, "auth">): Promise<AuthUser> {
  const user = await services.auth.getCurrentUser();
  if (!user) throw new AuthRequiredError();
  return user;
}
