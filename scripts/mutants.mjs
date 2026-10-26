// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
const ROLE = "supabase/migrations/20261020000100_admin_set_role_private.sql";
const RULES = "supabase/migrations/20261019000000_enforce_leave_rules_in_db.sql";
const LEAVE = "supabase/migrations/20261013000000_leave_requests.sql";
const RECORDS = "supabase/migrations/20261017000000_require_leave_records.sql";
const USERS_DB = "tests/db/users-db.test.ts";
const LEAVE_DB = "tests/db/leave-db.test.ts";

export const mutants = [
  // ── SQL: ролі (AC-USERS) ───────────────────────────────────────────────────────────────────────────────────
  {
    id: "U1", kind: "sql", ac: "AC-USERS-08/09", file: ROLE, tests: [USERS_DB],
    what: "admin_set_role: прибрано перевірку FORBIDDEN (ручна мутація з WS7)",
    find: /  if \(select private\.current_app_role\(\)\) is distinct from 'admin' then\n[\s\S]*?  end if;\n/,
    replace: "",
  },
  {
    id: "U2", kind: "sql", ac: "AC-USERS-06", file: ROLE, tests: [USERS_DB],
    what: "LAST_ADMIN на одиницю зсунуто: v_admins <= 1 → v_admins < 1",
    find: "if v_admins <= 1 then", replace: "if v_admins < 1 then",
  },
  {
    id: "U3", kind: "sql", ac: "(без AC)", file: ROLE, tests: [USERS_DB],
    what: "перевірку INVALID_ROLE вимкнено",
    find: "if p_role is null or p_role not in ('employee', 'manager', 'admin') then", replace: "if false then",
  },
  // ── SQL: заявки (AC-LEAVE) ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "L1", kind: "sql", ac: "AC-LEAVE-10", file: RULES, tests: [LEAVE_DB],
    what: "submit_leave_request: ONLY_BLOCKED_DAYS більше не піднімається",
    find: "raise exception 'ONLY_BLOCKED_DAYS' using errcode = '22023';", replace: "null;",
  },
  {
    id: "L2", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
    what: "перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець) — її останній день не рахується",
    find: "pg_catalog.daterange(p_start_date, p_end_date, '[]')", replace: "pg_catalog.daterange(p_start_date, p_end_date, '[)')",
  },
  {
    id: "L3", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
    what: "перетин: діапазон НАЯВНОЇ заявки напіввідкритий [початок, кінець)",
    find: "pg_catalog.daterange(r.start_date, r.end_date, '[]')", replace: "pg_catalog.daterange(r.start_date, r.end_date, '[)')",
  },
  {
    id: "L4", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
    what: "перетин: заявка на доопрацюванні теж блокує нові (виняток прибрано)",
    find: /\n      and not exists \(\n        select 1 from public\.leave_records as rec\n        where rec\.request_id = r\.id and rec\.status = 'needs_revision'\n      \)/,
    replace: "",
  },
  {
    id: "L5", kind: "sql", ac: "передумова AC-LEAVE-04/10", file: LEAVE, tests: [LEAVE_DB],
    what: "blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору",
    find: "on public.blocked_days for insert to authenticated\n  with check ((select private.current_app_role()) = 'admin');",
    replace: "on public.blocked_days for insert to authenticated\n  with check (true);",
  },
  {
    id: "L6", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
    what: "політика рішень: прибрано role = 'manager' (рішення за самим manager_id підрозділу)",
    expect: "survive",
    reason:
      "еквівалентний: з 20261018000000_manager_helpers_require_role.sql private.is_division_manager() сама перевіряє " +
      "current_app_role() = 'manager', тож перевірка ролі в політиці — дублікат (захист у глибину). " +
      "Тест «AC-LEAVE-06: працівник, якого записали в manager_id, …» лишається зеленим і під цим мутантом.",
    find: "  using (\n    (select private.current_app_role()) = 'manager'\n    and (select private.is_division_manager(division_id))\n    and status = 'pending'\n  )",
    replace: "  using (\n    (select private.is_division_manager(division_id))\n    and status = 'pending'\n  )",
  },
  {
    id: "L7", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
    what: "політика рішень: ухвалене рішення можна переписати (прибрано status = 'pending')",
    find: "    and (select private.is_division_manager(division_id))\n    and status = 'pending'\n  )",
    replace: "    and (select private.is_division_manager(division_id))\n  )",
  },
  {
    id: "L8", kind: "sql", ac: "AC-LEAVE-09", file: LEAVE, tests: [LEAVE_DB],
    what: "leave_records select: будь-який менеджер бачить записи всіх підрозділів",
    find: "on public.leave_records for select to authenticated\n  using (\n    (select private.owns_request(request_id))\n    or (select private.is_division_manager(division_id))",
    replace: "on public.leave_records for select to authenticated\n  using (\n    (select private.owns_request(request_id))\n    or (select private.current_app_role()) = 'manager'",
  },
  // ── TS: межі з AC, які покриття «бачить» на 100 % (точкові мутанти; повний перебір — npm run mutation:ts) ──
  {
    id: "T1", kind: "ts", ac: "AC-LEAVE-11", file: "src/lib/leave/calendar.ts", tests: ["tests/leave/calendar.test.ts"],
    what: "rangesOverlap: b.startDate <= a.endDate → < (нова заявка, що закінчується в день початку наявної, проходить)",
    find: "b.startDate <= a.endDate", replace: "b.startDate < a.endDate",
  },
  {
    id: "T2", kind: "ts", ac: "AC-USERS-02", file: "src/lib/auth/password.ts", tests: ["tests/auth/confirm.test.ts"],
    what: "validatePassword: password.length < 8 → <= 8 (пароль рівно з 8 символів відхилено)",
    find: "password.length < PASSWORD_MIN_LENGTH", replace: "password.length <= PASSWORD_MIN_LENGTH",
  },
];
