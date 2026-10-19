# DESIGN.md — дизайн-система «Портал відсутностей»

Правила вигляду інтерфейсу для людей і для агента. Джерело — артефакт Claude Design System
«Портал відсутностей — дизайн-система» (<https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4>: бренд-бук
`project/README.md`, `tokens.json`, компоненти). Код — `src/app/globals.css` (токени) і `src/components/ui/`
(shadcn/ui у нашому коді). Рішення й альтернативи — `docs/decisions/0001-design-system.md`.

## 1. Огляд

Портал — робочий інструмент школи: людина відкриває його між уроками. Інтерфейс спокійний і передбачуваний.

- **Одна головна дія на екран** — лише вона `Button` `default` (колір `primary`). Решта — `secondary`, `outline`, `ghost`.
- **Стан видно словом.** Статус і роль завжди мають підпис; колір лише підсилює слово.
- **Межі, а не тіні.** Картки й таблиці — `border` на `card`. Тінь `shadow-dialog` — лише діалоги й меню.
- **Без декору**: без градієнтів, емодзі, ілюстрацій. Порожній стан — одне речення й одна дія.
- **Лише токени.** Ніяких hex, `bg-[#…]`, `text-[oklch(…)]`, сирих палітр (`bg-zinc-900`, `text-rose-700`,
  `bg-white`) і кольорів в `style={{…}}`. Бракує кольору — новий токен (розділ 9), а не клас.

Тон текстів: українською, на «ви», коротко. Кнопка — дієслово з результатом («Запросити», «Скопіювати посилання»).
Після дії — підтвердження тим самим словом («Посилання скопійовано»). Помилка каже, що сталося і що робити, без
«Упс». Дати — `ДД.ММ.РРРР`, діапазон через « – ». Адреси в прикладах — лише `*@example.test`.

## 2. Кольори

Імена — семантичні й збігаються з shadcn/ui; значення OKLCH — у `src/app/globals.css` (`:root` і темна тема
`@media (prefers-color-scheme: dark)`; `@theme inline` робить з них утиліти `bg-*`, `text-*`, `border-*`).
Темна тема вмикається налаштуванням системи; варіант `dark:` Tailwind 4 теж слідує за нею.

| Токени | Утиліти | Коли |
|---|---|---|
| `background` / `foreground` | `bg-background`, `text-foreground` | тло сторінки й основний текст |
| `card` / `card-foreground` | `bg-card`, `text-card-foreground` | картки, таблиці |
| `popover` / `popover-foreground` | `bg-popover` | діалоги, випадні меню |
| `primary` / `primary-foreground` | `bg-primary text-primary-foreground`, `text-primary` | одна головна дія на екран, посилання, фокус-акцент |
| `secondary` / `secondary-foreground` | `bg-secondary text-secondary-foreground` | другорядні кнопки, бейдж ролі |
| `accent` / `accent-foreground` | `bg-accent text-accent-foreground` | hover, вибраний рядок, `Notice` `info` |
| `muted` / `muted-foreground` | `bg-muted`, `text-muted-foreground` | підписи, підказки, дати, порожні стани, шапка таблиці |
| `destructive` + `-foreground` | `bg-destructive text-destructive-foreground` (кнопка), `text-destructive`, `border-destructive` | незворотні дії й помилки (не статус «на доопрацюванні») |
| `border` | `border-border` (за замовчуванням для `border`) | декоративні межі карток і таблиць |
| `input` | `border-input` | межа полів вводу й select (≥ 3:1 до тла) |
| `ring` | `ring-ring` | кільце фокусу клавіатури |
| `status-pending` + `-foreground` | `bg-status-pending text-status-pending-foreground` | «на розгляді»; `Notice` `warning` |
| `status-approved` + `-foreground` | `bg-status-approved text-status-approved-foreground` | «схвалено»; `Notice` `success` |
| `status-returned` + `-foreground` | `bg-status-returned text-status-returned-foreground` | «на доопрацюванні» (повернуто) |

Прозорість токена (`bg-destructive/10`, `bg-muted/50`) — можна: це той самий токен.
Контраст перевірено в обох темах: текст ≥ 4.5:1 на своєму тлі; межа поля, фокус ≥ 3:1.

## 3. Типографіка

