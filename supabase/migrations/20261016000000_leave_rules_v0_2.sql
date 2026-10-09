-- spec-v0.2 (зміна PM clarify-leave-rules; зміна розробника impl-clarify-leave-rules).
-- Застосовану міграцію 20261013000000_leave_requests.sql не редагуємо — лише нова.

-- AC-LEAVE-01 (Q4): заміна — необов'язковий вільний текст. Межа 200 символів — наше рішення (у спеці межі немає).
alter table public.leave_requests
  add column substitute_note text
  constraint leave_requests_substitute_note_check
  check (substitute_note is null or char_length(substitute_note) <= 200);

-- Колонкові GRANT додаються до наявних (leave_type, start_date, end_date).
grant insert (substitute_note) on table public.leave_requests to authenticated;
grant update (substitute_note) on table public.leave_requests to authenticated;

-- Нова сигнатура функції подання: + p_substitute_note. Стару видаляємо, щоб не лишилось двох перевантажень.
drop function public.submit_leave_request(text, date, date, uuid[]);

create function public.submit_leave_request(
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
  v_request_id uuid;
  v_count integer;
begin
  insert into public.leave_requests (leave_type, start_date, end_date, substitute_note)
  values (p_leave_type, p_start_date, p_end_date, nullif(btrim(p_substitute_note), ''))
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

revoke execute on function public.submit_leave_request(text, date, date, uuid[], text) from public, anon;
grant execute on function public.submit_leave_request(text, date, date, uuid[], text) to authenticated;
