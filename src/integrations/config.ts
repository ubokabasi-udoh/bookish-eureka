import { z } from "zod";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const driverSchema = z.enum(["live", "memory"]);
export type IntegrationsDriver = z.infer<typeof driverSchema>;

export function getDriver(env: NodeJS.ProcessEnv = process.env): IntegrationsDriver {
  const parsed = driverSchema.safeParse(env.INTEGRATIONS_DRIVER?.trim() || "live");
  if (!parsed.success) throw new ConfigError('INTEGRATIONS_DRIVER must be "live" or "memory".');
  if (parsed.data === "memory" && env.NODE_ENV === "production" && env.ALLOW_MEMORY_DRIVER !== "true") {
    throw new ConfigError(
      'INTEGRATIONS_DRIVER="memory" uses fake auth and non-persistent data. It is blocked in production unless ALLOW_MEMORY_DRIVER=true.',
    );
  }
  return parsed.data;
}

function requireVars<K extends string>(env: NodeJS.ProcessEnv, names: readonly K[], what: string): Record<K, string> {
  const missing = names.filter((n) => !env[n]?.trim());
  if (missing.length > 0) {
    throw new ConfigError(`Missing environment variables for ${what}: ${missing.join(", ")}. See .env.example and the README.`);
  }
  return Object.fromEntries(names.map((n) => [n, env[n]!.trim()])) as Record<K, string>;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
export function getSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig {
  const v = requireVars(env, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], "Supabase");
  return { url: v.NEXT_PUBLIC_SUPABASE_URL, anonKey: v.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

export function getSupabaseServiceRoleKey(env: NodeJS.ProcessEnv = process.env): string {
  return requireVars(env, ["SUPABASE_SERVICE_ROLE_KEY"], "Supabase (server)").SUPABASE_SERVICE_ROLE_KEY;
}
