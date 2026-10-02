import type { AuthUser, Profile } from "@/domain/entities";
import type { ProfileRepository } from "@/domain/ports";
import type { MemoryStore } from "./store";

export class MemoryProfileRepository implements ProfileRepository {
  constructor(private readonly store: MemoryStore) {}

  async upsertFromAuthUser(user: AuthUser): Promise<Profile> {
    const profile: Profile = { id: user.id, email: user.email, fullName: user.name, avatarUrl: user.avatarUrl };
    this.store.profiles.set(user.id, profile);
    return profile;
  }

  async getById(id: string): Promise<Profile | null> {
    return this.store.profiles.get(id) ?? null;
  }
}
