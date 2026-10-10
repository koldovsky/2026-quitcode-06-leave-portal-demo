#!/usr/bin/env node
// npm run spec:source — у ФОРКУ розробника перевіряє, що product/ і openspec/specs/ збігаються
// з тегом специфікації в upstream PM, записаним у .spec-source:
//
//   upstream: <owner>/<repo>      # репозиторій PM (публічний)
//   version: spec-v0.1            # тег релізу специфікації
//
// Кроки: git fetch https://github.com/<owner>/<repo>.git refs/tags/<version> →
//        git diff --quiet <version> -- product openspec/specs
// У самому upstream (немає .spec-source, усі рядки закоментовані або upstream == цей репозиторій)
// перевірку пропускаємо з повідомленням (у GitHub Actions — з попередженням). SPEC_SOURCE_REQUIRED=1 робить
// відсутній .spec-source помилкою (вмикайте в CI форку, коли перший тег спеки вже є). SPEC_SOURCE_URL перевизначає адресу (тести, дзеркала).
// SPEC_SOURCE_IN_FORK=1 (job conformance) — FAIL, якщо upstream — сам форк або спека вже у форку, а .spec-source закоментований.
// Після OK — попередження (не помилка), якщо в upstream уже є новіший тег spec-vX.Y, ніж у .spec-source.
import { execFileSync } from "node:child_process";
import fs, { existsSync } from "node:fs";
import path from "node:path";
import { readText, root } from "./lib/spec-lib.mjs";

const PATHS = ["product", "openspec/specs"];

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: root(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function skip(reason, { requiredInFork = false } = {}) {
  if (requiredInFork && process.env.SPEC_SOURCE_REQUIRED === "1") {
    fail(`${reason} У форку .spec-source обов'язковий: upstream і тег версії специфікації.`);
  }
  console.log(`spec:source — SKIP: ${reason}`);
  // У GitHub Actions форку — помітне попередження: до першого тегу spec-v0.1 це нормально.
  if (requiredInFork && process.env.GITHUB_ACTIONS === "true") {
    console.log(`::warning title=spec:source::${reason} Заповніть .spec-source після першого релізу специфікації.`);
  }
  process.exit(0);
}

function fail(message) {
  console.log(`spec:source — FAIL: ${message}`);
  process.exit(1);
}

function parseSpecSource(file) {
  const values = {};
  for (const raw of readText(file).split("\n")) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([a-z_]+)\s*:\s*["']?([^"']*)["']?$/i);
    if (m) values[m[1]] = m[2].trim();
  }
  return values;
}

function ownRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = git(["remote", "get-url", "origin"]).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const file = path.join(root(), ".spec-source");
if (!existsSync(file)) skip("файлу .spec-source немає (upstream PM або форк ще не налаштовано).", { requiredInFork: true });

const { upstream, version } = parseSpecSource(file);
const inFork = process.env.SPEC_SOURCE_IN_FORK === "1";
const hasSpecs = () => {
  const dir = path.join(root(), "openspec", "specs");
  return existsSync(dir) && fs.readdirSync(dir, { recursive: true }).some((p) => String(p).endsWith("spec.md"));
};
if (!upstream && !version) {
  // У CI форку (job conformance задає SPEC_SOURCE_IN_FORK=1): спека вже у форку — .spec-source мусить бути заповнений.
  if (inFork && hasSpecs()) fail(".spec-source закоментований, а openspec/specs/ уже містить спеку. Розкоментуйте upstream і version (крок 10 розробника).");
  skip(".spec-source порожній або закоментований (upstream PM або форк до першого релізу спеки).", { requiredInFork: true });
}
if (!upstream || !/^[\w.-]+\/[\w.-]+$/.test(upstream)) fail(`у .spec-source потрібен рядок "upstream: <owner>/<repo>", а є "${upstream ?? ""}".`);
if (!version || !/^spec-v\d+\.\d+$/.test(version)) fail(`у .spec-source потрібен рядок "version: spec-vX.Y", а є "${version ?? ""}".`);

