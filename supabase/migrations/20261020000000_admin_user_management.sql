-- Зріз WS7 add-user-invites (зміна impl-user-invites): роль користувача змінює лише адміністратор — однією функцією.
-- AC: AC-USERS-03, AC-USERS-06, AC-USERS-08, AC-USERS-09, AC-USERS-10. Застосовані міграції не редагуємо — лише нова.
--
-- Пастка, яку тут свідомо НЕ відкриваємо: політика profiles_update_own («оновлюю свій рядок») + grant update (role)
-- = будь-хто сам робить себе admin одним запитом з публічним ключем. Тому profiles.role і далі БЕЗ колонкового grant
-- (у authenticated лише update (full_name), міграція 20261012000000_profiles_and_roles.sql), а змінити роль можна
-- лише функцією нижче.
--
-- Виняток із правила 5 (security definer — лише в схемі private): public.admin_set_role — навмисна точка входу RPC
-- (supabase.rpc("admin_set_role") зі сторінки /admin/users клієнтом користувача, а не admin-клієнтом), яка має
-- записати колонку без column grant. Компенсація: перевірка ролі admin — першим оператором; set search_path = '';
-- execute лише authenticated (revoke з public і anon). Рішення — docs/decisions/0002-roles-in-table-not-jwt.md.
--
-- Хто адміністратор, функція читає з public.profiles (private.current_app_role()), а не з JWT і не з user_metadata:
-- нова роль діє з наступного запиту (AC-USERS-03), а user_metadata користувач змінює сам.

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_admins integer;
begin
  -- 1. Лише адміністратор — і зі сторінки, і прямим rpc з публічним ключем (AC-USERS-08, AC-USERS-09).
  if (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'FORBIDDEN'
      using errcode = '42501', hint = 'Змінювати ролі може лише адміністратор.';
  end if;

  if p_role is null or p_role not in ('employee', 'manager', 'admin') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;

  -- Зміни ролей — по черзі: два адміністратори одночасно не понизять один одного так, що адміністраторів не лишиться.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('public.admin_set_role', 0));

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

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

comment on function public.admin_set_role(uuid, text) is
  'Зміна ролі користувача: лише адміністратор (private.current_app_role() = admin), не останнього адміністратора. Єдиний шлях змінити profiles.role для authenticated.';

comment on column public.profiles.role is
  'Роль застосунку: employee | manager | admin. Колонкового grant для authenticated немає: змінює лише public.admin_set_role (або service_role).';
