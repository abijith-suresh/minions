# @abijith-suresh/minions-opencode

## 0.0.1

### Patch Changes

- e578996: Reframe the pre-v1 plugin direction around a TUI-first OpenCode agent manager.
- 117b034: Add a global OpenCode TUI selector for the hidden worker model with safe inheritance fallback.
- 3f7bc82: Support OpenCode 1.4.0 and newer v1 releases, with compatibility checks against the minimum and current host versions.
- f88c560: Register the selectable Minions primary agent and its hidden, non-delegating worker with OpenCode.
- 8212d96: Replace the prototype Minions primary with a hidden `minion` subagent and a single `/minions` TUI manager entry point.
- 4ed6261: Install the explicitly invoked `minions-delegate` skill from the `/minions` manager for local OpenCode dogfooding.
- 75d69f2: Require the primary to delegate before using repository or research tools while allowing direct answers from provided context, and require evidence-aware worker reports.
- d9ad521: Establish the npm, mise, Biome, Changesets, Git hooks, build, test, licensing, and release
  tooling baseline.
- af9e560: Use a stable OpenCode package name without encoding the current host API generation.
