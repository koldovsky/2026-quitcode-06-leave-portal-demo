// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

/** Працівник з основною посадою в підрозділі divisionCode — для AC, де працівник подає заявку. */
export async function createEmployee(email: string, password: string, divisionCode = "MATH") {
  if (!UAT_EMAIL.test(email)) throw new Error(`Лише синтетичні адреси uat-…@example.test: ${email}`);
  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "UAT Працівник" },
  });
  if (error) throw error;
  const id = data.user.id;
  // Профіль створює тригер on_auth_user_created; роль ставимо явно (колонку role змінює лише service_role).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id, email, full_name: "UAT Працівник", role: "employee" }, { onConflict: "id" });
  if (profileError) throw profileError;
  const { data: division, error: divisionError } = await supabase
    .from("divisions")
    .select("id")
    .eq("code", divisionCode)
    .single();
  if (divisionError) throw divisionError;
  const { error: positionError } = await supabase
    .from("positions")
    .insert({ employee_id: id, kind: "main", division_id: division.id, title: "Учитель (UAT)" });
  if (positionError) throw positionError;
  return id;
}

/** Чи є в календарі заблокований день (лише читання). */
export async function isBlockedDay(day: string): Promise<boolean> {
  const { data, error } = await adminClient().from("blocked_days").select("day").eq("day", day);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Заявки працівника з їхніми записами — щоб перевірити те, чого не видно на екрані (статус у базі). */
export async function leaveRequestsOf(employeeId: string) {
  const { data, error } = await adminClient()
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, leave_records(status)")
    .eq("employee_id", employeeId);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    leave_records: { status: string }[];
  }[];
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодної заявки видалених (заявки → записи каскадом; користувач → профіль → посади).
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [];
  for (const u of targets) {
    // Спершу заявки (каскадом — записи): інакше каскад profiles → positions упирається в leave_records.position_id
    // (FK без cascade), і Auth відповідає «Database error deleting user».
    const { error: requestsError } = await supabase.from("leave_requests").delete().eq("employee_id", u.id);
    if (requestsError) throw requestsError;
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = (await listUatUsers(supabase))
    .filter((u) => !onlyEmail || u.email === onlyEmail)
    .map((u) => u.email);
  let leftoverRequests = 0;
  if (targets.length) {
    const { count, error } = await supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in(
        "employee_id",
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests = count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}
