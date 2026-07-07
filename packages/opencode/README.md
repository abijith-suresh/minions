# @abijith-suresh/minions-opencode

OpenCode adapter for Minions. The package supports OpenCode `>=1.4.0 <2`.

This package is private while the initial plugin behavior is under active development. It is not ready for installation or use.

Minions is being rewritten into a TUI-first OpenCode agent manager. The target
plugin provides one `/minions` control panel for inspecting and configuring:

- built-in OpenCode agents
- user-configured agents
- Minions-managed agents and subagents
- model preferences
- prompts and workflow assets
- visibility and permissions
- task access between primary agents and subagents

The intended default subagent is `minion`. Delegation will be shipped as an
explicitly invoked skill or workflow that can use `minion`; users should not
need to switch to a special Minions primary agent for normal work.

The current implementation is transitional. It still contains the earlier
prototype that registers a `minions` primary agent, a `minions-worker`
subagent, and `/minions-model` for worker model selection. That prototype will
be replaced before the first public release.

## Local dogfooding

From the repository root, build and register the local package in OpenCode's
global server and TUI configuration:

```sh
npm install
npm run build --workspace @abijith-suresh/minions-opencode
opencode plugin "$PWD/packages/opencode" --global --force
```

Start OpenCode after registration. During the transitional prototype, select
`minions` as the primary agent and run `/minions-model` to choose the worker
model. After the agent-manager rewrite, use `/minions` as the single control
panel.

Rebuild the package before restarting OpenCode after local source changes.
