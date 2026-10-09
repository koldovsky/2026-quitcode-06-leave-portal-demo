-- Зріз 1: заявки на відсутність і рішення менеджера (зміна impl-leave-request, спека spec-v0.1).
-- AC: AC-LEAVE-01 … AC-LEAVE-09. Правила для кожної міграції — AGENTS.md → «База даних»:
-- RLS на кожній таблиці, revoke + явні GRANT, політика на кожну операцію `to authenticated`,
-- `(select auth.uid())`, хелпери — у схемі private з `security definer` і `set search_path = ''`.

-- ── Ролі проєкту: employee, manager, admin (замість member, admin шаблону) ────────────────
-- Порядок важливий: спершу дані й значення за замовчуванням, потім constraint. Інакше тригер
-- on_auth_user_created (вставляє профіль із role за замовчуванням) порушить новий constraint,
-- і кожен createUser у scripts/create-demo-users.mjs впаде.
update public.profiles set role = 'employee' where role = 'member';
alter table public.profiles alter column role set default 'employee';
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('employee', 'manager', 'admin'));

-- ── Довідники: підрозділи, посади, заблоковані дні ─────────────────────────────────────────
create table public.divisions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  -- У кожного підрозділу один менеджер (Assumptions зміни add-leave-request).
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index divisions_manager_id_idx on public.divisions (manager_id);

create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  division_id uuid not null references public.divisions (id),
  kind        text not null check (kind in ('main', 'additional')),
  title       text not null,
  created_at  timestamptz not null default now(),
  -- Рівно одна основна й не більше однієї додаткової посади (глосарій «Посада»).
  constraint positions_employee_kind_key unique (employee_id, kind)
);
create index positions_division_id_idx on public.positions (division_id);

create table public.blocked_days (
  day        date primary key,
  reason     text not null default '',
  created_at timestamptz not null default now()
);

-- ── Заявки й записи заявок ────────────────────────────────────────────────────────────────
create table public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  -- Власник — завжди той, хто вставляє: колонку не видаємо в GRANT insert (див. нижче).
  employee_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  leave_type  text not null check (leave_type in ('sick', 'vacation', 'business_trip')),
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- AC-LEAVE-03: дата кінця не раніша за дату початку — і в базі, а не лише в server action.
  constraint leave_requests_range_check check (end_date >= start_date)
);
create index leave_requests_employee_id_idx on public.leave_requests (employee_id);

-- Запис = частина заявки для однієї посади (AC-LEAVE-01, AC-LEAVE-02). Рішення — на рівні запису:
-- кожен запис іде менеджеру підрозділу своєї посади (робоче рішення Q3, docs/spec-reading.md).
-- division_id і kind копіюємо з посади під час подання: заявка лишається в черзі того менеджера,
-- якому її подано, навіть якщо посаду згодом переведуть.
create table public.leave_records (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.leave_requests (id) on delete cascade,
  position_id uuid not null references public.positions (id),
  kind        text not null check (kind in ('main', 'additional')),
  division_id uuid not null references public.divisions (id),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'needs_revision')),
  decided_by  uuid references public.profiles (id),
  decided_at  timestamptz,
  comment     text,
  created_at  timestamptz not null default now(),
  constraint leave_records_request_position_key unique (request_id, position_id),
  -- AC-LEAVE-06: рішення завжди має автора й час; запис на розгляді — ні.
  constraint leave_records_decision_check check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null)
  ),
  -- AC-LEAVE-07: на доопрацювання — лише з непорожнім коментарем.
  constraint leave_records_comment_check check (
    status <> 'needs_revision' or length(btrim(coalesce(comment, ''))) > 0
  )
);
create index leave_records_request_id_idx on public.leave_records (request_id);
create index leave_records_division_id_idx on public.leave_records (division_id);
create index leave_records_position_id_idx on public.leave_records (position_id);

alter table public.divisions enable row level security;
alter table public.positions enable row level security;
alter table public.blocked_days enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_records enable row level security;

-- ── Права (GRANT): автогрантів немає, видаємо лише потрібне ───────────────────────────────
revoke all on table public.divisions, public.positions, public.blocked_days,
  public.leave_requests, public.leave_records from anon, authenticated;

