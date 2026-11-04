import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін 10 golden cases на безкоштовних моделях OpenRouter. НЕ входить у `npm test` і CI:
// жива модель недетермінована, а безкоштовний тариф — 20 запитів/хв і 50/день на акаунт.
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    // Лише змінні OPENROUTER_* з .env.local (решта секретів у прогін не потрапляє). Змінна, задана в оболонці, —
    // пріоритетніша за файл: `OPENROUTER_API_KEY= npm run eval` (bash) — гарантований прогін без ключа.
    env: loadEnv(mode, process.cwd(), "OPENROUTER_"),
    fileParallelism: false, // по одному запиту: 20 запитів/хв
    silent: false, // таблиця й pass rate — це console.table/console.info; без цього в конвеєрі (Out-File) їх не видно
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
}));
