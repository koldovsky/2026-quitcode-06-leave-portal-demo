// Правила, які виконує лише база (RLS, тригери, check), — на справжньому Postgres (PGlite) з усіма міграціями.
// Саме ці тести, а не доменний модуль, покривають AC-LEAVE-05, 06, 09 у docs/conformance.md.
import { beforeAll, describe, expect, it } from "vitest";
import { createLeaveDb, type LeaveDb } from "./supabase-pglite";

let t: LeaveDb;
let ADMIN: string, MANAGER_MATH: string, MANAGER_PRIMARY: string, TEACHER: string, TEACHER2: string;

beforeAll(async () => {
  t = await createLeaveDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_MATH = t.users["manager.math@example.test"];
  MANAGER_PRIMARY = t.users["manager.primary@example.test"];
  TEACHER = t.users["teacher@example.test"];
  TEACHER2 = t.users["teacher2@example.test"];
}, 60_000);

/** Подання так, як його робить server action: функція submit_leave_request з усіма посадами працівника. */
async function submitAllPositions(userId: string, start: string, end: string): Promise<string> {
  const [row] = await t.asUser<{ id: string }>(
    userId,
    `select public.submit_leave_request('vacation', $1, $2,
       (select array_agg(id) from public.positions where employee_id = (select auth.uid()))) as id`,
    [start, end],
  );
  return row.id;
}

const recordsOf = (userId: string, requestId: string) =>
  t.asUser<{ id: string; kind: string; status: string }>(
    userId,
    "select id, kind, status from public.leave_records where request_id = $1 order by kind desc",
    [requestId],
  );

describe("База: подання заявки", () => {
  it("AC-LEAVE-01: функція подання зберігає заявку з записом main; заявку без записів база відхиляє", async () => {
    const id = await submitAllPositions(TEACHER2, "2026-11-03", "2026-11-04");
    expect((await recordsOf(TEACHER2, id)).map((r) => [r.kind, r.status])).toEqual([["main", "pending"]]);

    // Прямий запит до Data API (POST /rest/v1/leave_requests) — окрема транзакція без записів.
    await expect(
      t.asUser(TEACHER2, "insert into public.leave_requests (leave_type, start_date, end_date) values ('sick', '2026-12-01', '2026-12-01')"),
    ).rejects.toThrow("REQUEST_WITHOUT_RECORDS");
    const [{ n }] = await t.asService<{ n: number }>(
      "select count(*)::int as n from public.leave_requests where employee_id = $1 and start_date = '2026-12-01'",
      [TEACHER2],
    );
    expect(n).toBe(0);
  });
});

describe("База: черги й рішення", () => {
  it("AC-LEAVE-05: запис основної посади — у черзі менеджера «Математики», додаткової — у черзі «Початкової школи»", async () => {
    const id = await submitAllPositions(TEACHER, "2026-11-10", "2026-11-11");
    expect((await recordsOf(MANAGER_MATH, id)).map((r) => r.kind)).toEqual(["main"]);
    expect((await recordsOf(MANAGER_PRIMARY, id)).map((r) => r.kind)).toEqual(["additional"]);

    // Менеджер не може ухвалити рішення щодо запису чужого підрозділу: 0 рядків.
    const updated = await t.asUser(
      MANAGER_MATH,
      "update public.leave_records set status = 'approved' where request_id = $1 and kind = 'additional' returning id",
      [id],
    );
    expect(updated).toEqual([]);
  });

  it("AC-LEAVE-06: схвалення → approved; хто і коли ставить тригер, а не клієнт", async () => {
    const id = await submitAllPositions(TEACHER, "2026-11-16", "2026-11-17");
    // Клієнт не може сам записати автора рішення: колонкового GRANT на decided_by немає.
    await expect(
      t.asUser(MANAGER_MATH, "update public.leave_records set decided_by = $2 where request_id = $1", [id, TEACHER]),
    ).rejects.toThrow("permission denied");
    // Працівник не може схвалити власний запис: політика update — лише менеджеру підрозділу.
    expect(
      await t.asUser(TEACHER, "update public.leave_records set status = 'approved' where request_id = $1 returning id", [id]),
    ).toEqual([]);

    await t.asUser(MANAGER_MATH, "update public.leave_records set status = 'approved' where request_id = $1 and kind = 'main'", [id]);
    const [main] = await t.asService<{ status: string; decided_by: string; decided: boolean }>(
      "select status, decided_by, decided_at is not null as decided from public.leave_records where request_id = $1 and kind = 'main'",
      [id],
    );
    expect(main).toEqual({ status: "approved", decided_by: MANAGER_MATH, decided: true });
  });

  it("AC-LEAVE-07: повернення на доопрацювання з порожнім коментарем база відхиляє (check), з коментарем — needs_revision", async () => {
    const id = await submitAllPositions(TEACHER2, "2026-11-23", "2026-11-23");
    await expect(
      t.asUser(MANAGER_PRIMARY, "update public.leave_records set status = 'needs_revision', comment = '   ' where request_id = $1", [id]),
    ).rejects.toThrow("leave_records_comment_check");
    await t.asUser(
      MANAGER_PRIMARY,
      "update public.leave_records set status = 'needs_revision', comment = 'Уточніть дату кінця' where request_id = $1",
      [id],
    );
    expect((await recordsOf(TEACHER2, id)).map((r) => r.status)).toEqual(["needs_revision"]);
  });

  it("AC-LEAVE-08: виправлена заявка на доопрацюванні — усі записи знову pending, рішення очищено; заявку на розгляді не змінити", async () => {
    const id = await submitAllPositions(TEACHER, "2026-11-24", "2026-11-25");
    await t.asUser(MANAGER_MATH, "update public.leave_records set status = 'approved' where request_id = $1", [id]);
    await t.asUser(MANAGER_PRIMARY, "update public.leave_records set status = 'needs_revision', comment = 'Уточніть' where request_id = $1", [id]);

    const fixed = await t.asUser(TEACHER, "update public.leave_requests set end_date = '2026-11-26' where id = $1 returning id", [id]);
    expect(fixed).toHaveLength(1);
    const records = await t.asService<{ status: string; decided_by: string | null }>(
      "select status, decided_by from public.leave_records where request_id = $1",
      [id],
    );
    expect(records).toEqual([
      { status: "pending", decided_by: null },
      { status: "pending", decided_by: null },
    ]);

    // Тепер заявка на розгляді — повторно редагувати її не можна: 0 рядків.
    expect(
      await t.asUser(TEACHER, "update public.leave_requests set end_date = '2026-11-27' where id = $1 returning id", [id]),
    ).toEqual([]);
  });
});