grant select, insert, update, delete on table public.divisions to authenticated;   -- запис — лише admin (політики)
grant select, insert, update, delete on table public.positions to authenticated;   -- запис — лише admin (політики)
grant select, insert, delete on table public.blocked_days to authenticated;        -- запис — лише admin (політики)

grant select on table public.leave_requests to authenticated;
-- employee_id не видаємо: власником стає auth.uid() за замовчуванням.
grant insert (leave_type, start_date, end_date) on table public.leave_requests to authenticated;
-- AC-LEAVE-08: працівник виправляє лише тип і дати.
grant update (leave_type, start_date, end_date) on table public.leave_requests to authenticated;

grant select on table public.leave_records to authenticated;
-- status не видаємо: новий запис завжди pending.
grant insert (request_id, position_id, kind, division_id) on table public.leave_records to authenticated;
-- Рішення менеджера: лише статус і коментар; хто і коли — ставить тригер.
grant update (status, comment) on table public.leave_records to authenticated;

-- Серверні скрипти (scripts/create-demo-users.mjs) працюють як service_role.
grant select, insert, update, delete on table public.divisions, public.positions, public.blocked_days,
  public.leave_requests, public.leave_records to service_role;

-- ── Хелпери (private, security definer: читають таблиці в обхід RLS — без рекурсії 42P17) ──
create or replace function private.is_division_manager(p_division_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.divisions as d
    where d.id = p_division_id and d.manager_id = (select auth.uid())
  );
$$;

create or replace function private.owns_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leave_requests as r
    where r.id = p_request_id and r.employee_id = (select auth.uid())
  );
$$;

create or replace function private.manages_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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
  select exists (
    select 1
    from public.leave_requests as r
    join public.leave_records as lr on lr.request_id = r.id
    join public.divisions as d on d.id = lr.division_id
    where r.employee_id = p_employee_id and d.manager_id = (select auth.uid())
  );
$$;

create or replace function private.request_needs_revision(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leave_records as lr
    where lr.request_id = p_request_id and lr.status = 'needs_revision'
  );
$$;

create or replace function private.position_is_mine(p_position_id uuid, p_division_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.positions as p
    where p.id = p_position_id
      and p.employee_id = (select auth.uid())
      and p.division_id = p_division_id
      and p.kind = p_kind
  );
$$;

revoke execute on function
  private.is_division_manager(uuid), private.owns_request(uuid), private.manages_request(uuid),
  private.manages_employee(uuid), private.request_needs_revision(uuid), private.position_is_mine(uuid, uuid, text)
  from public, anon;
grant execute on function
  private.is_division_manager(uuid), private.owns_request(uuid), private.manages_request(uuid),
  private.manages_employee(uuid), private.request_needs_revision(uuid), private.position_is_mine(uuid, uuid, text)
  to authenticated;

