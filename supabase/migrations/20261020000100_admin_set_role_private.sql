-- Зріз WS7 add-user-invites: зміну ролі переносимо під правило 5 шаблону — `security definer` лише в схемі private.
-- AC: AC-USERS-03, AC-USERS-06, AC-USERS-08, AC-USERS-09, AC-USERS-16. Застосовану міграцію
-- 20261020000000_admin_user_management.sql не редагуємо (append-only): ця міграція додає private.admin_set_role і
-- замінює public.admin_set_role тонкою обгорткою. Для застосунку й тестів нічого не змінюється:
-- supabase.rpc("admin_set_role", { p_user, p_role }) — та сама назва, ті самі параметри й помилки.
--
-- Чому дві функції.
-- - private.admin_set_role — `security definer`: виконується з правами власника й записує profiles.role, на яку в
--   authenticated немає колонкового grant. Тож усе, що вона дозволяє, перевіряє сама: роль admin — першим оператором,
--   останнього адміністратора не понижує. Схеми private немає в [api] schemas, тож Data API (і консоль браузера з
--   публічним ключем) її напряму не бачить.
-- - public.admin_set_role — `security invoker`: точка входу RPC, виконується з правами того, хто викликає, і нічого не
--   обходить; лише передає виклик у private. Своїх перевірок обгортка не має: усі вони — у private.admin_set_role,
--   а з Data API до неї інакше не дістатися.
--
-- Пастка, яку свідомо НЕ відкриваємо (як і раніше): політика profiles_update_own («оновлюю свій рядок») + grant
-- update (role) = будь-хто сам робить себе admin одним запитом з публічним ключем. profiles.role і далі без
-- колонкового grant. Рішення — docs/decisions/0002-roles-in-table-not-jwt.md.

create or replace function private.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_admins integer;
begin
  -- 1. Лише адміністратор — і зі сторінки, і напряму з публічним ключем (AC-USERS-08, AC-USERS-09).
  --    Роль — з public.profiles (private.current_app_role()), не з JWT і не з user_metadata.
  if (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'FORBIDDEN'
      using errcode = '42501', hint = 'Змінювати ролі може лише адміністратор.';
  end if;

  if p_role is null or p_role not in ('employee', 'manager', 'admin') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;

  -- Зміни ролей — по черзі: два адміністратори одночасно не понизять один одного так, що адміністраторів не лишиться.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('private.admin_set_role', 0));

  select p.role into v_current from public.profiles as p where p.id = p_user for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 2. Останнього адміністратора не понижуємо, зокрема самого себе (AC-USERS-06).
  if v_current = 'admin' and p_role <> 'admin' then
    select count(*) into v_admins from public.profiles as p where p.role = 'admin';
    if v_admins <= 1 then
      raise exception 'LAST_ADMIN'
        using errcode = '23514', hint = 'У порталі має лишитися хоча б один адміністратор.';
    end if;
  end if;

  -- 3. AC-USERS-03: нова роль — з наступного запиту (роль читаємо з таблиці, а не з JWT).
  update public.profiles set role = p_role where id = p_user;
end;
$$;

-- Обгортка в public виконується з правами того, хто викликає, тож authenticated потрібен execute і тут
-- (usage на схему private у authenticated уже є — міграція 20261012000000_profiles_and_roles.sql). anon — ні.
revoke execute on function private.admin_set_role(uuid, text) from public, anon;
grant execute on function private.admin_set_role(uuid, text) to authenticated;

comment on function private.admin_set_role(uuid, text) is
  'Зміна ролі користувача (security definer): лише адміністратор (private.current_app_role() = admin), не останнього адміністратора. Викликається через public.admin_set_role.';

-- Точка входу RPC: та сама сигнатура, тепер security invoker. create or replace зберігає наявні grant-и;
-- повторюємо їх явно, щоб правило читалося з цього файлу.
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.admin_set_role(p_user, p_role);
end;
$$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

comment on function public.admin_set_role(uuid, text) is
  'Точка входу RPC для зміни ролі (security invoker): передає виклик у private.admin_set_role, де перевірки. Без входу (anon) не виконується.';

comment on column public.profiles.role is
  'Роль застосунку: employee | manager | admin. Колонкового grant для authenticated немає: змінює лише private.admin_set_role (через public.admin_set_role) або service_role.';
