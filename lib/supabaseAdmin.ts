import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sharedFakeClient } from "./testing/fakeSupabase";

/**
 * Essais locaux et tests : EQUINOXE_FAKE_DB=1 remplace la base par une base factice en mémoire (lib/testing). Refusé en
 * production quoi qu'il arrive : un réglage oublié ne peut jamais couper le site de sa vraie base.
 */
function fakeDatabaseRequested(): boolean {
  return process.env.EQUINOXE_FAKE_DB === "1" && process.env.NODE_ENV !== "production";
}

// Server-only client using the service_role key (bypasses RLS).
// Never import this file from client components.
export function getSupabaseAdmin(): SupabaseClient {
  if (fakeDatabaseRequested()) return sharedFakeClient() as unknown as SupabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
