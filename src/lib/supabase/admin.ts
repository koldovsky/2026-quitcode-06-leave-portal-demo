import "server-only";
// Admin-клієнт Supabase із секретним ключем: обходить RLS. Лише сервер, лише цей файл читає SUPABASE_SECRET_KEY
// (правило scripts/check-server-boundary.mjs, ADR 0003). Імпортують лише actions.ts / route.ts — і лише ПІСЛЯ
// перевірки ролі admin. У зрізі WS7 потрібен лише для auth.admin.generateLink (посилання для активації).
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    // Без значень: лише назва змінної, якої бракує.
    throw new Error("SUPABASE_SECRET_KEY не задано на сервері (Vercel Production або .env.local)");
  }
  return createSupabaseClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
