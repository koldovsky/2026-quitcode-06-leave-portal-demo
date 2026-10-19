// Користувачі й ролі (зріз add-user-invites) — правила, які виконує лише база: GRANT, RLS, функція admin_set_role.
// Справжній Postgres (PGlite) з усіма міграціями й синтетичними користувачами з supabase/demo-users.json.
// Кожен відмовний тест має ВПАСТИ, якщо прибрати правило (мутаційна перевірка — опис PR «Реалізація: ролі»).
import { beforeAll, describe, expect, it } from "vitest";
import { createLeaveDb, type LeaveDb } from "./supabase-pglite";

let t: LeaveDb;
let ADMIN: string, MANAGER_MATH: string, TEACHER: string, TEACHER2: string;

beforeAll(async () => {
  t = await createLeaveDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_MATH = t.users["manager.math@example.test"];
  TEACHER = t.users["teacher@example.test"];
  TEACHER2 = t.users["teacher2@example.test"];
}, 60_000);

const profileCount = (userId: string) =>
  t.asUser<{ n: number }>(userId, "select count(*)::int as n from public.profiles").then((r) => r[0].n);

const roleOf = async (userId: string) =>
  (await t.asService<{ role: string }>("select role from public.profiles where id = $1", [userId]))[0].role;

/** Прямий виклик RPC — як supabase.rpc("admin_set_role", …) з публічним ключем і власним входом. */
const setRole = (callerId: string, userId: string, role: string) =>
  t.asUser(callerId, "select public.admin_set_role($1, $2)", [userId, role]);

/** Після тесту повертаємо роль: база спільна для всіх тестів файлу. */
const restoreRole = (userId: string, role: string) =>
  t.asService("update public.profiles set role = $2 where id = $1", [userId, role]);

describe("База: список користувачів", () => {
  it("AC-USERS-10: без входу (лише публічний ключ) профілі не читаються взагалі", async () => {
    await expect(t.asAnon("select email, role from public.profiles")).rejects.toThrow("permission denied");
  });

  it("AC-USERS-07: працівник бачить лише власний профіль; адміністратор — усі", async () => {
    const [{ n: all }] = await t.asService<{ n: number }>("select count(*)::int as n from public.profiles");
    expect(await profileCount(TEACHER)).toBe(1);
    expect(await profileCount(ADMIN)).toBe(all);
  });

  it("AC-USERS-13: менеджер бачить лише власний профіль (і тих, чиї записи в його черзі — тут черга порожня)", async () => {
    expect(await profileCount(MANAGER_MATH)).toBe(1);
  });

  it("AC-USERS-01: адміністратор призначає основну посаду новому користувачу; працівник — ні", async () => {
    // Новий користувач Auth → тригер on_auth_user_created створює профіль з роллю employee.
    const NEW = "b0000000-0000-0000-0000-000000000001";
    await t.db.exec("begin; set local role supabase_auth_admin;");
    await t.db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      NEW,
      "new.teacher@example.test",
      { full_name: "Нова Вчителька" },
    ]);
    await t.db.exec("commit");
    const [math] = await t.asService<{ id: string }>("select id from public.divisions where code = 'MATH'");

    await expect(
      t.asUser(TEACHER, "insert into public.positions (employee_id, division_id, kind, title) values ($1, $2, 'main', 'x')", [NEW, math.id]),
    ).rejects.toThrow("row-level security");

    await t.asUser(ADMIN, "insert into public.positions (employee_id, division_id, kind, title) values ($1, $2, 'main', 'Вчитель математики')", [
      NEW,
      math.id,
    ]);
    const rows = await t.asUser<{ email: string; role: string; title: string }>(
      ADMIN,
      `select p.email, p.role, pos.title from public.profiles as p join public.positions as pos on pos.employee_id = p.id where p.id = $1`,
      [NEW],
    );
    expect(rows).toEqual([{ email: "new.teacher@example.test", role: "employee", title: "Вчитель математики" }]);
  });
});

