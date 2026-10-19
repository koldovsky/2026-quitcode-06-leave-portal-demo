# 0001. Дизайн-система: семантичні токени + shadcn/ui у коді + перевірка в CI

- Статус: прийнято
- Дата: 2026-10-19
- AC: — (вигляд усіх сторінок; поведінку AC не змінює)

## Контекст

- Сторінки зрізу WS6 стилізовано «як вийшло»: сирі палітри Tailwind (`zinc-*`, `amber-*`, `emerald-*`, `rose-*`),
  `font-family: Arial` у `globals.css`, у кожної сторінки свої класи кнопок і полів. `scripts/check-design-tokens.mjs`
  на `main` до цього рішення: 56 порушень у 5 файлах.
- Кожен новий зріз пише агент. Без правил він щоразу вигадує свої кольори й кнопки («три розробники — три різні
  кнопки»), а рев'ю цього не ловить.
- Є артефакт Claude Design System «Портал відсутностей — дизайн-система»
  (<https://claude.ai/artifact/DKnNcLTXjgeErK1FoZR6b4>): бренд-бук, `tokens.json` (OKLCH, світла й темна тема, статуси),
  компоненти. Стек фіксований: Next.js 16, Tailwind 4 через `@tailwindcss/turbopack` (без PostCSS-конфігу).
- Спайк 19.10.2026: `npx shadcn@latest init` (CLI 4.22.1, база Base UI, preset `base-nova`) працює на цьому
  налаштуванні; `init --dry-run` у CLI немає.

## Рішення

1. **Токени** — канонічні значення з артефакту в `src/app/globals.css`: `:root` + темна тема за
   `prefers-color-scheme` + `@theme inline` (утиліти `bg-primary`, `text-muted-foreground`, `bg-status-pending`…).
   Імена — як у shadcn/ui, плюс `status-pending|approved|returned` і `shadow-dialog`. `font-family: Arial` прибрано:
   шрифт — Geist з `next/font` (`--font-geist-sans` → `--font-sans`).
2. **Компоненти** — shadcn/ui у нашому коді (`src/components/ui/`, `components.json`): `button`, `input`, `label`,
   `card`, `table`, `badge`, `dialog`, `alert`, `native-select`. Підлаштовано під артефакт: варіанти `Badge`
   `pending`/`approved`/`returned`/`role`, радіуси, межа карток замість тіні, `shadow-dialog`, фокус `ring-2` з
   відступом, українські підписи. Шар сторінок — `src/app/_components/ui.tsx`.
3. **Правила для людей і агента** — `DESIGN.md` у корені (`CLAUDE.md` імпортує `@DESIGN.md`), короткий розділ в
   `AGENTS.md`.
4. **Перевірка** — `npm run check:design` (`scripts/check-design-tokens.mjs`): hex, довільні кольори в класах, сирі
   палітри й кольори в inline `style` поза `src/components/ui/` і `globals.css` — червоне. У CI — окремий workflow
   `.github/workflows/architecture.yml` (job «Дизайн-система: лише токени»), щоб не чіпати назви jobs `ci.yml`, на
   яких тримається ruleset. Усі сторінки мігровано в тому самому PR: на `main` перевірка зелена.

## Розглянуті варіанти

- **Лише токени без компонентів** — агент однаково збирає кнопку з класів щоразу по-різному; стани (фокус,
  disabled, aria-invalid) губляться.
- **Бібліотека компонентів з npm (не shadcn)** — вигляд і доступність у чужому коді, підлаштувати під токени
  важче; shadcn копіює компоненти в репо, і їх читає й змінює агент.
- **`--color-*: initial`** у `@theme` (прибрати стандартну палітру Tailwind) — тихо ламає наявні класи, а не показує
  їх; перевірка скриптом видима й має пояснення в кожному рядку.
- **Скіл `frontend-design` без обмежень** — штовхає до «виразного» власного стилю й не зважає на наявні токени; у
  проєкті з дизайн-системою йде проти неї.
- **Темна тема класом `.dark`** (як пропонує `shadcn init`) — потрібен перемикач і збереження вибору; у зрізі досить
  налаштування системи. Рядок `@custom-variant dark` з init не беремо.

## Наслідки

- Нова сторінка = компоненти з `@/components/ui` + семантичні утиліти; відхилення ловить CI до рев'ю.
- Залежності: `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn`
  (`@import "shadcn/tailwind.css"` — варіанти станів для Base UI).
- Зміна бренду — значення токенів у `globals.css` (і в артефакті), без правок сторінок.
- Оновлення компонента з реєстру shadcn (`add --overwrite`) затре наші підлаштування — порівнювати `--diff` і
  повертати правила з DESIGN.md.