describe("База: доступ", () => {
  it("AC-LEAVE-09: працівник бачить лише власні заявки й записи, а не заявки колеги", async () => {
    const id = await submitAllPositions(TEACHER, "2026-11-30", "2026-11-30");
    const count = async (userId: string, table: string) =>
      (await t.asUser<{ n: number }>(userId, `select count(*)::int as n from public.${table} where ${table === "leave_requests" ? "id" : "request_id"} = $1`, [id]))[0].n;
    expect(await count(TEACHER, "leave_requests")).toBe(1);
    expect(await count(TEACHER, "leave_records")).toBe(2);
    expect(await count(TEACHER2, "leave_requests")).toBe(0);
    expect(await count(TEACHER2, "leave_records")).toBe(0);
    const [{ n }] = await t.asUser<{ n: number }>(TEACHER2, "select count(*)::int as n from public.profiles where id = $1", [TEACHER]);
    expect(n).toBe(0);
  });

  it("AC-LEAVE-09: менеджер «Математики» бачить лише записи своєї черги; адміністратор бачить усе, але не вирішує", async () => {
    await submitAllPositions(TEACHER, "2026-12-14", "2026-12-15"); // MATH (main) + PRIMARY (additional)
    const own = await submitAllPositions(TEACHER2, "2026-12-07", "2026-12-08"); // лише «Початкова школа»
    const [{ n: seenByMath }] = await t.asUser<{ n: number }>(
      MANAGER_MATH,
      "select count(*)::int as n from public.leave_requests where id = $1",
      [own],
    );
    expect(seenByMath).toBe(0);
    const mathDivisions = await t.asUser<{ code: string }>(
      MANAGER_MATH,
      "select distinct d.code from public.leave_records as lr join public.divisions as d on d.id = lr.division_id",
    );
    expect(mathDivisions).toEqual([{ code: "MATH" }]);

    const [{ n: all }] = await t.asService<{ n: number }>("select count(*)::int as n from public.leave_requests");
    const [{ n: seenByAdmin }] = await t.asUser<{ n: number }>(ADMIN, "select count(*)::int as n from public.leave_requests");
    expect(seenByAdmin).toBe(all);
    expect(
      await t.asUser(ADMIN, "update public.leave_records set status = 'approved' where status = 'pending' returning id"),
    ).toEqual([]);

    // Навіть якщо admin запише себе в manager_id (divisions змінює лише він), рішення ухвалює лише роль manager.
    const [math] = await t.asService<{ id: string; manager_id: string }>(
      "select id, manager_id from public.divisions where code = 'MATH'",
    );
    await t.asUser(ADMIN, "update public.divisions set manager_id = $1 where id = $2", [ADMIN, math.id]);
    try {
      expect(
        await t.asUser(ADMIN, "update public.leave_records set status = 'approved' where status = 'pending' returning id"),
      ).toEqual([]);
    } finally {
      await t.asService("update public.divisions set manager_id = $1 where id = $2", [math.manager_id, math.id]);
    }
  });

  it("анонімний відвідувач не читає заявки", async () => {
    await expect(t.db.exec("begin; set local role anon; select count(*) from public.leave_requests; commit;")).rejects.toThrow(
      "permission denied",
    );
    await t.db.exec("rollback").catch(() => {});
  });
});
