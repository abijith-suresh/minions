# @abijith-suresh/minions-opencode

OpenCode adapter for Minions. The current package supports OpenCode `>=1.4.0 <2`.

This package is private while the initial plugin behavior is under active development. It is not ready for installation or use.

The adapter currently registers:

- `minions` as a selectable, non-default primary agent
- `minions-worker` as a hidden subagent
- Task permissions that expose only `minions-worker` to the primary
- A task denial that prevents the worker from delegating recursively
- A `/minions-model` TUI command for globally selecting the worker model

The primary always uses OpenCode's normal conversation model. The worker
inherits that model by default, or uses the explicit connected, tool-capable
model selected through `/minions-model`. An unavailable saved model
temporarily falls back to inheritance without discarding the preference.

Foreground and background execution are owned by OpenCode's task
implementation; Minions does not replace its scheduling behavior.

## Local dogfooding

From the repository root, build and register the local package in OpenCode's
global server and TUI configuration:

```sh
npm install
npm run build --workspace @abijith-suresh/minions-opencode
opencode plugin "$PWD/packages/opencode" --global --force
```

Start OpenCode, select `minions` as the primary agent, and run
`/minions-model` to choose the worker model. Rebuild the package before
restarting OpenCode after local source changes.
