import parse from "@changesets/parse";

export const RELEASE_PACKAGE = "@abijith-suresh/minions-opencode";
export const REQUIRED_RELEASE_TYPE = "patch";

export function toPosixPath(path) {
  return path.split("\\").join("/");
}

export function isReleasablePath(path) {
  const normalized = toPosixPath(path);

  if (
    normalized === "packages/core/package.json" ||
    normalized === "packages/core/tsconfig.json" ||
    normalized === "packages/opencode/package.json" ||
    normalized === "packages/opencode/tsconfig.json"
  ) {
    return true;
  }

  if (
    normalized.startsWith("packages/core/src/") ||
    normalized.startsWith("packages/opencode/src/") ||
    normalized.startsWith("packages/opencode/scripts/")
  ) {
    return !normalized.match(/\.(test|spec)\.[cm]?[jt]sx?$/);
  }

  return false;
}

export function isChangesetMarkdown(path) {
  const normalized = toPosixPath(path);
  const prefix = ".changeset/";

  if (!normalized.startsWith(prefix)) return false;
  const basename = normalized.slice(prefix.length);

  return (
    basename !== "" &&
    !basename.includes("/") &&
    !basename.startsWith(".") &&
    basename.endsWith(".md") &&
    !/^readme\.md$/i.test(basename)
  );
}

function normalizedStatus(status) {
  if (status.startsWith("R")) return "R";
  if (status.startsWith("C")) return "C";
  return status;
}

function isRenameOrCopy(entry) {
  const status = normalizedStatus(entry.status);
  return status === "R" || status === "C";
}

export function entryRelevantPaths(entry) {
  if (isRenameOrCopy(entry)) {
    return [toPosixPath(entry.from), toPosixPath(entry.to)];
  }

  return [toPosixPath(entry.to)];
}

export function releasablePathsFromEntries(entries) {
  const paths = new Set();

  for (const entry of entries) {
    for (const path of entryRelevantPaths(entry)) {
      if (isReleasablePath(path)) paths.add(path);
    }
  }

  return [...paths].sort();
}

function isGeneratedReleaseEntry(entry) {
  if (isRenameOrCopy(entry)) return false;

  const status = normalizedStatus(entry.status);
  const path = toPosixPath(entry.to);

  if (status === "D") return isChangesetMarkdown(path);

  return (
    (status === "A" || status === "M") &&
    (path === "packages/opencode/CHANGELOG.md" ||
      path === "packages/opencode/package.json" ||
      path === "package-lock.json")
  );
}

export function isExemptReleasePr(entries, headRef, headRepository, baseRepository) {
  if (headRef !== "changeset-release/main") return false;
  if ((headRepository ?? "") !== (baseRepository ?? "")) return false;
  return entries.length > 0 && entries.every(isGeneratedReleaseEntry);
}

function parseChangeset(content) {
  try {
    const changeset = parse(content);
    return { ok: true, releases: changeset.releases ?? [] };
  } catch (error) {
    return {
      ok: false,
      releases: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function changesetSatisfies(changesetFiles) {
  if (changesetFiles.length === 0) {
    return {
      ok: false,
      reason: "no changeset was added or modified by this pull request",
    };
  }

  const failures = [];

  for (const file of changesetFiles) {
    if (!isChangesetMarkdown(file.path)) continue;

    const parsed = parseChangeset(file.content);
    if (!parsed.ok) {
      failures.push(`${file.path}: ${parsed.reason}`);
      continue;
    }

    const [release] = parsed.releases;
    if (
      parsed.releases.length === 1 &&
      release.name === RELEASE_PACKAGE &&
      release.type === REQUIRED_RELEASE_TYPE
    ) {
      return { ok: true };
    }

    const actual = parsed.releases.map(({ name, type }) => `${name}: ${type}`).join(", ");
    failures.push(
      `${file.path}: expected ${RELEASE_PACKAGE}: ${REQUIRED_RELEASE_TYPE} as the only release, found ${actual || "no releases"}`,
    );
  }

  return {
    ok: false,
    reason: `no valid patch changeset for ${RELEASE_PACKAGE}. ${failures.join("; ")}`,
  };
}

export function classifyChangesetPolicy({
  diffEntries = [],
  changesetFiles = [],
  headRef = "",
  headRepository,
  baseRepository,
}) {
  if (isExemptReleasePr(diffEntries, headRef, headRepository, baseRepository)) {
    return {
      ok: true,
      changesetRequired: false,
      releasePrExemption: true,
      releasablePaths: [],
    };
  }

  const releasablePaths = releasablePathsFromEntries(diffEntries);
  if (releasablePaths.length === 0) {
    return {
      ok: true,
      changesetRequired: false,
      releasePrExemption: false,
      releasablePaths,
    };
  }

  const changeset = changesetSatisfies(changesetFiles);
  return {
    ok: changeset.ok,
    changesetRequired: true,
    releasePrExemption: false,
    releasablePaths,
    ...(changeset.reason ? { reason: changeset.reason } : {}),
  };
}