describe("База: зміна ролі", () => {
  it("AC-USERS-03: адміністратор робить teacher2@ менеджером — роль у таблиці, діє з наступного запиту", async () => {
    try {
      await setRole(ADMIN, TEACHER2, "manager");
      expect(await roleOf(TEACHER2)).toBe("manager");
      // Наступний запит teacher2@ уже бачить нову роль: хелпер політик читає таблицю, а не JWT.
      const [{ role }] = await t.asUser<{ role: string }>(TEACHER2, "select private.current_app_role() as role");
      expect(role).toBe("manager");
    } finally {
      await restoreRole(TEACHER2, "employee");
    }
  });

  it("AC-USERS-06: єдиний адміністратор не понижує сам себе — LAST_ADMIN, роль лишається admin", async () => {
    const [{ n }] = await t.asService<{ n: number }>("select count(*)::int as n from public.profiles where role = 'admin'");
    expect(n).toBe(1);
    await expect(setRole(ADMIN, ADMIN, "employee")).rejects.toThrow("LAST_ADMIN");
    expect(await roleOf(ADMIN)).toBe("admin");
  });

  it("AC-USERS-06: коли адміністраторів двоє, одного можна понизити", async () => {
    try {
      await setRole(ADMIN, TEACHER2, "admin");
      await setRole(TEACHER2, ADMIN, "manager");
      expect(await roleOf(ADMIN)).toBe("manager");
      // Тепер teacher2@ — єдиний адміністратор: себе понизити не може.
      await expect(setRole(TEACHER2, TEACHER2, "employee")).rejects.toThrow("LAST_ADMIN");
    } finally {
      await restoreRole(ADMIN, "admin");
      await restoreRole(TEACHER2, "employee");
    }
  });

  it("AC-USERS-09: працівник не підвищує собі роль прямим UPDATE — колонкового grant на role немає", async () => {
    await expect(
      t.asUser(TEACHER, "update public.profiles set role = 'admin' where id = (select auth.uid())"),
    ).rejects.toThrow("permission denied");
    // А власне ім'я — може (grant update (full_name) + політика profiles_update_own).
    const renamed = await t.asUser(TEACHER, "update public.profiles set full_name = full_name where id = (select auth.uid()) returning id");
    expect(renamed).toHaveLength(1);
    expect(await roleOf(TEACHER)).toBe("employee");
  });

  // Відмовні тести повертають ролі у finally: якщо правило зламане й роль таки змінилась, червоним стає лише цей тест,
  // а не наступні (мутаційна перевірка показує саме ті AC, чиє правило прибрали).
  it("AC-USERS-09: працівник не підвищує собі роль і через RPC admin_set_role — FORBIDDEN", async () => {
    try {
      await expect(setRole(TEACHER, TEACHER, "admin")).rejects.toThrow("FORBIDDEN");
      expect(await roleOf(TEACHER)).toBe("employee");
    } finally {
      await restoreRole(TEACHER, "employee");
    }
  });

  it("AC-USERS-08: менеджер напряму не змінює ролі — FORBIDDEN, нічого не змінено", async () => {
    try {
      await expect(setRole(MANAGER_MATH, TEACHER, "manager")).rejects.toThrow("FORBIDDEN");
      await expect(setRole(MANAGER_MATH, MANAGER_MATH, "admin")).rejects.toThrow("FORBIDDEN");
      expect(await roleOf(TEACHER)).toBe("employee");
      expect(await roleOf(MANAGER_MATH)).toBe("manager");
    } finally {
      await restoreRole(TEACHER, "employee");
      await restoreRole(MANAGER_MATH, "manager");
    }
  });

  it("AC-USERS-16: без входу функцію не виконати взагалі (execute лише authenticated)", async () => {
    try {
      await expect(t.asAnon("select public.admin_set_role($1, 'admin')", [TEACHER])).rejects.toThrow("permission denied");
      // Приватна функція з логікою — теж ні: anon не має ні usage на схему private, ні execute.
      await expect(t.asAnon("select private.admin_set_role($1, 'admin')", [TEACHER])).rejects.toThrow("permission denied");
      expect(await roleOf(TEACHER)).toBe("employee");
    } finally {
      await restoreRole(TEACHER, "employee");
    }
  });

  it("логіка — у private (security definer), точка входу в public — security invoker; anon не виконує жодної", async () => {
    const rows = await t.asService<{ schema: string; definer: boolean; anon: boolean; authenticated: boolean }>(
      `select n.nspname as schema, p.prosecdef as definer,
              pg_catalog.has_function_privilege('anon', p.oid, 'execute') as anon,
              pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as authenticated
         from pg_catalog.pg_proc as p join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
        where p.proname = 'admin_set_role' order by n.nspname`,
    );
    expect(rows).toEqual([
      { schema: "private", definer: true, anon: false, authenticated: true },
      { schema: "public", definer: false, anon: false, authenticated: true },
    ]);
  });

  it("невідома роль — відмова навіть адміністратору", async () => {
    await expect(setRole(ADMIN, TEACHER, "superuser")).rejects.toThrow("INVALID_ROLE");
  });
});
