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

/** Скільки заявок працівника з цією датою початку бачить база (service role, повз RLS) — «нічого не збережено». */
const requestsStartingOn = async (userId: string, start: string) =>
  (
    await t.asService<{ n: number }>(
      "select count(*)::int as n from public.leave_requests where employee_id = $1 and start_date = $2",
      [userId, start],
    )
  )[0].n;

// Тести з коментарем «Мутант Lx» дописано після npm run mutation:sql (scripts/mutation-check.mjs): без них відповідне
// правило в SQL можна зламати, і жоден тест бази не червоніє. Дати 2027 року — щоб не перетинатися з іншими тестами
// цього файлу (одна база на файл).

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

describe("База: правила подання (останні ворота за server action)", () => {
  // Прямий виклик RPC із власною сесією — так, як його можна зробити з публічним ключем у бандлі.
  const submitError = (userId: string, start: string, end: string) =>
    submitAllPositions(userId, start, end).then(
      () => "",
      (e: Error) => e.message,
    );

  it("AC-LEAVE-03: функція подання відхиляє діапазон, де кінець раніше за початок", async () => {
    expect(await submitError(TEACHER2, "2026-11-25", "2026-11-24")).toContain("INVALID_RANGE");
  });

  it("AC-LEAVE-10: функція подання відхиляє діапазон лише із заблокованих днів", async () => {
    expect(await submitError(TEACHER2, "2026-11-05", "2026-11-05")).toContain("ONLY_BLOCKED_DAYS");
  });

  it("AC-LEAVE-11: функція подання відхиляє перетин із власною заявкою на розгляді", async () => {
    await submitAllPositions(TEACHER2, "2026-11-20", "2026-11-21");
    expect(await submitError(TEACHER2, "2026-11-21", "2026-11-22")).toContain("OVERLAPPING_REQUEST");
    const [{ n }] = await t.asService<{ n: number }>(
      "select count(*)::int as n from public.leave_requests where employee_id = $1 and start_date = '2026-11-21'",
      [TEACHER2],
    );
    expect(n).toBe(0);
  });

  // Мутант L2: діапазон НОВОЇ заявки став напіввідкритим [початок, кінець) — її останній день більше не рахується.
  it("AC-LEAVE-11: нова заявка, що закінчується в перший день наявної, — теж перетин, нічого не збережено", async () => {
    await submitAllPositions(TEACHER2, "2027-01-12", "2027-01-13");
    expect(await submitError(TEACHER2, "2027-01-10", "2027-01-12")).toContain("OVERLAPPING_REQUEST");
    expect(await requestsStartingOn(TEACHER2, "2027-01-10")).toBe(0);
  });

  // Мутант L4: виняток для заявки на доопрацюванні прибрано — вона теж блокує нові.
  it("AC-LEAVE-11: заявка на доопрацюванні не блокує нову на ті самі дати", async () => {
    const id = await submitAllPositions(TEACHER2, "2027-02-01", "2027-02-02");
    await t.asUser(
      MANAGER_PRIMARY,
      "update public.leave_records set status = 'needs_revision', comment = 'Уточніть' where request_id = $1",
      [id],
    );
    expect(await submitError(TEACHER2, "2027-02-02", "2027-02-03")).toBe("");
    expect(await requestsStartingOn(TEACHER2, "2027-02-02")).toBe(1);
  });
});

