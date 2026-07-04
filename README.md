# Minions

Minions is an experimental OpenCode plugin that adds a selectable primary agent which delegates substantive work to one hidden worker agent.

The project currently targets OpenCode `>=1.4.0 <2` and its terminal TUI. Its internal behavior is kept separate from the OpenCode adapter so additional hosts can be evaluated later without coupling the core policy to one plugin API.

## Status

The repository is under active pre-v1 development. The OpenCode package is private and not
ready for installation or general use. APIs and behavior may change in every pull request.

## Current behavior

- One selectable `minions` primary agent
- One hidden `minions-worker` subagent
- Prompt-driven delegation of substantive work
- Main agent retains tools for coordination and verification
- Main agent can delegate only to `minions-worker`
- Worker cannot delegate to other subagents
- Primary and worker models inherit the model selected for the conversation
- OpenCode-native foreground or background task behavior

Worker model selection through the TUI is planned as a separate slice. The
current adapter intentionally leaves both agent models unset so OpenCode uses
its native model inheritance.

## Repository layout

```text
apps/
  website/    Static project website
packages/
  core/       Host-neutral role definitions, prompts, and options
  opencode/   OpenCode adapter, currently targeting OpenCode v1
tooling/
  changesets/ Pre-v1 release policy and its tests
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

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch workflow.
