# Minions

Minions is an experimental OpenCode plugin for managing agents from the TUI.
The intended product is one `/minions` control panel for inspecting and
editing built-in agents, user agents, Minions-managed agents, models, prompts,
permissions, visibility, and task access.

The project currently targets OpenCode `>=1.4.0 <2` and its terminal TUI. Its
internal behavior is kept separate from the OpenCode adapter so additional
hosts can be evaluated later without coupling the core policy to one plugin
API.

## Status

The repository is under active pre-v1 development. The OpenCode package is private and not
ready for installation or general use. APIs and behavior may change in every pull request.

## Product direction

- One `/minions` TUI entry point for agent management
- Built-in and user-configured agent inspection
- Agent editing for description, mode, model, prompt, visibility, and enabled
  state
- Minions-managed overrides and agents later
- Minions-managed custom agents and subagents
- Model, prompt, permission, visibility, and task-access controls
- OpenCode-native config updates instead of hand-editing config files

The current implementation is an early runtime slice of that direction. It
registers one `/minions` TUI entry point with agent inventory, agent config
editing, and diagnostics.

## Repository layout

```text
apps/
  website/    Static project website
packages/
  core/       Host-neutral role and state definitions
  opencode/   OpenCode adapter, currently targeting OpenCode v1
tooling/
  changesets/ Pre-v1 release policy and its tests
docs/
  CONTEXT.md       Product goals, boundaries, and success criteria
  ARCHITECTURE.md  Current technical behavior and invariants
  CONTRIBUTING.md  Development and release workflow
```

## Development

```sh
npm install
npm run verify
```

Run the website locally with:

```sh
npm run dev --workspace minions-website
```

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the branch workflow.
