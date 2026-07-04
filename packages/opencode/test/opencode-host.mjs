import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "minions-opencode-host-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");
const projectDirectory = join(temporaryRoot, "project");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const opencode = process.env.OPENCODE_BIN;
const expectedVersion = process.env.OPENCODE_VERSION;

assert.ok(opencode, "OPENCODE_BIN must point to an installed OpenCode executable");

function run(command, args, cwd = packageRoot) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result.stdout;
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolveClosed, reject) => {
    server.close((error) => (error ? reject(error) : resolveClosed()));
  });
  return port;
}

async function agentsFromHost(port, child, output) {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      assert.fail(`OpenCode exited before becoming ready\n${output()}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/agent`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return response.json();
      lastError = new Error(`OpenCode returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  assert.fail(
    `OpenCode did not become ready: ${lastError instanceof Error ? lastError.message : lastError}\n${output()}`,
  );
}

function taskPermissions(agent) {
  return agent.permission.filter(({ permission }) => permission === "task");
}

let host;

try {
  mkdirSync(packDirectory, { recursive: true });
  mkdirSync(consumerDirectory, { recursive: true });
  mkdirSync(projectDirectory, { recursive: true });

  run(npm, ["run", "build"]);
  const [packed] = JSON.parse(
    run(npm, ["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory]),
  );
  assert.ok(packed, "npm pack should return one package");

  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "minions-host-consumer", private: true })}\n`,
  );
  run(
    npm,
    [
      "install",
      join(packDirectory, packed.filename),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    consumerDirectory,
  );

  const installedPlugin = resolve(
    consumerDirectory,
    "node_modules",
    "@abijith-suresh",
    "minions-opencode",
  );
  writeFileSync(
    join(projectDirectory, "opencode.json"),
    `${JSON.stringify({ plugin: [installedPlugin] })}\n`,
  );

  const version = run(opencode, ["--version"], projectDirectory).trim();
  if (expectedVersion) assert.equal(version, expectedVersion);

  const home = join(temporaryRoot, "home");
  const config = join(temporaryRoot, "config");
  const data = join(temporaryRoot, "data");
  const cache = join(temporaryRoot, "cache");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(config, "opencode", "node_modules"), { recursive: true });
  mkdirSync(data, { recursive: true });
  mkdirSync(cache, { recursive: true });

  const port = await availablePort();
  let stdout = "";
  let stderr = "";
  host = spawn(
    opencode,
    ["serve", "--hostname", "127.0.0.1", "--port", String(port), "--log-level", "ERROR"],
    {
      cwd: projectDirectory,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        HOME: home,
        XDG_CACHE_HOME: cache,
        XDG_CONFIG_HOME: config,
        XDG_DATA_HOME: data,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  host.stdout.setEncoding("utf8").on("data", (chunk) => {
    stdout += chunk;
  });
  host.stderr.setEncoding("utf8").on("data", (chunk) => {
    stderr += chunk;
  });

  const agents = await agentsFromHost(port, host, () => `stdout:\n${stdout}\nstderr:\n${stderr}`);
  const primary = agents.find(({ name }) => name === "minions");
  const worker = agents.find(({ name }) => name === "minions-worker");

  assert.ok(primary, "OpenCode should register the Minions primary agent");
  assert.equal(primary.mode, "primary");
  assert.equal(primary.model, undefined);
  assert.deepEqual(taskPermissions(primary), [
    { permission: "task", pattern: "*", action: "deny" },
    { permission: "task", pattern: "minions-worker", action: "allow" },
  ]);

  assert.ok(worker, "OpenCode should register the Minions worker");
  assert.equal(worker.mode, "subagent");
  assert.equal(worker.hidden, true);
  assert.equal(worker.model, undefined);
  assert.deepEqual(taskPermissions(worker), [{ permission: "task", action: "deny", pattern: "*" }]);
} finally {
  if (host && host.exitCode === null && host.signalCode === null) {
    const signalHost = (signal) => {
      if (process.platform === "win32") {
        host.kill(signal);
        return;
      }

      process.kill(-host.pid, signal);
    };

    signalHost("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) => host.once("exit", resolveExit)),
      new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
    ]);
    if (host.exitCode === null && host.signalCode === null) {
      signalHost("SIGKILL");
      await new Promise((resolveExit) => host.once("exit", resolveExit));
    }
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}
