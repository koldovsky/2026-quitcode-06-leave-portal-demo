#!/usr/bin/env node
// npm run spec:check — детерміновані перевірки специфікацій, яких не робить `openspec validate`:
//   1) кожен `#### Scenario:` в openspec/specs/** і openspec/changes/** (крім archive/)
//      починається з AC ID формату AC-<AREA>-<NN>;
//   2) сценарій з неправильним рівнем заголовка (### Scenario:) — помилка (OpenSpec його мовчки ігнорує);
//   3) AC ID унікальні в канонічних специфікаціях (openspec/specs/**);
//   3b) кожна активна зміна (openspec/changes/<id>, крім archive/) після archive не дасть дубля AC ID:
//      той самий ID двічі в зміні, ADDED-ID, який уже є в openspec/specs, MODIFIED-сценарій з ID чужої вимоги;
//      і дві активні зміни не вводять той самий новий ID;
//   4) жодне слово зі списку заборонених (product/denylist.txt + локальний product/denylist.local.txt
//      + змінна середовища SPEC_DENYLIST)
//      не трапляється в product/ і openspec/ (без урахування регістру; збіг за ПОЧАТКОМ слова, тож
//      «Контосо» ловить і «Контосо», і «Контосою», і «Контосо-офіс»).
// Код виходу: 0 — усе гаразд, 1 — є помилки.
import { existsSync } from "node:fs";
import path from "node:path";
import {
  acIdOf,
  isArchive,
  isMarkdown,
  parseScenarios,
  parseSpecFile,
  printList,
  readText,
  rel,
  root,
  walk,
} from "./lib/spec-lib.mjs";

const errors = { title: [], level: [], duplicate: [], changeDuplicate: [], denylist: [] };
const specsDir = path.join(root(), "openspec", "specs");
const changesDir = path.join(root(), "openspec", "changes");

// 1–2. Назви й рівні сценаріїв.
const files = [
  ...walk(specsDir, { filter: isMarkdown }),
  ...walk(changesDir, { filter: isMarkdown, skip: isArchive }),
];
let scenarioCount = 0;
for (const file of files) {
  for (const s of parseScenarios(file)) {
    const where = `${rel(file)}:${s.line}`;
    if (s.level !== 4) {
      errors.level.push(`${where} — "${"#".repeat(s.level)} Scenario:" має бути "#### Scenario:"`);
      continue;
    }
    scenarioCount++;
    if (!acIdOf(s.title)) {
      errors.title.push(`${where} — "${s.title}" не починається з AC-<AREA>-<NN> (напр. AC-LEAVE-01: …)`);
    }
  }
}

// 3. Унікальність AC ID у канонічних специфікаціях.
const seen = new Map();
for (const file of walk(specsDir, { filter: isMarkdown })) {
  for (const s of parseScenarios(file)) {
    const id = s.level === 4 ? acIdOf(s.title) : null;
    if (!id) continue;
    const where = `${rel(file)}:${s.line}`;
    if (seen.has(id)) errors.duplicate.push(`${id} — ${where} (уже є в ${seen.get(id)})`);
    else seen.set(id, where);
  }
}

