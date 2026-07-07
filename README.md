# Minions

Minions is an experimental OpenCode plugin for managing agents from the TUI.
The intended product is one `/minions` control panel for inspecting and
configuring built-in agents, user agents, Minions-managed subagents, models,
prompts, permissions, visibility, and task access.

The project currently targets OpenCode `>=1.4.0 <2` and its terminal TUI. Its
internal behavior is kept separate from the OpenCode adapter so additional
hosts can be evaluated later without coupling the core policy to one plugin
API.

## Status

The repository is under active pre-v1 development. The OpenCode package is private and not
ready for installation or general use. APIs and behavior may change in every pull request.

## Product direction

- One `/minions` TUI entry point for agent management
- Built-in agent inspection and Minions-managed overrides
- Minions-managed custom agents and subagents
- Model, prompt, permission, visibility, and task-access controls
- A hidden default subagent named `minion`
- An explicitly invoked delegation skill/workflow that can use `minion`
- Runtime configuration injection from Minions-owned state instead of direct
  edits to user OpenCode config

The current implementation is transitional. It still contains the earlier
delegation prototype while the package is being rewritten toward the agent
manager model before the first public release.

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
