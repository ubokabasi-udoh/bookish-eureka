import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser, Profile } from "@/domain/entities";
import { RepositoryError } from "@/domain/errors";
import type { ProfileRepository } from "@/domain/ports";
import { mapProfileRow, profileRowSchema } from "../mappers";

const COLUMNS = "id, email, full_name, avatar_url";

/** Uses the service-role client; callers must pass an identity already verified by AuthService. */
export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async upsertFromAuthUser(user: AuthUser): Promise<Profile> {
    const { data, error } = await this.serviceClient
      .from("profiles")
      .upsert({ id: user.id, email: user.email, full_name: user.name, avatar_url: user.avatarUrl }, { onConflict: "id" })
      .select(COLUMNS)
      .single();
    if (error) throw new RepositoryError("Could not save the user profile.", new Error(error.message));
    const parsed = profileRowSchema.safeParse(data);
    if (!parsed.success) throw new RepositoryError("Unexpected profile data shape.", parsed.error);
    return mapProfileRow(parsed.data);
  }

  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await this.serviceClient.from("profiles").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new RepositoryError("Could not load the user profile.", new Error(error.message));
    if (!data) return null;
    const parsed = profileRowSchema.safeParse(data);
    if (!parsed.success) throw new RepositoryError("Unexpected profile data shape.", parsed.error);
    return mapProfileRow(parsed.data);
  }
}
