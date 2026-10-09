-- Зміна розробника harden-leave-db: заявка без записів не зберігається — і в обхід сторінок теж.
-- Застосовані міграції 20261013… і 20261016… не редагуємо — лише нова.
--
-- Чому не revoke insert: submit_leave_request — security invoker, тож працює з правами користувача
-- і потребує GRANT insert на leave_requests. Прямий insert через Data API (POST /rest/v1/leave_requests)
-- без записів давав «вічну» заявку на розгляді, яку не видалити (політики delete немає) і яка блокувала
-- ті самі дати через OVERLAPPING_REQUEST (AC-LEAVE-11).
--
-- Відкладений constraint trigger перевіряє інваріант на COMMIT: функція подання вставляє заявку й записи
-- в одній транзакції — проходить; окремий запит Data API — це окрема транзакція — падає.

create or replace function private.require_leave_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Заявку могли видалити в тій самій транзакції — тоді перевіряти нічого.
  if not exists (select 1 from public.leave_requests as r where r.id = new.id) then
    return null;
  end if;
  if not exists (select 1 from public.leave_records as lr where lr.request_id = new.id) then
    raise exception 'REQUEST_WITHOUT_RECORDS'
      using errcode = '23514',
            hint = 'Подавайте заявку функцією public.submit_leave_request: вона вставляє заявку й записи разом.';
  end if;
  return null;
end;
$$;

revoke execute on function private.require_leave_records() from public, anon, authenticated;

create constraint trigger leave_requests_require_records
  after insert on public.leave_requests
  deferrable initially deferred
  for each row execute function private.require_leave_records();
