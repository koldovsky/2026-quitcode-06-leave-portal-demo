## Тип PR

<!-- Залиште один варіант. -->
- [ ] **Зміна специфікації** — PR в upstream PM: `product/`, `openspec/changes/` (від PM або пропозиція розробника)
- [ ] **Реалізація** — PR у форку розробника: код, міграції, тести, `docs/conformance.md`
- [ ] **Синхронізація** — гілка `sync/spec-vX.Y` у форку: merge нового тегу специфікації з upstream
  (зливати кнопкою **Create a merge commit**, не Squash і не Rebase — інакше тег не потрапить в історію `main`)

## Версія специфікації

<!-- Тег upstream, за яким зроблено цю роботу (як у .spec-source), напр. spec-v0.1. Для зміни спеки — id зміни OpenSpec. -->
spec-v

## AC, які покриває PR

<!-- Перелік AC ID і що з ними сталося. Питання до PM — посиланням на issue в upstream: owner/repo#N. -->
- AC-…: реалізовано / відкладено (причина)

## Що змінилось

<!-- 2–5 пунктів. Для міграцій — які таблиці й політики. -->

## Чекліст

- [ ] Одна зміна — один намір; для зміни спеки: `npm run spec:validate` і `npm run spec:check` зелені
- [ ] Назви тестів містять AC ID (`it("AC-…: …")`), пропущених тестів для «реалізовано» немає
- [ ] Рядки в `docs/conformance.md` оновлено в цьому ж PR; `npm run ac:coverage` зелений
- [ ] Кожна нова таблиця: `enable row level security`, `revoke all … from anon, authenticated`, явні `grant`, політика на кожну операцію `to authenticated` з `(select auth.uid())`
- [ ] `product/` і `openspec/specs/` у форку не змінювались (`npm run spec:source` зелений)
- [ ] Жодних секретів і справжніх даних: ключі лише в `.env.local` / Vercel / GitHub Secrets, дані — синтетичні (`*@example.test`)
- [ ] Preview на Vercel відкривається (для PR реалізації)

<!-- Публічні репозиторії з < 10 зірок CodeRabbit не рецензує автоматично.
Рев'ю запускає КОМЕНТАР у PR (не цей опис): після створення PR напишіть окремим коментарем рядок нижче. -->
Нагадування: окремим коментарем у PR — `@coderabbitai review`
