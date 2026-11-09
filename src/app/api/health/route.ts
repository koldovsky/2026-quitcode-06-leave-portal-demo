// D0: публічна перевірка здоров'я проду — GET /api/health → { ok, sha, env, appEnv, db, reason }.
// appEnv (WS11) — мітка з APP_ENV: "staging" на гілці staging, null там, де змінної немає.
// Без секретів і без даних користувачів: коміт збірки (Vercel) і чи відповідає база (один дешевий запит публічним
// ключем). Шлях — у PUBLIC_PATHS (src/lib/supabase/proxy.ts), інакше proxy віддав би 307 на /login.
// WS11 (дія з postmortem): спершу — чи є змінні Supabase і чи правильний їхній формат. Ні — 503 і reason
// "env-missing:<НАЗВА>" чи "env-invalid:<НАЗВА>", без запиту до бази. Лише назви, значень у відповіді немає.
// Читають: scripts/smoke.mjs, .github/workflows/smoke.yml і перевірка розгортань курсу.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRequiredEnv, envReason } from "@/lib/env-check";
import { buildInfo, classifyDbProbe, type DbHealth } from "@/lib/health";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

/** Один дешевий запит до бази публічним ключем. Викликаємо лише з перевіреними змінними. */
async function probeDb(url: string, key: string): Promise<DbHealth> {
  try {
    // Звичайний supabase-js, не @/lib/supabase/server: перевірка не читає cookie відвідувача.
    const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // GET, не HEAD: потрібне тіло помилки, щоб відрізнити «anon без прав» (база відповіла) від «хибний ключ».
    const { error, status } = await supabase.from("profiles").select("id").limit(1);
    return classifyDbProbe({ status, error });
  } catch {
    return { db: "down", reason: "exception" };
  }
}

export async function GET() {
  const build = buildInfo(process.env);
  // Явні process.env.NEXT_PUBLIC_*: Next.js вбудовує їх під час збірки — перевіряємо саме те, з чим зібрано деплой.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const configProblem = envReason(checkRequiredEnv({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }));
  const health: DbHealth = configProblem ? { db: "down", reason: configProblem } : await probeDb(url!, key!);
  return NextResponse.json(
    { ok: health.db === "ok", ...build, ...health },
    { status: health.db === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
