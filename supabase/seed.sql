-- Сид-дані проєкту. Застосовується:
--   локально — під час `supabase db reset` (потрібен Docker);
--   у хмарі — лише з `supabase db push --include-seed` (звичайний db push сид не виконує).
--
-- Правила:
--   * лише синтетичні дані, email-и тільки *@example.test;
--   * файл має бути ІДЕМПОТЕНТНИМ: повторний запуск нічого не дублює
--     (insert ... on conflict do nothing / do update);
--   * користувачів Auth (auth.users) тут НЕ створюємо: їх створює
--     scripts/create-demo-users.mjs через Admin API (npm run users:demo)
--     за списком supabase/demo-users.json, а тригер on_auth_user_created додає профілі.
--
-- Приклад для довідкової таблиці, коли вона з'явиться у вашій міграції:
--   insert into public.departments (code, name)
--   values ('MATH', 'Кафедра математики'), ('LANG', 'Кафедра мов')
--   on conflict (code) do update set name = excluded.name;

-- ── Портал відсутностей: довідники (синтетичні) ──────────────────────────────────────────
-- Застосувати в хмарі: job db-deploy — Actions → CI → Run workflow на main з include_seed (лише PM, перед
-- npm run users:demo — скрипт прив'язує менеджерів і посади до підрозділів за кодом). Не з ноутбука.
insert into public.divisions (code, name)
values
  ('MATH', 'Математика'),
  ('PRIMARY', 'Початкова школа')
on conflict (code) do update set name = excluded.name;

-- Заблоковані дні календаря школи (AC-LEAVE-04).
insert into public.blocked_days (day, reason)
values
  ('2026-11-05', 'Осінні канікули (синтетичний приклад)')
on conflict (day) do update set reason = excluded.reason;
