-- Правила подання AC-LEAVE-03, AC-LEAVE-10 і AC-LEAVE-11 — у функції подання, а не лише в server action.
-- Знайдено на репетиції 11.10.2026 на справжньому Supabase: прямий виклик submit_leave_request з власною
-- сесією (публічний ключ є в JS-бандлі) обходив перевірки застосунку — перетин заявок і день лише із
-- заблокованих днів зберігались. Server action перевіряє те саме раніше й показує зрозуміле повідомлення;
-- база — останні ворота. Блокування на працівника закриває гонку двох одночасних подань.
-- create or replace зберігає наявні GRANT на функцію (execute — лише authenticated).

create or replace function public.submit_leave_request(
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_position_ids uuid[],
  p_substitute_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request_id uuid;
  v_count integer;
begin
  -- AC-LEAVE-03: дата кінця не раніша за дату початку.
  if p_end_date < p_start_date then
    raise exception 'INVALID_RANGE' using errcode = '22023';
  end if;

  -- Подання одного працівника — по черзі (перевірка перетину й вставка в одній транзакції).
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));

  -- AC-LEAVE-10: у діапазоні є хоча б один незаблокований день.
  if not exists (
    select 1
    from pg_catalog.generate_series(p_start_date::timestamp, p_end_date::timestamp, interval '1 day') as d(day)
    where not exists (select 1 from public.blocked_days as b where b.day = d.day::date)
  ) then
    raise exception 'ONLY_BLOCKED_DAYS' using errcode = '22023';
  end if;

  -- AC-LEAVE-11: перетин із власною заявкою, що на розгляді чи схвалена
  -- (заявка, де хоч один запис на доопрацюванні, не блокує — як requestStatus у src/lib/leave/decisions.ts).
  if exists (
    select 1
    from public.leave_requests as r
    where r.employee_id = v_uid
      and pg_catalog.daterange(r.start_date, r.end_date, '[]') && pg_catalog.daterange(p_start_date, p_end_date, '[]')
      and not exists (
        select 1 from public.leave_records as rec
        where rec.request_id = r.id and rec.status = 'needs_revision'
      )
  ) then
    raise exception 'OVERLAPPING_REQUEST' using errcode = '22023';
  end if;

  insert into public.leave_requests (leave_type, start_date, end_date, substitute_note)
  values (p_leave_type, p_start_date, p_end_date, nullif(btrim(p_substitute_note), ''))
  returning id into v_request_id;

  insert into public.leave_records (request_id, position_id, kind, division_id)
  select v_request_id, p.id, p.kind, p.division_id
  from public.positions as p
  where p.id = any (p_position_ids) and p.employee_id = v_uid;

  get diagnostics v_count = row_count;
  if v_count = 0 or v_count <> cardinality(p_position_ids) then
    raise exception 'UNKNOWN_POSITION' using errcode = '22023';
  end if;

  return v_request_id;
end;
$$;
