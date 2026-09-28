import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

/**
 * Supabase client bound to the request's cookies, so Row Level Security sees
 * the signed-in user. Use this everywhere except the public take flow.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The refreshed session is
            // written by the proxy/middleware on the next navigation instead,
            // so swallowing this is the documented Supabase pattern.
          }
        },
      },
    },
  );
}
