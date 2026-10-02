import { createClient } from "@supabase/supabase-js";
import { SupabaseProductRepository } from "@/integrations/database/repositories/product.supabase";
import { describeProductRepositoryContract } from "./contracts/product-repository.contract";

// Runs only when a real, seeded Supabase project is configured, e.g.:
//   RUN_SUPABASE_TESTS=true NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm test
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const enabled = process.env.RUN_SUPABASE_TESTS === "true" && Boolean(url && key);

describeProductRepositoryContract(
  "supabase (live)",
  () => new SupabaseProductRepository(createClient(url ?? "http://localhost", key ?? "x", { auth: { persistSession: false } })),
  { skip: !enabled },
);
