import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "minions-package-smoke-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args, cwd = packageRoot) {
  const result = spawnSync(npm, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(
    result.status,
    0,
    `npm ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result.stdout;
}

try {
  mkdirSync(packDirectory, { recursive: true });
  mkdirSync(consumerDirectory, { recursive: true });

  run(["run", "build"]);
  const [packed] = JSON.parse(
    run(["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory]),
  );
  assert.ok(packed, "npm pack should return one package");

  const files = new Set(packed.files.map(({ path }) => path));
  for (const required of [
    "LICENSE",
    "README.md",
    "package.json",
    "dist/server.js",
    "dist/server.d.ts",
    "dist/tui.js",
    "dist/tui.d.ts",
  ]) {
    assert.ok(files.has(required), `packed package is missing ${required}`);
  }

  for (const path of files) {
    assert.equal(path.startsWith("src/"), false, `packed source file: ${path}`);
    assert.equal(path.includes(".test."), false, `packed test file: ${path}`);
    assert.equal(path.endsWith("tsconfig.json"), false, `packed config file: ${path}`);
  }

  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "minions-smoke-consumer", private: true, type: "module" })}\n`,
  );
  run(
    [
      "install",
      join(packDirectory, packed.filename),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    consumerDirectory,
  );

  const verification = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        'import server from "@minions/opencode/server"',
        'import tui from "@minions/opencode/tui"',
        'if (server.id !== "minions" || typeof server.server !== "function") process.exit(1)',
        'if (tui.id !== "minions" || typeof tui.tui !== "function") process.exit(1)',
      ].join("\n"),
    ],
    { cwd: consumerDirectory, encoding: "utf8" },
  );
  assert.equal(
    verification.status,
    0,
    `packed imports failed\nstdout:\n${verification.stdout}\nstderr:\n${verification.stderr}`,
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
