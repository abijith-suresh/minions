# Contributing to Minions

Minions is currently in its initial development phase.

## Prerequisites

- mise
- Node.js 22.22.2 or newer in the Node 22 line, or Node.js 24.15 or newer
- npm 11.5 or newer
- OpenCode 1.4.0 or newer within the v1 release line

## Setup

```sh
mise install
npm install
npm run verify
```

## Development workflow

1. Create a branch from `main`.
2. Keep changes focused on one vertical slice.
3. For changes to shipped source or package behavior, run `npm run changeset` and select a
   patch release for `@abijith-suresh/minions-opencode`.
4. Run `npm run verify`.
5. Open a pull request.

All pre-v1 changesets must use the patch bump level, including breaking changes. This keeps
versions in the `0.0.x` range until the project is intentionally made public.

Husky runs Biome and commit message validation during commits, then the full verification
suite before pushes. Commit messages follow the Conventional Commits format.

Direct pushes to `main` are protected.

## Documentation

- `README.md` provides the user-facing project overview.
- `packages/opencode/README.md` documents plugin installation and usage.
- `docs/CONTEXT.md` records product goals, non-goals, and constraints.
- `docs/ARCHITECTURE.md` describes current technical behavior and invariants.
- `AGENTS.md` defines repository guidance for coding agents and documentation
  ownership.
