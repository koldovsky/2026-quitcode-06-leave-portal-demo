// D0: чи відповіла база на запит /api/health. Чиста функція — щоб перевірити всі гілки тестом без мережі.
// Запит — публічним ключем до таблиці без доступу для anon: «немає прав» (42501) теж означає, що Postgres живий.

/** Код SQLSTATE Postgres, напр. 42501 «permission denied»: запит дійшов до бази. */
const SQLSTATE = /^[0-9A-Z]{5}$/;
/** PostgREST не може під'єднатися до бази. */
const PGRST_DB_DOWN = /^PGRST00[0-3]$/;
/** Supabase відповідає 540, коли безкоштовний проєкт призупинено (Dashboard → Resume project). */
const SUPABASE_PAUSED = 540;

export type DbProbe = { status: number; error: { code?: string; message?: string } | null };
export type DbHealth = { db: "ok" | "down"; reason: string };

/** WS11: APP_ENV — змінна Vercel лише для гілки staging. Коротка мітка або null; довільний текст у відповідь не йде. */
const APP_ENV = /^[a-z][a-z0-9-]{0,19}$/;

export function appEnvLabel(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  return APP_ENV.test(value) ? value : null;
}

/**
 * Що за збірка відповідає: коміт (Vercel), середовище Vercel і мітка APP_ENV. Чиста функція — тест без мережі.
 * VERCEL_GIT_COMMIT_SHA є, коли у Vercel увімкнено «Automatically expose System Environment Variables» (типово так).
 * На staging VERCEL_ENV теж "preview" — розрізняє змінна лише для гілки staging (APP_ENV=staging).
 */
export function buildInfo(env: Readonly<Record<string, string | undefined>>) {
  return {
    sha: env.VERCEL_GIT_COMMIT_SHA ?? "local",
    env: env.VERCEL_ENV ?? "local",
    appEnv: appEnvLabel(env.APP_ENV),
  };
}

export function classifyDbProbe({ status, error }: DbProbe): DbHealth {
  if (status === SUPABASE_PAUSED) return { db: "down", reason: "paused" };
  const code = error?.code ?? "";
  if (!error || SQLSTATE.test(code) || (code.startsWith("PGRST") && !PGRST_DB_DOWN.test(code))) {
    return { db: "ok", reason: "" };
  }
  if (/api key/i.test(error.message ?? "")) return { db: "down", reason: "invalid-api-key" };
  // 0 — мережа (Supabase недоступний або хибний URL), 5xx, PGRST000–003.
  return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
}