describe("База: заблоковані дні", () => {
  // Мутант L5: політика insert для blocked_days пускає будь-кого з входом. Окремого AC немає: це передумова
  // AC-LEAVE-04 і AC-LEAVE-10 («адміністратор позначив … як заблокований день»), тож ID у назві не ставимо.
  it("заблокований день додає лише адміністратор; працівник і менеджер — ні", async () => {
    const insertDay = (userId: string) =>
      t.asUser(userId, "insert into public.blocked_days (day, reason) values ('2027-03-08', 'Свято')");
    const daysOn8March = async () =>
      (await t.asService<{ n: number }>("select count(*)::int as n from public.blocked_days where day = '2027-03-08'"))[0].n;

    await expect(insertDay(TEACHER)).rejects.toThrow("row-level security");
    await expect(insertDay(MANAGER_MATH)).rejects.toThrow("row-level security");
    expect(await daysOn8March()).toBe(0);

    await insertDay(ADMIN);
    expect(await daysOn8March()).toBe(1);
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

  // Мутант L7: з політики рішень прибрано status = 'pending' — ухвалене рішення можна переписати.
  it("AC-LEAVE-07: уже схвалений запис менеджер не повертає на доопрацювання — запис лишається approved", async () => {
    const id = await submitAllPositions(TEACHER2, "2027-04-05", "2027-04-05");
    await t.asUser(MANAGER_PRIMARY, "update public.leave_records set status = 'approved' where request_id = $1", [id]);
    expect(
      await t.asUser(
        MANAGER_PRIMARY,
        "update public.leave_records set status = 'needs_revision', comment = 'Передумав' where request_id = $1 returning id",
        [id],
      ),
    ).toEqual([]);
    expect((await recordsOf(TEACHER2, id)).map((r) => r.status)).toEqual(["approved"]);
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

  it("AC-LEAVE-09: працівник, якого помилково записали в manager_id, не бачить чужих заявок, записів і профілів підрозділу", async () => {
    const id = await submitAllPositions(TEACHER, "2026-12-21", "2026-12-22"); // MATH (main) + PRIMARY (additional)
    const [primary] = await t.asService<{ id: string; manager_id: string }>(
      "select id, manager_id from public.divisions where code = 'PRIMARY'",
    );
    // Помилка адміністратора: менеджером «Початкової школи» записано працівника (роль employee).
    await t.asUser(ADMIN, "update public.divisions set manager_id = $1 where id = $2", [TEACHER2, primary.id]);
    try {
      const seen = async (sql: string) => (await t.asUser<{ n: number }>(TEACHER2, sql, [id]))[0].n;
      expect(await seen("select count(*)::int as n from public.leave_records where request_id = $1")).toBe(0);
      expect(await seen("select count(*)::int as n from public.leave_requests where id = $1")).toBe(0);
      expect(
        await seen(
          "select count(*)::int as n from public.profiles where id = (select employee_id from public.leave_requests where id = $1)",
        ),
      ).toBe(0);
      const [{ n: profiles }] = await t.asUser<{ n: number }>(
        TEACHER2,
        "select count(*)::int as n from public.profiles where id = $1",
        [TEACHER],
      );
      expect(profiles).toBe(0);
    } finally {
      await t.asService("update public.divisions set manager_id = $1 where id = $2", [primary.manager_id, primary.id]);
    }
  });

  // Мутант L6 — еквівалентний: з політики рішень прибрано current_app_role() = 'manager', але
  // private.is_division_manager() сама перевіряє роль (міграція 20261018000000). Тест лишається зеленим і під L6 —
  // він документує, чому mutants.mjs позначає L6 як expect: "survive".
  it("AC-LEAVE-06: працівник, якого записали в manager_id, не схвалює записів підрозділу — обидва лишаються pending", async () => {
    const id = await submitAllPositions(TEACHER, "2027-05-10", "2027-05-10"); // MATH (main) + PRIMARY (additional)
    const [math] = await t.asService<{ id: string; manager_id: string }>(
      "select id, manager_id from public.divisions where code = 'MATH'",
    );
    await t.asUser(ADMIN, "update public.divisions set manager_id = $1 where id = $2", [TEACHER2, math.id]);
    try {
      expect(
        await t.asUser(TEACHER2, "update public.leave_records set status = 'approved' where request_id = $1 returning id", [id]),
      ).toEqual([]);
    } finally {
      await t.asService("update public.divisions set manager_id = $1 where id = $2", [math.manager_id, math.id]);
    }
    const statuses = await t.asService<{ status: string }>("select status from public.leave_records where request_id = $1", [id]);
    expect(statuses.map((s) => s.status)).toEqual(["pending", "pending"]);
  });

  it("анонімний відвідувач не читає заявки", async () => {
    await expect(t.db.exec("begin; set local role anon; select count(*) from public.leave_requests; commit;")).rejects.toThrow(
      "permission denied",
    );
    await t.db.exec("rollback").catch(() => {});
  });
});
