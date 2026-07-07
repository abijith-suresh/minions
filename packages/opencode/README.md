# @abijith-suresh/minions-opencode

OpenCode adapter for Minions. The package supports OpenCode `>=1.4.0 <2`.

This package is private while the initial plugin behavior is under active development. It is not ready for installation or use.

Minions is being rewritten into a TUI-first OpenCode agent manager. The target
plugin provides one `/minions` control panel for inspecting and configuring:

- built-in OpenCode agents
- user-configured agents
- Minions-managed agents and overrides
- model preferences and overrides
- prompts
- visibility and permissions
- task access between primary agents and subagents

The current runtime slice registers one `/minions` TUI entry point with agent
inventory, editable agent config fields, and diagnostics. It does not install a
hidden Minions agent or delegation skill.

## Local dogfooding

From the repository root, build and register the local package in OpenCode's
global server and TUI configuration:

```sh
npm install
npm run build --workspace @abijith-suresh/minions-opencode
opencode plugin "$PWD/packages/opencode" --global --force
```

Start OpenCode after registration and run `/minions` to open the control panel.
Use `Agents` to inspect detected OpenCode agents and edit description, mode,
model, prompt, visibility, or enabled state. Changes are written through
OpenCode's config API and OpenCode is reloaded after each edit.

Rebuild the package before restarting OpenCode after local source changes.
