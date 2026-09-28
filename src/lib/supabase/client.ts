import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

/** Supabase client for use inside Client Components. */
export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
