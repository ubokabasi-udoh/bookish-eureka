import type { AuthUser, Profile } from "../entities";

export interface ProfileRepository {
  /** Creates or refreshes the application profile for an authenticated identity. */
  upsertFromAuthUser(user: AuthUser): Promise<Profile>;
  getById(id: string): Promise<Profile | null>;
}
