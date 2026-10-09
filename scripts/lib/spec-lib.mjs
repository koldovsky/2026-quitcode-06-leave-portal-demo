// Спільні утиліти для scripts/check-*.mjs. Без залежностей: лише node:fs і node:path.
// (Назви тестів розбирає scripts/lib/test-titles.mjs — йому потрібен devDependency `typescript`.)
// Корінь проєкту — поточна тека (process.cwd()), тому тести запускають скрипти у fixture-теках.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// AC ID: AC-<AREA>-<NN>, AREA = 2–12 великих латинських літер, NN = рівно дві цифри.
export const AC_ID = "AC-[A-Z]{2,12}-\\d{2}";
export const AC_ID_AT_START = new RegExp(`^${AC_ID}(?![\\w-])`);
export const AC_ID_GLOBAL = new RegExp(`(?<![\\w-])${AC_ID}(?![\\w-])`, "g");

export const root = () => process.cwd();

export function rel(file) {
  return path.relative(root(), file).split(path.sep).join("/");
}

export function readText(file) {
  return readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

// Рекурсивний обхід теки. skip(relPath) → true пропускає файл або теку.
export function walk(dir, { skip = () => false, filter = () => true } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const r = rel(full);
    if (skip(r)) continue;
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, { skip, filter }));
    } else if (filter(r)) {
      out.push(full);
    }
  }
  return out.sort();
}

export const isMarkdown = (r) => r.endsWith(".md");
export const isArchive = (r) => /^openspec\/changes\/archive(\/|$)/.test(r);

// Тип секції дельти: «## ADDED Requirements» → "ADDED" тощо; у канонічній специфікації — "".
export function deltaKind(section) {
  const m = section.match(/^(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\b/i);
  return m ? m[1].toUpperCase() : "";
}

// Розбір markdown-специфікації: сценарії (#### Scenario: …) і заголовки вимог (### Requirement: …)
// разом із секцією (## …), у якій вони стоять. removed = true для секції «## REMOVED Requirements».
export function parseSpecFile(file) {
  const lines = readText(file).split("\n");
  const scenarios = [];
  const requirements = [];
  let section = "";
  let requirement = null;
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      section = h2[1].trim();
      requirement = null;
    }
    const req = line.match(/^###\s+Requirement:\s*(.*)$/);
    if (req) {
      requirement = req[1].trim();
      requirements.push({ name: requirement, kind: deltaKind(section), line: i + 1 });
    }
    const scenario = line.match(/^(#{1,6})\s+Scenario:\s*(.*)$/);
    if (scenario) {
      scenarios.push({
        file,
        line: i + 1,
        level: scenario[1].length,
        title: scenario[2].trim(),
        kind: deltaKind(section),
        requirement,
        removed: deltaKind(section) === "REMOVED",
      });
    }
  });
  return { scenarios, requirements, text: lines.join("\n") };
}

export const parseScenarios = (file) => parseSpecFile(file).scenarios;

export function acIdOf(title) {
  const m = title.match(AC_ID_AT_START);
  return m ? m[0] : null;
}

// AC зі специфікацій: лише з назв сценаріїв, без секцій REMOVED.
export function collectSpecAcs(dir = path.join(root(), "openspec", "specs")) {
  const acs = new Map(); // id → [{file, line}]
  for (const file of walk(dir, { filter: isMarkdown })) {
    for (const s of parseScenarios(file)) {
      if (s.removed || s.level !== 4) continue;
      const id = acIdOf(s.title);
      if (!id) continue;
      if (!acs.has(id)) acs.set(id, []);
      acs.get(id).push({ file: rel(file), line: s.line });
    }
  }
  return acs;
}

export function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

// Рядки матриці docs/conformance.md: | AC-… | що перевіряє | код | тест | статус |
export function parseConformance(file = path.join(root(), "docs", "conformance.md")) {
  if (!existsSync(file)) return { exists: false, rows: [] };
  const rows = [];
  const lines = stripHtmlComments(readText(file)).split("\n");
  lines.forEach((line, i) => {
    if (!line.trim().startsWith("|")) return;
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    const id = cells[0]?.replace(/`/g, "");
    if (!id || !new RegExp(`^${AC_ID}$`).test(id)) return;
    rows.push({ id, status: cells[cells.length - 1] ?? "", cells, line: i + 1 });
  });
  return { exists: true, rows };
}

// Статус рядка матриці: рівно «реалізовано» або «відкладено (причина)» (регістр і `…` не важать).
// «Реалізовано частково», «реалізовано?» тощо — невідомий статус (BAD-STATUS), а не «реалізовано».
const normalizeStatus = (status) => status.replace(/`/g, "").trim().toLowerCase();
export const isImplemented = (status) => /^реалізовано$/.test(normalizeStatus(status));
export const isDeferred = (status) => /^відкладено\s*\(.*\S.*\)$/.test(normalizeStatus(status));

export function printList(label, items) {
  if (!items.length) return;
  console.log(`\n${label} (${items.length}):`);
  for (const item of items) console.log(`  - ${item}`);
}
