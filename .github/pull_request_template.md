## Тип PR

<!-- Залиште один варіант. Межі змін перевіряє CodeRabbit (перевірка «Тип PR і межі змін»). -->
- [ ] **Зміна специфікації** — гілка `spec/<id>` (продуктовий контекст — `product/context`): PM — `product/`, `openspec/` (зміна, archive), `product/CHANGELOG.md`
  і рядки нових AC у `docs/conformance.md` зі статусом «відкладено (новий AC — чекає задачі)»; техлід — `openspec/changes/impl-<зріз>/`
  (`design.md`, `tasks.md`); пропозиція розробника — `openspec/changes/<id>/`. Без `src/` і `supabase/`.
- [ ] **Реалізація задачі** — гілка `task/<N>-<коротко>`: `src/`, `supabase/migrations/`, тести, `docs/conformance.md`, `docs/decisions/`.
  Без `product/` і `openspec/specs/`.
- [ ] **Онбординг** — `docs/team.md` (рядок про себе), свій журнал `docs/spec-reading/<login>.md`, свій тестовий користувач у `supabase/demo-users.json`;
  PM — `docs/bootstrap.md`, `docs/img/`, `.github/CODEOWNERS` (день 0). Без коду.
- [ ] **Оновлення шаблону** — гілка `template/<коротко>`: `git cherry-pick` коміту шаблону курсу (README, «Оновлення шаблону»).

Closes #

<!-- Для задачі — номер issue «Задача» (Closes #12): після merge issue закриється само.
Для зміни специфікації — питання, на які вона відповідає (Closes #5); для онбордингу — рядок можна видалити. -->

## Версія специфікації

<!-- Тег, за яким зроблено роботу (spec-v0.1), або id зміни OpenSpec для PR зі спекою. -->
spec-v

## AC, які покриває PR

<!-- Перелік AC ID і що з ними сталося. Питання до PM — посиланням на issue: #N. -->
- AC-…: реалізовано / відкладено (причина)

## Що змінилось

<!-- 2–5 пунктів. Для міграцій — які таблиці й політики. -->

## Чекліст

- [ ] Одна зміна — один намір; гілка від свіжого `main`
- [ ] Тести з AC ID на початку назви (`it("AC-…: …")`), без `.skip` для «реалізовано»; `npm test` зелений
- [ ] Рядок `docs/conformance.md` для кожного AC оновлено в цьому ж PR; `npm run ac:coverage` зелений
- [ ] Міграція — лише новим файлом з `npx supabase migration new` у цьому PR; у прод її застосує CI (`db-deploy`) після merge.
  Жодного `supabase db push` з ноутбука, жодного DDL у SQL Editor; `db-check` зелений
- [ ] Кожна нова таблиця: `enable row level security`, `revoke all … from anon, authenticated`, явні `grant`, політика на кожну операцію `to authenticated` з `(select auth.uid())`
- [ ] Для зміни специфікації: `npm run spec:validate` і `npm run spec:check` зелені; для нових AC — рядки «відкладено (новий AC — чекає задачі)»
- [ ] Жодних секретів і справжніх даних: ключі лише в `.env.local` / Vercel / GitHub Environments, дані — синтетичні (`*@example.test`)
- [ ] Рев'юер — колега (не автор); для `product/`, `openspec/`, `.github/`, `supabase/migrations/` — власник із CODEOWNERS;
  після кожного push (виправлення, archive, Update branch) — новий approve; усі обговорення (і CodeRabbit) — Resolve
- [ ] Для реалізації задачі: `openspec/changes/impl-*/tasks.md` не змінено (крім archive в останньому PR зрізу)
- [ ] Preview на Vercel відкривається (для реалізації задачі); для останнього PR зрізу — запис екрана з прод-URL

<!-- Публічні репозиторії з < 10 зірок CodeRabbit не рецензує автоматично.
Рев'ю запускає КОМЕНТАР у PR (не цей опис): після створення PR напишіть окремим коментарем рядок нижче. -->
Нагадування: окремим коментарем у PR — `@coderabbitai review`
