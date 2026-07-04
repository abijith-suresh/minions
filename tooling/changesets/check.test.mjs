import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const adapter = fileURLToPath(new URL("./check.mjs", import.meta.url));

function useRepository() {
  const root = mkdtempSync(join(tmpdir(), "minions-changeset-policy-"));

  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };

  const write = (path, content) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };

  git("init", "--quiet");
  git("config", "user.email", "policy@example.com");
  git("config", "user.name", "Policy Test");
  write("README.md", "initial\n");
  git("add", "-A");
  git("commit", "--quiet", "-m", "initial");

  return {
    root,
    git,
    write,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function run(root, ...args) {
  return spawnSync(process.execPath, [adapter, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("fails a source change without a changeset", () => {
  const repository = useRepository();
  try {
    repository.write("packages/opencode/src/server.ts", "export {}\n");
    repository.git("add", "-A");
    repository.git("commit", "--quiet", "-m", "change source");

    const result = run(repository.root, "--base", "HEAD~1", "--head", "HEAD");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /npm run changeset/);
    assert.match(result.stderr, /packages\/opencode\/src\/server\.ts/);
  } finally {
    repository.cleanup();
  }
});

test("passes a source change with a patch changeset", () => {
  const repository = useRepository();
  try {
    repository.write("packages/opencode/src/server.ts", "export {}\n");
    repository.write(
      ".changeset/fix.md",
      '---\n"@abijith-suresh/minions-opencode": patch\n---\nFix delegation.\n',
    );
    repository.git("add", "-A");
    repository.git("commit", "--quiet", "-m", "change source");

    const result = run(repository.root, "--base", "HEAD~1", "--head", "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /valid patch changeset/);
  } finally {
    repository.cleanup();
  }
});

test("passes a documentation-only change", () => {
  const repository = useRepository();
  try {
    repository.write("README.md", "updated\n");
    repository.git("add", "-A");
    repository.git("commit", "--quiet", "-m", "update docs");

    const result = run(repository.root, "--base", "HEAD~1", "--head", "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no releasable package paths changed/);
  } finally {
    repository.cleanup();
  }
});

test("passes package test and repository-tooling changes", () => {
  const repository = useRepository();
  try {
    repository.write("packages/opencode/test/packed-package.mjs", "export {}\n");
    repository.write("tooling/changesets/policy.mjs", "export {}\n");
    repository.git("add", "-A");
    repository.git("commit", "--quiet", "-m", "update tests and tooling");

    const result = run(repository.root, "--base", "HEAD~1", "--head", "HEAD");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no releasable package paths changed/);
  } finally {
    repository.cleanup();
  }
});
