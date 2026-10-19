// Користувачі й ролі (зріз add-user-invites) — правила, які виконує лише база: GRANT, RLS, функції.
// Справжній Postgres (PGlite) з усіма міграціями й синтетичними користувачами з supabase/demo-users.json.
import { beforeAll, describe, expect, it } from "vitest";
import { createLeaveDb, type LeaveDb } from "./supabase-pglite";

let t: LeaveDb;
let ADMIN: string, MANAGER_MATH: string, TEACHER: string;

beforeAll(async () => {
  t = await createLeaveDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_MATH = t.users["manager.math@example.test"];
  TEACHER = t.users["teacher@example.test"];
}, 60_000);

const profileCount = (userId: string) =>
  t.asUser<{ n: number }>(userId, "select count(*)::int as n from public.profiles").then((r) => r[0].n);

describe("База: список користувачів", () => {
  it("AC-USERS-10: без входу (лише публічний ключ) профілі не читаються взагалі", async () => {
    await expect(t.asAnon("select email, role from public.profiles")).rejects.toThrow("permission denied");
  });

  it("AC-USERS-07: працівник бачить лише власний профіль; адміністратор — усі", async () => {
    const [{ n: all }] = await t.asService<{ n: number }>("select count(*)::int as n from public.profiles");
    expect(await profileCount(TEACHER)).toBe(1);
    expect(await profileCount(ADMIN)).toBe(all);
    // Менеджер бачить профілі лише тих, чиї записи в його черзі (тут черга порожня) — і свій.
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
