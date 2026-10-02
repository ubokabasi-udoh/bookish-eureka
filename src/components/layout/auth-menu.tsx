import { signOutAction } from "@/app/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import type { AuthUser } from "@/domain/entities";

export function AuthMenu({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <ButtonLink href="/sign-in" variant="secondary" size="sm">
        Sign in
      </ButtonLink>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-sm text-muted sm:inline" title={user.email}>
        {user.name ?? user.email}
      </span>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm" aria-label={`Sign out ${user.name ?? user.email}`}>
          Sign out
        </Button>
      </form>
    </div>
  );
}
