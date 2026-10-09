import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runScript } from "./run-script";

// Тести працюють офлайн: «upstream» — локальний git-репозиторій із тегом,
// а SPEC_SOURCE_URL підміняє https://github.com/<owner>/<repo>.git.
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.test", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

let tmp: string;
let upstream: string;
let fork: string;

const write = (base: string, file: string, text: string) => {
  mkdirSync(path.dirname(path.join(base, file)), { recursive: true });
  writeFileSync(path.join(base, file), text);
};

const env = { SPEC_SOURCE_URL: "", GITHUB_REPOSITORY: "", SPEC_SOURCE_REQUIRED: "" };
const run = (cwd: string, extra: Record<string, string> = {}) =>
  runScript("check-spec-source.mjs", cwd, { ...env, SPEC_SOURCE_URL: upstream, ...extra });

beforeAll(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "spec-source-"));
  upstream = path.join(tmp, "upstream");
  mkdirSync(upstream);
  git(upstream, "init", "-q", "-b", "main");
  write(upstream, "product/vision.md", "# Vision\n");
  write(upstream, "openspec/specs/demo/spec.md", "# demo\n");
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", "spec");
  git(upstream, "tag", "spec-v0.1");
  fork = path.join(tmp, "fork");
  git(tmp, "clone", "-q", "--no-tags", upstream, fork);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("scripts/check-spec-source.mjs", () => {
  it("skips in the upstream itself when .spec-source is absent", () => {
    const { code, out } = run(upstream);
    expect(code).toBe(0);
    expect(out).toContain("SKIP");
  });

  it("skips when every line of .spec-source is commented out", () => {
    write(fork, ".spec-source", "# upstream: owner/team-repo\n# version: spec-v0.1\n");
    const { code, out } = run(fork);
    expect(code).toBe(0);
    expect(out).toContain("SKIP");
  });

  it("fails without .spec-source when SPEC_SOURCE_REQUIRED=1 (fork CI)", () => {
    const { code, out } = run(fork, { SPEC_SOURCE_REQUIRED: "1" });
    expect(code).toBe(1);
    expect(out).toContain("FAIL");
  });

  it("skips when upstream equals the current repository", () => {
    write(fork, ".spec-source", "upstream: pm-owner/team-repo\nversion: spec-v0.1\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "pm-owner/team-repo" });
    expect(code).toBe(0);
    expect(out).toContain("SKIP");
  });

  it("passes when product and canonical specs match the tag", () => {
    write(fork, ".spec-source", "upstream: pm-owner/team-repo # PM\nversion: spec-v0.1\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "dev-owner/team-repo" });
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });

  it("fails when the fork changed the canonical specs", () => {
    write(fork, "openspec/specs/demo/spec.md", "# demo (edited in the fork)\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "dev-owner/team-repo" });
    expect(code).toBe(1);
    expect(out).toContain("openspec/specs/demo/spec.md");
    expect(out).toContain("уже злитий");
    git(fork, "checkout", "--", "openspec/specs/demo/spec.md");
  });

  it("says the fork has not merged the tag yet when upstream released a newer spec", () => {
    // Розробник форкнув до релізу; PM потім змінив продукт і поставив новий тег.
    write(upstream, "product/vision.md", "# Vision v0.2\n");
    git(upstream, "commit", "-q", "-am", "spec v0.2");
    git(upstream, "tag", "spec-v0.2");
    write(fork, ".spec-source", "upstream: pm-owner/team-repo\nversion: spec-v0.2\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "dev-owner/team-repo" });
    expect(code).toBe(1);
    expect(out).toContain("product/vision.md");
    expect(out).toContain("ще не злитий");
    expect(out).toContain("git merge spec-v0.2");
    expect(out).not.toContain("уже злитий");
  });

  it("fails when the tag does not exist upstream", () => {
    write(fork, ".spec-source", "upstream: pm-owner/team-repo\nversion: spec-v9.9\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "dev-owner/team-repo" });
    expect(code).toBe(1);
    expect(out).toContain("spec-v9.9");
  });

  it("fails on a malformed version line", () => {
    write(fork, ".spec-source", "upstream: pm-owner/team-repo\nversion: v1\n");
    const { code, out } = run(fork, { GITHUB_REPOSITORY: "dev-owner/team-repo" });
    expect(code).toBe(1);
    expect(out).toContain("spec-vX.Y");
  });
});