-- ── Політики RLS (окремо на кожну операцію) ──────────────────────────────────────────────
-- profiles: менеджер бачить профілі працівників, чиї записи в його черзі (ім'я в черзі).
create policy profiles_select_queue_employees
  on public.profiles for select to authenticated
  using ((select private.manages_employee(id)));

-- divisions: назви бачать усі; змінює лише admin.
create policy divisions_select_all
  on public.divisions for select to authenticated
  using (true);
create policy divisions_insert_admin
  on public.divisions for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy divisions_update_admin
  on public.divisions for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy divisions_delete_admin
  on public.divisions for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

-- positions: працівник — власні; менеджер — свого підрозділу; admin — усі й змінює.
create policy positions_select_own_division_or_admin
  on public.positions for select to authenticated
  using (
    employee_id = (select auth.uid())
    or (select private.is_division_manager(division_id))
    or (select private.current_app_role()) = 'admin'
  );
create policy positions_insert_admin
  on public.positions for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy positions_update_admin
  on public.positions for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy positions_delete_admin
  on public.positions for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

-- blocked_days: бачать усі (AC-LEAVE-04 рахує дні); змінює лише admin.
create policy blocked_days_select_all
  on public.blocked_days for select to authenticated
  using (true);
create policy blocked_days_insert_admin
  on public.blocked_days for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy blocked_days_delete_admin
  on public.blocked_days for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

-- leave_requests — AC-LEAVE-09: працівник — власні; менеджер — заявки зі своєї черги; admin — усі.
create policy leave_requests_select_own_queue_or_admin
  on public.leave_requests for select to authenticated
  using (
    employee_id = (select auth.uid())
    or (select private.manages_request(id))
    or (select private.current_app_role()) = 'admin'
  );
-- Подає лише працівник і лише від свого імені (Assumptions: заявки подає роль employee).
create policy leave_requests_insert_employee
  on public.leave_requests for insert to authenticated
  with check (
    employee_id = (select auth.uid())
    and (select private.current_app_role()) = 'employee'
  );
-- AC-LEAVE-08: виправляє лише власну заявку і лише коли вона на доопрацюванні.
create policy leave_requests_update_own_needs_revision
  on public.leave_requests for update to authenticated
  using (employee_id = (select auth.uid()) and (select private.request_needs_revision(id)))
  with check (employee_id = (select auth.uid()));
-- delete: політики немає — скасування заявки поза зрізом 1 (Non-goals).

-- leave_records — AC-LEAVE-05, AC-LEAVE-09: запис бачить власник заявки, менеджер підрозділу запису, admin.
create policy leave_records_select_own_division_or_admin
  on public.leave_records for select to authenticated
  using (
    (select private.owns_request(request_id))
    or (select private.is_division_manager(division_id))
    or (select private.current_app_role()) = 'admin'
  );
-- Запис створюється разом із власною заявкою і лише для власної посади з її підрозділом і видом.
create policy leave_records_insert_own_position
  on public.leave_records for insert to authenticated
  with check (
    (select private.owns_request(request_id))
    and (select private.position_is_mine(position_id, division_id, kind))
  );
-- AC-LEAVE-06, AC-LEAVE-07: рішення ухвалює менеджер підрозділу запису і лише для запису на розгляді.
create policy leave_records_update_division_manager
  on public.leave_records for update to authenticated
  using ((select private.is_division_manager(division_id)) and status = 'pending')
  with check (
    (select private.is_division_manager(division_id))
    and status in ('approved', 'needs_revision')
  );
-- delete: політики немає.

-- ── Тригери ──────────────────────────────────────────────────────────────────────────────
-- AC-LEAVE-06: хто і коли ухвалив рішення ставить база, а не клієнт; повернення в pending очищує їх.
create or replace function private.set_decision_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'pending' then
      new.decided_by := null;
      new.decided_at := null;
    else
      new.decided_by := (select auth.uid());
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_decision_fields() from public, anon, authenticated;

create trigger leave_records_set_decision_fields
  before update of status on public.leave_records
  for each row execute function private.set_decision_fields();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.touch_updated_at() from public, anon, authenticated;

create trigger leave_requests_touch_updated_at
  before update on public.leave_requests
  for each row execute function private.touch_updated_at();

-- AC-LEAVE-08: виправлена заявка знову на розгляді — усі її записи повертаються в pending
-- (власне припущення: дати змінились, тож і вже схвалений запис розглядають знову).
-- security definer: працівник не має права змінювати статус записів напряму.
create or replace function private.resubmit_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.leave_records
     set status = 'pending'
   where request_id = new.id and status <> 'pending';
  return new;
end;
$$;

revoke execute on function private.resubmit_records() from public, anon, authenticated;

create trigger leave_requests_resubmit_records
  after update on public.leave_requests
  for each row execute function private.resubmit_records();

-- ── Подання заявки однією транзакцією (AC-LEAVE-01, AC-LEAVE-02) ───────────────────────────
-- security invoker: працює з правами користувача, тож діють GRANT і RLS вище.
-- Перевірки дат і посад робить server action (src/lib/leave); тут — лише атомарний запис.
create or replace function public.submit_leave_request(
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_position_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_count integer;
begin
  insert into public.leave_requests (leave_type, start_date, end_date)
  values (p_leave_type, p_start_date, p_end_date)
  returning id into v_request_id;

  insert into public.leave_records (request_id, position_id, kind, division_id)
  select v_request_id, p.id, p.kind, p.division_id
  from public.positions as p
  where p.id = any (p_position_ids) and p.employee_id = (select auth.uid());

  get diagnostics v_count = row_count;
  if v_count = 0 or v_count <> cardinality(p_position_ids) then
    raise exception 'UNKNOWN_POSITION' using errcode = '22023';
  end if;

  return v_request_id;
end;
$$;

revoke execute on function public.submit_leave_request(text, date, date, uuid[]) from public, anon;
grant execute on function public.submit_leave_request(text, date, date, uuid[]) to authenticated;