const own = ownRepo();
if (own && own.toLowerCase() === upstream.toLowerCase()) {
  // У CI форку upstream не може бути самим форком.
  if (inFork) fail(`upstream у .spec-source — це сам форк (${own}). Вкажіть репозиторій PM.`);
  if (process.env.SPEC_SOURCE_REQUIRED === "1") {
    fail(`у .spec-source upstream: ${upstream} — це сам цей репозиторій. У форку вкажіть репозиторій PM: "upstream: <pm>/<team-repo>".`);
  }
  skip(`це сам upstream (${own}).`);
}

const url = process.env.SPEC_SOURCE_URL || `https://github.com/${upstream}.git`;
try {
  git(["fetch", "--quiet", "--no-tags", "--force", url, `refs/tags/${version}:refs/tags/${version}`]);
} catch (e) {
  fail(`не вдалося отримати тег ${version} з ${url}. Чи опубліковано тег і чи репозиторій публічний?\n${e.stderr ?? e.message}`);
}

try {
  git(["diff", "--quiet", version, "--", ...PATHS]);
} catch (e) {
  if (e.status === 1) {
    const stat = git(["diff", "--stat", version, "--", ...PATHS]);
    const sync =
      `Синхронізація: git fetch upstream --tags → git switch -c sync/${version} → git merge --no-edit ${version} ` +
      `→ рядки нових AC у docs/conformance.md → PR у форку.`;
    // Чи тег уже злитий у цю гілку? 1 — ні (форк просто ще не синхронізовано), 0 — так (файли змінено у форку).
    let merged = null;
    try {
      git(["merge-base", "--is-ancestor", version, "HEAD"]);
      merged = true;
    } catch (err) {
      if (err.status === 1) merged = false;
    }
    const reason =
      merged === false
        ? `Тег ${version} ще не злитий у цю гілку — форк не синхронізовано з upstream. ${sync}`
        : merged === true
          ? `Тег ${version} уже злитий. Щойно злили новіший тег (гілка sync/spec-vX.Y)? Оновіть version у .spec-source. ` +
            `Інакше ці файли змінено у форку. product/ і openspec/specs змінює лише PM ` +
            `в upstream: поверніть їх (git checkout ${version} -- ${PATHS.join(" ")}), а пропозицію — PR-ом в upstream.`
          : `Або форк ще не злив тег ${version} (${sync}), або ці файли змінено у форку ` +
            `(product/ і openspec/specs змінює лише PM в upstream).`;
    fail(`${PATHS.join(" і ")} відрізняються від ${upstream}@${version}:\n${stat}\n${reason}`);
  }
  fail(`git diff завершився з помилкою: ${e.stderr ?? e.message}`);
}

console.log(`spec:source — OK: ${PATHS.join(" і ")} збігаються з ${upstream}@${version}.`);

// Новіша версія спеки в upstream? Лише попередження (не помилка): синхронізація — окремим PR sync/spec-vX.Y,
// а без цього рядка форк на старому тезі лишається зеленим і ніхто не помічає, що PM уже випустив нову версію.
const num = (tag) => tag.replace(/^spec-v/, "").split(".").map(Number);
const isNewer = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);
try {
  const latest = git(["ls-remote", "--tags", "--refs", url, "refs/tags/spec-v*"])
    .split("\n")
    .map((line) => line.split("refs/tags/")[1]?.trim())
    .filter((tag) => tag && /^spec-v\d+\.\d+$/.test(tag))
    .reduce((best, tag) => (isNewer(num(tag), num(best)) ? tag : best), version);
  if (latest !== version) {
    const msg = `в ${upstream} уже є ${latest}, а .spec-source вказує ${version}. Синхронізуйтесь: гілка sync/${latest} (README, «Шлях розробника», крок 8).`;
    console.log(`spec:source — УВАГА: ${msg}`);
    if (process.env.GITHUB_ACTIONS === "true") console.log(`::warning title=spec:source::${msg}`);
  }
} catch {
  // ls-remote недоступний (мережа) — перевірку новішої версії пропускаємо, основна вже пройшла.
}
