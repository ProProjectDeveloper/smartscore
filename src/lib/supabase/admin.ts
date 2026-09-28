import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * Service-role client. It bypasses Row Level Security, so it must never be
 * imported from a Client Component.
 *
 * It exists for exactly one job: the public assessment flow. Respondents are
 * not signed in, and the answer key (`options.is_correct`) must not reach the
 * browser, so the server reads the questions, strips the key, and scores the
 * submission itself.
 */
export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
