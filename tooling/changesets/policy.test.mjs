import assert from "node:assert/strict";
import { test } from "node:test";

import {
  changesetSatisfies,
  classifyChangesetPolicy,
  isChangesetMarkdown,
  isExemptReleasePr,
  isReleasablePath,
  RELEASE_PACKAGE,
  releasablePathsFromEntries,
  toPosixPath,
} from "./policy.mjs";

const entry = (status, path) => ({ status, from: path, to: path });
const changeset = (type = "patch", packageName = RELEASE_PACKAGE) =>
  `---\n"${packageName}": ${type}\n---\nDescribe the change.\n`;

test("classifies shipped source and package behavior as releasable", () => {
  assert.equal(isReleasablePath("packages/core/src/index.ts"), true);
  assert.equal(isReleasablePath("packages/opencode/src/server.ts"), true);
  assert.equal(isReleasablePath("packages/opencode/scripts/bundle.mjs"), true);
  assert.equal(isReleasablePath("packages/opencode/package.json"), true);
  assert.equal(isReleasablePath("packages/core/src/index.test.ts"), false);
  assert.equal(isReleasablePath("packages/opencode/src/server.spec.ts"), false);
  assert.equal(isReleasablePath("packages/opencode/test/packed-package.mjs"), false);
  assert.equal(isReleasablePath("packages/opencode/test/opencode-host.mjs"), false);
  assert.equal(isReleasablePath("packages/opencode/scripts/other.mjs"), false);
  assert.equal(isReleasablePath("packages/opencode/README.md"), false);
  assert.equal(isReleasablePath("package.json"), false);
  assert.equal(isReleasablePath(".github/workflows/ci.yml"), false);
});

test("recognizes only direct, non-generated changeset markdown", () => {
  assert.equal(isChangesetMarkdown(".changeset/quiet-mice.md"), true);
  assert.equal(isChangesetMarkdown(".changeset/README.md"), false);
  assert.equal(isChangesetMarkdown(".changeset/.hidden.md"), false);
  assert.equal(isChangesetMarkdown(".changeset/nested/note.md"), false);
  assert.equal(isChangesetMarkdown(".changeset/config.json"), false);
});

test("normalizes paths and considers both sides of a rename", () => {
  assert.equal(toPosixPath("packages\\core\\src\\index.ts"), "packages/core/src/index.ts");
  assert.deepEqual(
    releasablePathsFromEntries([
      {
        status: "R100",
        from: "docs/server.ts",
        to: "packages/opencode/src/server.ts",
      },
    ]),
    ["packages/opencode/src/server.ts"],
  );
});

test("requires a changeset for releasable paths", () => {
  const result = classifyChangesetPolicy({
    diffEntries: [entry("M", "packages/opencode/src/server.ts")],
  });

  assert.equal(result.ok, false);
  assert.equal(result.changesetRequired, true);
});

test("accepts exactly one patch release for the releasable package", () => {
  const result = classifyChangesetPolicy({
    diffEntries: [entry("M", "packages/core/src/index.ts"), entry("A", ".changeset/fix.md")],
    changesetFiles: [{ path: ".changeset/fix.md", content: changeset() }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.changesetRequired, true);
});

test("accepts multiple individually valid patch changesets", () => {
  assert.equal(
    changesetSatisfies([
      { path: ".changeset/one.md", content: changeset() },
      { path: ".changeset/two.md", content: changeset() },
    ]).ok,
    true,
  );
});

test("rejects an invalid changeset even when another changed changeset is valid", () => {
  for (const invalid of [changeset("minor"), changeset("major"), "not frontmatter"]) {
    assert.equal(
      changesetSatisfies([
        { path: ".changeset/valid.md", content: changeset() },
        { path: ".changeset/invalid.md", content: invalid },
      ]).ok,
      false,
    );
  }
});

test("rejects wrong bump levels, packages, malformed files, and mixed releases", () => {
  for (const content of [
    changeset("minor"),
    changeset("major"),
    changeset("patch", "@minions/core"),
    "not frontmatter",
    `---\n"${RELEASE_PACKAGE}": patch\n"@minions/core": patch\n---\nmixed\n`,
  ]) {
    assert.equal(changesetSatisfies([{ path: ".changeset/invalid.md", content }]).ok, false);
  }
});

test("does not require changesets for docs, tests, website, or repository tooling", () => {
  const result = classifyChangesetPolicy({
    diffEntries: [
      entry("M", "README.md"),
      entry("M", "apps/website/src/pages/index.astro"),
      entry("M", "packages/core/src/index.test.ts"),
      entry("M", "packages/opencode/test/packed-package.mjs"),
      entry("M", "tooling/changesets/policy.mjs"),
      entry("M", "biome.json"),
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.changesetRequired, false);
});

test("release exemption is exact, same-repository, and generated-output only", () => {
  const generated = [
    entry("D", ".changeset/fix.md"),
    entry("M", "packages/opencode/package.json"),
    entry("M", "packages/opencode/CHANGELOG.md"),
    entry("M", "package-lock.json"),
  ];

  assert.equal(
    isExemptReleasePr(generated, "changeset-release/main", "owner/minions", "owner/minions"),
    true,
  );
  assert.equal(
    isExemptReleasePr(generated, "changeset-release/main", "fork/minions", "owner/minions"),
    false,
  );
  assert.equal(
    isExemptReleasePr(
      [...generated, entry("M", "packages/opencode/src/server.ts")],
      "changeset-release/main",
      "owner/minions",
      "owner/minions",
    ),
    false,
  );
});
