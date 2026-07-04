import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  classifyChangesetPolicy,
  isChangesetMarkdown,
  RELEASE_PACKAGE,
  toPosixPath,
} from "./policy.mjs";

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for argument ${token}`);
    }

    args[token.slice(2)] = value;
    index += 1;
  }

  return args;
}

function runGit(args) {
  return execFileSync("git", args, {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runGitText(args) {
  return runGit(args).toString("utf8");
}

export function parseNameStatus(output) {
  const tokens = output.toString("utf8").split("\0").filter(Boolean);
  const entries = [];

  for (let index = 0; index < tokens.length; ) {
    const status = tokens[index];
    index += 1;

    if (status.startsWith("R") || status.startsWith("C")) {
      const from = tokens[index];
      const to = tokens[index + 1];
      index += 2;
      entries.push({ status, from, to });
      continue;
    }

    const path = tokens[index];
    index += 1;
    entries.push({ status, from: path, to: path });
  }

  return entries;
}

function collectDiffEntries(base, head) {
  const mergeBase = runGitText(["merge-base", base, head]).trim();
  return parseNameStatus(
    runGit(["diff", "--name-status", "-z", "--find-renames", mergeBase, head]),
  );
}

function collectChangesetFiles(entries, head) {
  return entries
    .filter(({ status, to }) => {
      const kind = status[0];
      return (kind === "A" || kind === "M") && isChangesetMarkdown(toPosixPath(to));
    })
    .map(({ to }) => ({
      path: toPosixPath(to),
      content: runGitText(["show", `${head}:${to}`]),
    }));
}

function failureMessage(result) {
  return [
    "Changeset policy: releasable package paths changed without a valid patch changeset.",
    "",
    "Releasable paths changed:",
    ...result.releasablePaths.map((path) => `  - ${path}`),
    "",
    ...(result.reason ? [`Reason: ${result.reason}`, ""] : []),
    `Add a patch changeset for ${RELEASE_PACKAGE}:`,
    "",
    "  npm run changeset",
    "",
    "Minions is pre-v1, so minor and major changes still use a patch changeset.",
  ].join("\n");
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const base = args.base;
  const head = args.head;

  if (!base) throw new Error("Missing required --base argument");
  if (!head) throw new Error("Missing required --head argument");

  const diffEntries = collectDiffEntries(base, head);
  const result = classifyChangesetPolicy({
    diffEntries,
    changesetFiles: collectChangesetFiles(diffEntries, head),
    headRef: args["head-ref"] ?? "",
    headRepository: args["head-repo"],
    baseRepository: args["base-repo"],
  });

  if (!result.ok) {
    process.stderr.write(`${failureMessage(result)}\n`);
    return 1;
  }

  if (result.releasePrExemption) {
    process.stdout.write("Changeset policy: generated release pull request exemption applied.\n");
  } else if (result.changesetRequired) {
    process.stdout.write("Changeset policy: a valid patch changeset is present.\n");
  } else {
    process.stdout.write("Changeset policy: no releasable package paths changed.\n");
  }

  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