// 3b. Активні зміни: чи не з'явиться дубль AC ID після archive.
// Моделюємо archive кожної зміни поверх openspec/specs: RENAMED → REMOVED → MODIFIED → ADDED (блок вимоги
// замінюється цілком), потім шукаємо ID, що трапляється більше одного разу. MODIFIED/REMOVED законно
// повторюють канонічні ID своєї ж вимоги — це не дубль.
const capOf = (file, base) => path.relative(base, path.dirname(file)).split(path.sep).join("/");
const reqKey = (cap, name) => `${cap}\u0000${name ?? ""}`;
function blocksOf(parsed, kind) {
  // { requirement → [{id, where}] } для секції kind ("" — канонічна специфікація).
  const blocks = new Map();
  for (const r of parsed.requirements) if (r.kind === kind) blocks.set(r.name, []);
  for (const s of parsed.scenarios) {
    if (s.kind !== kind || s.level !== 4 || s.requirement === null) continue;
    const id = acIdOf(s.title);
    if (!id) continue;
    if (!blocks.has(s.requirement)) blocks.set(s.requirement, []);
    blocks.get(s.requirement).push({ id, where: `${rel(s.file)}:${s.line}` });
  }
  return blocks;
}
function renamesOf(text) {
  // ## RENAMED Requirements: пари «- FROM: `### Requirement: Стара`» / «- TO: `### Requirement: Нова`».
  const pairs = [];
  let inRenamed = false;
  let from = null;
  const clean = (v) => v.replace(/`/g, "").replace(/^#+\s*Requirement:\s*/i, "").trim();
  for (const line of text.split("\n")) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) inRenamed = /^RENAMED\s+Requirements/i.test(h2[1].trim());
    if (!inRenamed) continue;
    const m = line.match(/^\s*-?\s*\**(FROM|TO)\**:\s*(.+)$/i);
    if (!m) continue;
    if (m[1].toUpperCase() === "FROM") from = clean(m[2]);
    else if (from !== null) {
      pairs.push([from, clean(m[2])]);
      from = null;
    }
  }
  return pairs;
}

const canonical = new Map(); // reqKey → [{id, where}]
for (const file of walk(specsDir, { filter: isMarkdown })) {
  const cap = capOf(file, specsDir);
  for (const [name, list] of blocksOf(parseSpecFile(file), "")) canonical.set(reqKey(cap, name), list);
}
const canonicalIds = new Set([...canonical.values()].flat().map((x) => x.id));
const introducedBy = new Map(); // новий ID → [{change, where}]
const changeNames = existsSync(changesDir)
  ? walk(changesDir, { filter: isMarkdown, skip: isArchive })
      .map((f) => path.relative(changesDir, f).split(path.sep)[0])
      .filter((v, i, all) => all.indexOf(v) === i)
  : [];
for (const change of changeNames) {
  const changeSpecs = path.join(changesDir, change, "specs");
  const state = new Map([...canonical].map(([k, v]) => [k, [...v]]));
  const touched = [];
  for (const file of walk(changeSpecs, { filter: isMarkdown })) {
    const cap = capOf(file, changeSpecs);
    const parsed = parseSpecFile(file);
    for (const [from, to] of renamesOf(parsed.text)) {
      if (!state.has(reqKey(cap, from))) continue;
      state.set(reqKey(cap, to), state.get(reqKey(cap, from)));
      state.delete(reqKey(cap, from));
    }
    for (const name of blocksOf(parsed, "REMOVED").keys()) state.delete(reqKey(cap, name));
    for (const kind of ["MODIFIED", "ADDED"]) {
      for (const [name, list] of blocksOf(parsed, kind)) {
        state.set(reqKey(cap, name), list);
        touched.push(...list);
      }
    }
  }
  const touchedWhere = new Set(touched.map((x) => x.where));
  const byId = new Map();
  for (const x of [...state.values()].flat()) {
    if (!byId.has(x.id)) byId.set(x.id, []);
    byId.get(x.id).push(x.where);
  }
  for (const [id, wheres] of byId) {
    if (wheres.length < 2 || !wheres.some((w) => touchedWhere.has(w))) continue;
    errors.changeDuplicate.push(`${id} — після archive зміни ${change} буде в кількох місцях: ${wheres.join(", ")}`);
  }
  for (const x of touched) {
    if (canonicalIds.has(x.id)) continue;
    if (!introducedBy.has(x.id)) introducedBy.set(x.id, []);
    const list = introducedBy.get(x.id);
    if (!list.some((y) => y.change === change)) list.push({ change, where: x.where });
  }
}
for (const [id, list] of introducedBy) {
  if (list.length > 1) {
    errors.changeDuplicate.push(
      `${id} — новий ID вводять кілька активних змін: ${list.map((x) => `${x.change} (${x.where})`).join(", ")}`,
    );
  }
}

// 4. Denylist — три джерела (рядки, # — коментар):
//    product/denylist.txt        — публічний: внутрішні слова, які не мають потрапити в специфікації;
//    product/denylist.local.txt  — ЛОКАЛЬНИЙ, у .gitignore: справжні назви клієнтів на машині PM;
//    SPEC_DENYLIST               — секрет CI (через кому або з нового рядка): ті самі назви для GitHub Actions.
//    Справжні назви клієнтів у публічному репо — лише в локальному файлі й секреті: інакше сам файл стане витоком.
//    Значення з локального файлу й секрету не друкуємо (екран можуть бачити інші — демонстрація, запис).
const DENYLIST_FILES = [
  { file: "product/denylist.txt", secret: false },
  { file: "product/denylist.local.txt", secret: true },
];
const words = []; // { word, source, secret }
for (const { file, secret } of DENYLIST_FILES) {
  const full = path.join(root(), ...file.split("/"));
  if (!existsSync(full)) continue;
  for (const raw of readText(full).split("\n")) {
    const word = raw.trim();
    if (word && !word.startsWith("#")) words.push({ word, source: file, secret });
  }
}
for (const raw of (process.env.SPEC_DENYLIST ?? "").split(/[\n,]/)) {
  if (raw.trim()) words.push({ word: raw.trim(), source: "SPEC_DENYLIST", secret: true });
}
if (words.length) {
  const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const secretIndex = new Map(); // джерело → лічильник
  const patterns = words.map(({ word, source, secret }) => {
    const n = (secretIndex.get(source) ?? 0) + 1;
    if (secret) secretIndex.set(source, n);
    return {
      // Збіг за початком слова (без межі в кінці): у тексті українською назви відмінюються,
      // тож «Контосо» має ловити й «Контосою». Ціна — «Контосовіль» теж збіг (перефразуйте).
      re: new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}`, "iu"),
      // Секретні значення не друкуємо — лише номер слова в його джерелі.
      label: secret ? `слово #${n} із ${source}` : `"${word}"`,
    };
  });
  const denylistPaths = new Set(DENYLIST_FILES.map((d) => d.file));
  const scanned = [
    ...walk(path.join(root(), "product"), { skip: (r) => denylistPaths.has(r) }),
    ...walk(path.join(root(), "openspec")),
  ];
  for (const file of scanned) {
    readText(file)
      .split("\n")
      .forEach((line, i) => {
        for (const p of patterns) {
          if (p.re.test(line)) errors.denylist.push(`${rel(file)}:${i + 1} — ${p.label}`);
        }
      });
  }
}

const total = Object.values(errors).reduce((n, list) => n + list.length, 0);
console.log(
  `spec:check — markdown-файлів: ${files.length}, сценаріїв: ${scenarioCount}, ` +
    `AC у канонічних специфікаціях: ${seen.size}, слів у denylist: ${words.length}`,
);
printList("BAD-TITLE: сценарій без AC ID на початку назви", errors.title);
printList("BAD-LEVEL: неправильний рівень заголовка сценарію", errors.level);
printList("DUPLICATE: AC ID повторюється в openspec/specs", errors.duplicate);
printList("DUPLICATE-CHANGE: активна зміна дасть дубль AC ID після archive", errors.changeDuplicate);
printList("DENYLIST: заборонене слово (анонімізація)", errors.denylist);
if (total) {
  console.log(`\nFAIL: помилок — ${total}.`);
  process.exit(1);
}
console.log("OK");