Шрифт — Geist (`font-sans`, змінна `--font-geist-sans` з `next/font` у `src/app/layout.tsx`), дати й ID — Geist Mono
(`font-mono`) з `tabular-nums`. Не більше двох насиченостей на екрані: 400 і 600 (500 — лише підписи полів і кнопки).

| Стиль | Класи | Де |
|---|---|---|
| page-title | `text-2xl font-semibold tracking-tight` | один на сторінку (`PageShell`) |
| section-title | `text-lg font-semibold` | заголовок розділу чи картки |
| body | `text-sm` | увесь інтерфейс |
| label | `text-sm font-medium` | підписи полів (`Label`), кнопки |
| caption | `text-xs text-muted-foreground` | підказки під полями |
| data | `font-mono text-[13px] tabular-nums` | дати й діапазони в списках і таблицях |

## 4. Відступи, сітка, радіуси

- Крок — 4px. Між полями форми — `gap-4`, усередині картки — `CardContent` (16px; відхилення від артефакту — розділ 11),
  між розділами — `gap-8`.
- Сторінка — одна колонка до 64rem (`max-w-5xl`), бічний відступ `px-4` на телефоні.
- `--radius` = 0.625rem: `rounded-md` — кнопки й поля; `rounded-lg` — картки, таблиці, діалоги; `rounded-sm` — бейджі.

## 5. Компоненти й варіанти

