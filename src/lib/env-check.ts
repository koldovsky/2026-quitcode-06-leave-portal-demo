// WS11, дія, яку пропонує postmortem навчального сценарію «хибна NEXT_PUBLIC_SUPABASE_URL на staging» (сценарій
// розібрано на слайдах, docs/demo/RUNBOOK-ws11.md): /api/health сам називає змінну, якої
// бракує чи яка має хибний формат. Тоді червоний smoke одразу каже «яка змінна», а не лише «база недоступна».
// Повертаємо лише НАЗВИ змінних, ніколи значення: відповідь /api/health публічна (її бачить будь-хто без входу).
// Чиста функція без process.env — тест без мережі (tests/env-check.test.ts).
//
// Перевіряємо формат, а не «чи правильний проєкт»: адреса чужого проєкту з правильним форматом сюди не потрапить —
// її ловить сама перевірка бази (/api/health → db: down).

export type RequiredEnv = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
export type EnvCheck = { missing: RequiredEnv[]; invalid: RequiredEnv[] };

/** Локальний Supabase (`supabase start`) відповідає по http — лише на цій машині. */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Project URL Supabase — лише адреса проєкту: https://<ref>.supabase.co (або http://127.0.0.1:54321 локально).
 * Без шляху, параметрів і логіна. Типова помилка — адреса дашборда https://supabase.com/dashboard/project/<ref>:
 * формат URL правильний, але це сторінка для людей, а не API.
 */
function isProjectUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const scheme = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  const bare = url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
  return scheme && bare;
}

/** Публічний ключ: один рядок без пробілів. Секретний ключ (sb_secret_…) у публічній змінній — теж хибно. */
function isPublishableKey(value: string): boolean {
  return /^\S+$/.test(value) && !value.startsWith("sb_secret_");
}

const RULES: Record<RequiredEnv, (value: string) => boolean> = {
  NEXT_PUBLIC_SUPABASE_URL: isProjectUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: isPublishableKey,
};

/** Які обов'язкові змінні відсутні, а які мають хибний формат. Лише назви. */
export function checkRequiredEnv(env: Readonly<Partial<Record<RequiredEnv, string | undefined>>>): EnvCheck {
  const result: EnvCheck = { missing: [], invalid: [] };
  for (const [name, isValid] of Object.entries(RULES) as [RequiredEnv, (value: string) => boolean][]) {
    const value = env[name]?.trim();
    if (!value) result.missing.push(name);
    else if (!isValid(value)) result.invalid.push(name);
  }
  return result;
}

/** Поле reason для /api/health: "" — усе гаразд; інакше "env-missing:A,B" і/або "env-invalid:C" через ";". */
export function envReason({ missing, invalid }: EnvCheck): string {
  const parts: string[] = [];
  if (missing.length) parts.push(`env-missing:${missing.join(",")}`);
  if (invalid.length) parts.push(`env-invalid:${invalid.join(",")}`);
  return parts.join(";");
}
