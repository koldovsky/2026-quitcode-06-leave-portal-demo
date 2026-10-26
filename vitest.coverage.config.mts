import { defineConfig, mergeConfig } from "vitest/config";
// «.mjs», а не «.mts»: без allowImportingTsExtensions TypeScript (npm run typecheck, next build) не приймає імпорт
// з розширенням .mts, а «./vitest.config.mjs» і TypeScript, і Vite зводять до vitest.config.mts.
import base from "./vitest.config.mjs";

// Підлога покриття — лише для доменних файлів, які її вже тримають (кожен файл окремо, perFile).
// dates.ts, messages.ts, next-path.ts і records.ts поки нижче — їх видно в Summary; файл додаємо сюди, коли тести
// його піднімуть (храповик: підлогу не знижуємо). Загальний відсоток (≈32 %) не поріг: сторінки й server actions
// доводять тести бази (PGlite) та e2e, а не Vitest.
const FLOORED = [
  "leave/access",
  "leave/blocked-days",
  "leave/calendar",
  "leave/decisions",
  "leave/submission",
  "users/invite",
  "users/roles",
  "auth/confirm",
  "auth/password",
];

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        // Без include звіт показав би лише імпортовані тестами файли — сторінки з 0 % зникли б.
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/lib/supabase/database.types.ts", "src/components/ui/**"],
        // html — для людей (coverage/index.html), json-summary — для npm run coverage:summary, json — для інших інструментів.
        reporter: ["text", "html", "json-summary", "json"],
        reportOnFailure: true,
        thresholds: {
          [`src/lib/{${FLOORED.join(",")}}.ts`]: { statements: 90, branches: 85, functions: 90, lines: 90, perFile: true },
        },
      },
    },
  }),
);
