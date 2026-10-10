-- Черги бачить лише роль manager — і на читання теж, не лише на рішення (20261017…).
-- divisions.manager_id роль не перевіряє: працівник, якого помилково призначили менеджером підрозділу,
-- інакше читав би чужі записи, заявки (зокрема тип «хвороба») і профілі цього підрозділу.
-- Застосовані міграції не редагуємо; create or replace зберігає наявні GRANT на функції.
create or replace function private.is_division_manager(p_division_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_app_role()) = 'manager'
     and exists (
       select 1 from public.divisions as d
       where d.id = p_division_id and d.manager_id = (select auth.uid())
     );
$$;

create or replace function private.manages_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_app_role()) = 'manager'
     and exists (
       select 1
       from public.leave_records as lr
       join public.divisions as d on d.id = lr.division_id
       where lr.request_id = p_request_id and d.manager_id = (select auth.uid())
     );
$$;

create or replace function private.manages_employee(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_app_role()) = 'manager'
     and exists (
       select 1
       from public.leave_requests as r
       join public.leave_records as lr on lr.request_id = r.id
       join public.divisions as d on d.id = lr.division_id
       where r.employee_id = p_employee_id and d.manager_id = (select auth.uid())
     );
$$;