Лише з `@/components/ui` (shadcn/ui, база Base UI, `components.json`). Бракує — `npx shadcn@latest add <name>`, потім
підлаштуйте під ці правила (токени, радіуси, фокус) і допишіть сюди.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` | `default` · `secondary` · `outline` · `ghost` · `destructive` · `link`; розміри `sm` · `default` · `lg` | `default` — одна на екран; `outline` — «Скасувати», «Готово», дії в рядку таблиці (`border-input bg-card`); `ghost` — навігація, «Вийти»; hover `outline`/`ghost` — `accent`; `destructive` — суцільне `bg-destructive text-destructive-foreground`; посилання-кнопка — `buttonVariants()` на `<Link>`; кнопка форми — `SubmitButton` (`src/app/_components/submit-button.tsx`: «Надсилаємо…» + `disabled`) |
| `Badge` | `pending` · `approved` · `returned` · `role` (+ стандартні shadcn) | статус — через `StatusBadge` (крапка + слово): «на розгляді», «схвалено», «на доопрацюванні»; роль — `role` без крапки: «працівник», «менеджер», «адміністратор» (слова PM, малими — розділ 11) |
| `Input`, `NativeSelect`, `Label` | — | кожне поле з видимим `Label` (`Field` у `src/app/_components/ui.tsx`: `hint`, `error`; поле ставить `aria-describedby={fieldDescribedBy(id, { hint, error })}` і `aria-invalid`) |
| `Card` | — | межа `border`, без тіні |
| `Table` | — | шапка — `text-muted-foreground`; дані — стиль `data` |
| `Dialog` | — | `shadow-dialog`; заголовок `DialogTitle` — section-title (`text-lg font-semibold`); закривається Esc, кнопкою «Закрити» (X) і, де діалог показує результат, кнопкою «Готово» (`outline`) |
| `Alert` | — | основа для `Notice` |

Шар сторінок (`src/app/_components/ui.tsx`): `PageShell` (навігація + page-title), `StatusBadge`,
`Notice` (`success` · `warning` · `error` · `info`), `EmptyState`, `Field`.

## 6. Стани

- **Порожній:** `EmptyState` — `bg-muted` у межах картки (усередині `Card`, під списком), одне речення й одна дія.
- **Завантаження:** кнопка показує «Надсилаємо…» і `disabled` (`SubmitButton`); сторінка не стрибає.
- **Помилка:** помилка поля — текст під своїм полем у `text-destructive` (`role="alert"`), поле `aria-invalid`, зв'язок
  через `aria-describedby` (`Field` з `error`); у формі з клієнтським станом фокус переходить на перше поле з помилкою, а
  введене не зникає. Помилка всієї форми (не поля) — `Notice kind="error"` (`role="alert"`) над кнопкою.
- **Успіх:** `Notice kind="success"` (`role="status"`) тим самим словом, що й дія.
- **Немає доступу:** пояснення без технічних деталей і перехід на головну.

## 7. Доступність (мінімум)

- У кожного поля — видимий `<label>` (`Label htmlFor`); підказка й помилка — `aria-describedby`.
- Фокус видно завжди: `focus-visible:ring-2 ring-ring ring-offset-2`; `outline: none` без заміни заборонено. Поле з
  помилкою (`aria-invalid`) має межу `destructive`, а кільце фокусу — те саме `ring`: стандартні shadcn-класи
  `aria-invalid:ring-*` з `Input`, `NativeSelect`, `Button` прибрано, бо вони перекривали кільце фокусу.
- Контраст: текст ≥ 4.5:1, межі полів і фокус ≥ 3:1 — у межах токенів; нові кольори — лише з перевіркою.
- Статус ніколи не передається лише кольором: бейдж має слово (і крапку `aria-hidden`).
- Семантичний HTML понад `aria-*`: `<button>` для дій, `<a>`/`Link` для переходів, `<table>` для таблиць,
  `<nav aria-label>`, `<fieldset>`/`<legend>` для груп полів.

## 8. Do / Don't

| Do | Don't |
|---|---|
| `bg-primary text-primary-foreground` | `bg-[#0f6b6e]`, `bg-teal-700`, `style={{ color: "#fff" }}` |
| `text-muted-foreground` для підказок | `text-zinc-500`, `text-gray-500` |
| `<Badge variant="approved">` через `StatusBadge` | зелена крапка без слова |
| `Button variant="outline"` для другої дії | дві `default`-кнопки поруч |
| `Card` з `border` | `shadow-lg` на картці |
| `Notice kind="error"` з поясненням і дією | «Упс, щось пішло не так» |
| новий токен у `globals.css` | «тимчасовий» hex у сторінці |

## 9. Як додати новий токен

1. `src/app/globals.css`: значення в `:root` і в темній темі (`@media (prefers-color-scheme: dark)`) — обидва;
   пара тло + `-foreground`, якщо на ньому текст. Контраст ≥ 4.5:1 (текст) / ≥ 3:1 (межі) в обох темах.
2. Там само в `@theme inline`: `--color-<name>: var(--<name>);` — з'являться утиліти `bg-<name>`, `text-<name>`…
3. Рядок у таблицю розділу 2 цього файлу (коли використовувати) і в артефакт дизайн-системи.
4. `npm run check:design` — зелений.

`--color-*: initial` (прибрати стандартну палітру Tailwind) **не вмикаємо**: він мовчки ламає наявні класи, а не
показує їх. Видиму перевірку дає скрипт.

## 10. Перевірка

- `npm run check:design` (`scripts/check-design-tokens.mjs`) — червоний на hex, довільних кольорах у класах
  (`bg-[#…]`), сирих палітрах (`bg-zinc-900`, `bg-white`) і кольорах в inline `style` поза `src/components/ui/` і
  `globals.css`. Виняток — коментар `design-ok: <причина>` у тому самому рядку.
- У CI — job «Дизайн-система: лише токени» в `.github/workflows/architecture.yml` (окремо від `ci.yml`).
- Візуально — браузер агента (Claude Desktop Browser pane, Playwright MCP): зняти сторінку в світлій і темній темі й
  порівняти з цим файлом. Знімки «до/після» — `docs/demo/ws7/`.

## 11. Відхилення від артефакту (рішення)

Де код і цей файл свідомо відрізняються від артефакту Claude Design System, — тут, з причиною. Артефакт оновлюють
під ці рішення (або рішення змінюють тут), щоб агенти не отримували двох правил.

| Що | Артефакт | Код і цей файл | Чому |
|---|---|---|---|
| Слова бейджів | «На розгляді», «Схвалено», «Повернуто»; ролі з великої | «на розгляді», «схвалено», «на доопрацюванні»; «працівник», «менеджер», «адміністратор» | слова PM («Вигляд і тон» у `requirements/product.md`, AC); бейдж стоїть усередині речення й таблиці; тексти закріплені тестами |
| `Notice` `info` | `muted` | `accent` | `muted` уже мають порожній стан і шапка таблиці — повідомлення має відрізнятися від них |
| Відступ картки | `space-6` (24px) | 16px (`CardContent` shadcn) | щільні списки з телефона (PM: «списки щільні, але читаються з телефона») |
| Активний пункт навігації | `primary` | ще немає (і `aria-current` теж) | не встигли в цьому зрізі; де людина, поки видно із заголовка сторінки (page-title) |
