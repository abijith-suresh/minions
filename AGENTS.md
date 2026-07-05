# Agents

This file defines conventions for AI coding agents working on Minions.

## Document Ownership

| Document | Scope | Audience |
| --- | --- | --- |
| `README.md` | Project overview and repository navigation | Minions users |
| `packages/opencode/README.md` | Plugin installation, usage, and compatibility | OpenCode plugin users |
| `docs/CONTEXT.md` | Product truth: problem, goals, non-goals, constraints, and success criteria | Contributors and designers |
| `docs/ARCHITECTURE.md` | Current technical behavior, modules, and invariants | Contributors |
| `docs/CONTRIBUTING.md` | Setup, branches, commits, hooks, testing, CI, and releases | Contributors |
| `AGENTS.md` | Agent behavior and documentation-maintenance rules | Coding agents |

## Truth Precedence

When documentation and implementation disagree:

| Kind of truth | Authoritative source |
| --- | --- |
| Product intent | `docs/CONTEXT.md` |
| Runtime behavior and invariants | Source code and tests |
| Dependency versions and scripts | Package manifests and `package-lock.json` |
| CI and release behavior | `.github/workflows/` |
| Released history | Package changelogs |
| Pending release notes | `.changeset/` |

`docs/ARCHITECTURE.md` explains current behavior but does not override
executable truth.

## When to Update Documentation

- Product direction changes require an update to `docs/CONTEXT.md`.
- Role behavior, permissions, persistence, packaging, or host integration
  changes require an update to `docs/ARCHITECTURE.md`.
- Installation, commands, compatibility, or user-visible behavior changes
  require an update to `packages/opencode/README.md`.
- CI, hooks, or release workflow changes require an update to
  `docs/CONTRIBUTING.md`.
- Dependency version bumps do not require duplicated version updates in prose
  when package manifests are already authoritative.

## Key Rules

1. Keep `packages/core/` independent from host APIs.
2. Preserve unrelated changes in a dirty worktree.
3. Every pull request changing shipped package behavior requires a patch
   changeset for `@abijith-suresh/minions-opencode`.
4. Pre-v1 changesets use only patch bumps.
5. Run `npm run verify` before pushing.
6. Never bypass Husky hooks with `--no-verify`.
7. Use Conventional Commits and `feat/`, `fix/`, `chore/`, `docs/`, `test/`, or
   `refactor/` branch prefixes.

## Stack

- TypeScript with strict checking and ES modules
- Node.js and npm workspaces, versioned through mise
- Vitest for package tests
- Biome for formatting and linting
- Changesets for package versioning
- Astro for the static website
- GitHub Actions for CI, compatibility checks, releases, and Pages deployment
