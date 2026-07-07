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

The current runtime slice registers the hidden `minion` subagent and one
`/minions` TUI entry point with model selection, delegation-skill installation,
and diagnostics. Delegation is available through the explicitly invoked
`minions-delegate` skill that can use `minion`; users do not need to switch to a
special Minions primary agent for normal work.

## Local dogfooding

From the repository root, build and register the local package in OpenCode's
global server and TUI configuration:

```sh
npm install
npm run build --workspace @abijith-suresh/minions-opencode
opencode plugin "$PWD/packages/opencode" --global --force
```

Start OpenCode after registration and run `/minions` to open the control panel.
Use the `Minion model` menu item to choose the model used by the hidden
`minion` subagent.

Use the `Delegation skill` menu item to install or update the global
`minions-delegate` skill under OpenCode's config directory:

```text
<opencode config>/skills/minions-delegate/SKILL.md
```

If OpenCode does not discover the skill immediately, restart or reload OpenCode.
Then explicitly invoke it from your active agent, for example:

```text
Use the minions-delegate skill for this task.
```

Rebuild the package before restarting OpenCode after local source changes.
