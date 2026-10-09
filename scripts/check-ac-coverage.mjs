#!/usr/bin/env node
// npm run ac:coverage — наскрізне покриття критеріїв приймання (AC):
//   спека (openspec/specs/**) → рядок матриці (docs/conformance.md) → тест (назва test()/it() у src/** або tests/**).
// FAIL, якщо:
//   NO-ROW     — AC є в специфікаціях, але в docs/conformance.md немає рядка (дрейф після синхронізації спеки);
//   MISSING    — рядок має статус «реалізовано», але немає непропущеного тесту з цим ID у назві
//                (закоментовані тести, .skip/.todo/.fails/.skipIf і тести всередині describe.skip не рахуються;
//                it.each / test.for / .concurrent / .runIf — рахуються);
//   ORPHAN     — тест посилається на AC, якого немає в специфікаціях;
//   BAD-STATUS — статус рядка не рівно «реалізовано» і не «відкладено (причина)»
//                («реалізовано частково» — теж BAD-STATUS: або реалізовано повністю, або відкладено з причиною).
// Попередження (не валить): рядок матриці для AC, якого вже немає в специфікаціях; дублікати рядків.
// Секції «## REMOVED Requirements» ігноруються. Скрипт перевіряє НАЯВНІСТЬ тесту, а не те, що він зелений:
// це робить `npm test`.
import { collectSpecAcs, isDeferred, isImplemented, parseConformance, printList } from "./lib/spec-lib.mjs";
import { collectTestRefs } from "./lib/test-titles.mjs";

const specAcs = collectSpecAcs();
const { exists: matrixExists, rows } = parseConformance();
const testRefs = collectTestRefs();

const rowsById = new Map();
for (const row of rows) {
  if (!rowsById.has(row.id)) rowsById.set(row.id, []);
  rowsById.get(row.id).push(row);
}

const noRow = [];
const missing = [];
const orphan = [];
const badStatus = [];
const staleRows = [];
const duplicateRows = [];

for (const [id, places] of specAcs) {
  if (!rowsById.has(id)) noRow.push(`${id} (${places[0].file}:${places[0].line})`);
}

for (const [id, list] of rowsById) {
  if (list.length > 1) duplicateRows.push(`${id} — рядки ${list.map((r) => r.line).join(", ")}`);
  if (!specAcs.has(id)) staleRows.push(`${id} — docs/conformance.md:${list[0].line}`);
  for (const row of list) {
    if (isImplemented(row.status)) {
      const covered = (testRefs.get(id) ?? []).some((t) => t.counted);
      if (!covered) {
        const skipped = (testRefs.get(id) ?? []).filter((t) => !t.counted);
        const hint = skipped.length ? ` (є лише пропущені: ${skipped.map((t) => `${t.file}:${t.line}`).join(", ")})` : "";
        missing.push(`${id} — статус «реалізовано», але тесту з «${id}» у назві немає${hint}`);
      }
    } else if (!isDeferred(row.status)) {
      badStatus.push(`${id} — docs/conformance.md:${row.line}: «${row.status}» (дозволено: реалізовано / відкладено (причина))`);
    }
  }
}

for (const [id, list] of testRefs) {
  if (!specAcs.has(id)) orphan.push(`${id} — ${list.map((t) => `${t.file}:${t.line}`).join(", ")}`);
}

const implemented = rows.filter((r) => isImplemented(r.status)).length;
console.log(
  `ac:coverage — AC у специфікаціях: ${specAcs.size}, рядків у матриці: ${rows.length}` +
    `${matrixExists ? "" : " (docs/conformance.md не знайдено)"}, «реалізовано»: ${implemented}, ` +
    `AC у назвах тестів: ${testRefs.size}`,
);
printList("NO-ROW: AC зі специфікації без рядка в docs/conformance.md", noRow);
printList("MISSING: «реалізовано» без тесту з AC ID у назві", missing);
printList("ORPHAN: тест посилається на AC, якого немає в специфікаціях", orphan);
printList("BAD-STATUS: невідомий статус у матриці", badStatus);
printList("WARN stale: рядок матриці для AC, якого немає в специфікаціях", staleRows);
printList("WARN duplicate: кілька рядків для одного AC", duplicateRows);

const failures = noRow.length + missing.length + orphan.length + badStatus.length;
if (failures) {
  console.log(`\nFAIL: проблем — ${failures}. Оновіть docs/conformance.md і тести.`);
  process.exit(1);
}
console.log(specAcs.size ? "OK" : "OK (специфікацій ще немає — порожній шаблон)");
