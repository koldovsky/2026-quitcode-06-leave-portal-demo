#!/usr/bin/env node
// Архітектурне правило «секретний ключ лише на сервері».
// 1) SUPABASE_SECRET_KEY / SERVICE_ROLE читається лише в src/lib/supabase/admin.ts і в scripts/ (поза src/).
// 2) src/lib/supabase/admin.ts починається з `import "server-only"`.
// 3) admin-клієнт (@/lib/supabase/admin) імпортують лише серверні файли: actions.ts, route.ts або файли з "use server".
//    Файл з "use client" не може його імпортувати. Увага: кожен експорт файлу з "use server" — публічний POST-ендпойнт,
//    його викликають напряму. Тому перевірка ролі (getClaims + роль з profiles) — ДО admin-клієнта. Скрипт її не бачить:
//    це тест і рев'ю. Не додавайте "use server" у допоміжний модуль, щоб пройти перевірку.
// 4) Жодної змінної NEXT_PUBLIC_*SECRET* / NEXT_PUBLIC_*SERVICE_ROLE* / NEXT_PUBLIC_*API_KEY — усе з NEXT_PUBLIC_
//    потрапляє в браузер.
// 5) (WS10) OPENROUTER_API_KEY читається лише в src/lib/request-draft/openrouter.ts, а той починається з
//    `import "server-only"`. Файл з "use client" не імпортує модулі моделі — лише @/lib/request-draft/state (ADR 0004).
// Шукає в src/. Якщо теки src/ немає — у app/, components/ і lib/ кореня (admin-клієнт — lib/supabase/admin.ts).
// Використання: node scripts/check-server-boundary.mjs [--root <dir>]
// Код виходу: 0 — порушень немає, 1 — є порушення, 2 — немає чого перевіряти (ні src/, ні app/, components/, lib/).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// Код у src/ — як у шаблоні проєкту. Інакше — теки Next.js у корені.
const hasSrc = isDir(join(root, "src"));
const BASES = hasSrc ? ["src"] : ["app", "components", "lib"].filter((d) => isDir(join(root, d)));
if (BASES.length === 0) {
  console.error(`check-server-boundary: у ${root} немає ні src/, ні app/, components/, lib/ — вкажіть --root <корінь проєкту>.`);
  process.exit(2);
}
const ADMIN_FILE = join(hasSrc ? "src" : "", "lib", "supabase", "admin.ts");
const ADMIN_SHOWN = ADMIN_FILE.split(sep).join("/");
const AI_FILE = join(hasSrc ? "src" : "", "lib", "request-draft", "openrouter.ts");
const AI_SHOWN = AI_FILE.split(sep).join("/");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const problems = [];
const report = (file, line, message) => problems.push(`${file.split(sep).join("/")}:${line}  ${message}`);

for (const file of BASES.flatMap((b) => walk(join(root, b)))) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const isClient = /^\s*["']use client["']/m.test(text);
  const isServerFile =
    /^\s*["']use server["']/m.test(text) || ["actions.ts", "route.ts"].includes(basename(file)) || rel === ADMIN_FILE;

  lines.forEach((line, i) => {
    if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|API_KEY)/.test(line)) {
      report(rel, i + 1, "NEXT_PUBLIC_ зі секретом — така змінна потрапить у браузер");
    }
    if (/SUPABASE_SECRET_KEY|SERVICE_ROLE_KEY/.test(line) && rel !== ADMIN_FILE) {
      report(rel, i + 1, `секретний ключ читається поза ${ADMIN_SHOWN}`);
    }
    if (/OPENROUTER_API_KEY/.test(line) && rel !== AI_FILE) {
      report(rel, i + 1, `ключ OpenRouter читається поза ${AI_SHOWN}`);
    }
    if (isClient && /from\s+["']@\/lib\/request-draft\/(openrouter|draft|extract|models)["']/.test(line)) {
      report(rel, i + 1, 'модуль моделі імпортовано у файлі з "use client" — клієнту лише @/lib/request-draft/state');
    }
    if (/from\s+["'](@\/lib\/supabase\/admin|(\.\.\/)+lib\/supabase\/admin|\.\/admin)["']/.test(line) && rel !== ADMIN_FILE) {
      if (isClient) report(rel, i + 1, 'admin-клієнт імпортовано у файлі з "use client"');
      else if (!isServerFile) {
        report(
          rel,
          i + 1,
          'admin-клієнт імпортовано не з actions.ts / route.ts / "use server" — викликайте його з Server Action чи Route ' +
            'Handler після перевірки ролі. Не додавайте "use server" у допоміжний модуль: кожен його експорт стане ' +
            "публічним ендпойнтом",
        );
      }
    }
  });
}

for (const [file, name] of [
  [ADMIN_FILE, "admin.ts"],
  [AI_FILE, "openrouter.ts"],
]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const first = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim() && !l.trim().startsWith("//"));
  if (!/^import\s+["']server-only["'];?$/.test(first?.trim() ?? "")) {
    report(file, 1, `${name} має починатися з import "server-only"`);
  }
}

if (!hasSrc) console.log(`check-server-boundary: теки src/ немає — перевіряю ${BASES.map((b) => `${b}/`).join(", ")}.`);
if (problems.length === 0) {
  console.log("check-server-boundary: OK — секретний ключ, admin-клієнт і ключ OpenRouter лише в серверному коді.");
  process.exit(0);
}
for (const p of problems) console.log(p);
console.log(`\ncheck-server-boundary: ${problems.length} порушень. Правило — docs/decisions і AGENTS.md (розділ «Секрети»).`);
process.exit(1);
