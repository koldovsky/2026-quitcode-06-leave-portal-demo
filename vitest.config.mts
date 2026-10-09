import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite 8: аліас @/* з tsconfig.json без окремого плагіна.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    // tests/fixtures — дані для тестів скриптів; файли *.test.ts там НЕ запускаються.
    exclude: ["node_modules/**", "tests/fixtures/**"],
  },
});
