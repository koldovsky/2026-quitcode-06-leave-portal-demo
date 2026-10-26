### Покриття коду тестами (Vitest, v8)

Разом: рядки 32 % (146 з 456), гілки 26 %. Покриття показує, який код виконався, а не що перевірено: силу тестів міряє мутаційне тестування (`npm run mutation:ts` — TS, `npm run mutation:sql` — правила в SQL).

| Шар | Файл | Рядки | Гілки | Функції |
|---|---|---|---|---|
| домен (unit) | `src/lib/leave/messages.ts` | 0 % | 0 % | 0 % |
| домен (unit) | `src/lib/leave/dates.ts` | 81 % | 100 % | 66 % |
| домен (unit) | `src/lib/auth/next-path.ts` | 90 % | 92 % | 100 % |
| домен (unit) | `src/lib/auth/confirm.ts` | 100 % | 100 % | 100 % |
| домен (unit) | `src/lib/auth/password.ts` | 100 % | 100 % | 100 % |
| домен (unit) | `src/lib/leave/access.ts` | 100 % | 100 % | 100 % |
| домен (unit) | `src/lib/leave/blocked-days.ts` | 100 % | — | 100 % |
| домен (unit) | `src/lib/leave/calendar.ts` | 100 % | 100 % | 100 % |
| домен (unit) | `src/lib/leave/decisions.ts` | 100 % | 96 % | 100 % |
| домен (unit) | `src/lib/leave/records.ts` | 100 % | 75 % | 100 % |
| домен (unit) | `src/lib/leave/submission.ts` | 100 % | 95 % | 100 % |
| домен (unit) | `src/lib/leave/types.ts` | 100 % | — | 100 % |
| домен (unit) | `src/lib/users/invite.ts` | 100 % | 96 % | 100 % |
| домен (unit) | `src/lib/users/roles.ts` | 100 % | 92 % | 100 % |
| сторінки й дії (PGlite, e2e) | `src/app/_components/ui.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/account/password/actions.ts` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/account/password/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/admin/users/actions.ts` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/admin/users/copy-link-button.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/admin/users/invite-dialog.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/admin/users/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/layout.tsx` | 0 % | — | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/login/actions.ts` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/login/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/manage/actions.ts` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/manage/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/requests/actions.ts` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/requests/new/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/requests/page.tsx` | 0 % | 0 % | 0 % |
| сторінки й дії (PGlite, e2e) | `src/app/auth/confirm/actions.ts` | 16 % | — | 0 % |
| адаптери, інше (e2e) | `src/lib/supabase/admin.ts` | 0 % | 0 % | 0 % |
| адаптери, інше (e2e) | `src/lib/supabase/client.ts` | 0 % | — | 0 % |
| адаптери, інше (e2e) | `src/lib/supabase/proxy.ts` | 0 % | 0 % | 0 % |
| адаптери, інше (e2e) | `src/lib/supabase/server.ts` | 0 % | — | 0 % |
| адаптери, інше (e2e) | `src/lib/supabase/viewer.ts` | 0 % | 0 % | 0 % |
| адаптери, інше (e2e) | `src/lib/utils.ts` | — | — | — |
| адаптери, інше (e2e) | `src/proxy.ts` | 0 % | — | 0 % |
