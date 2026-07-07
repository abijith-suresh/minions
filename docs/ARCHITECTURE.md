# Architecture

This document describes Minions' intended architecture during the pre-v1
rewrite. Source code and tests remain authoritative for runtime behavior while
the package grows from the first agent-manager runtime slice.

## Overview

Minions is an npm workspace repository containing host-neutral agent-management
concepts, an OpenCode v1 adapter, and a private Astro website.

- `packages/core/` owns host-neutral state and policy concepts.
- `packages/opencode/` maps Minions-managed state into OpenCode v1 plugin
  APIs and TUI screens.
- `apps/website/` contains the static project website.

## Product Architecture

The target product has one public TUI entry point:

```text
/minions
```

That command opens a manager for:

- built-in OpenCode agents
- user-configured agents
- Minions-managed agents and overrides
- model preferences
- prompts
- permissions, visibility, and task access
- diagnostics for OpenCode paths, providers, agents, and Minions state

Minions should label ownership clearly. Built-in agents and user-configured
agents can be inspected, while Minions-owned agents and Minions-owned runtime
overrides are managed by the plugin.

## Managed State

The intended long-term runtime model is:

```text
OpenCode resolved config
  + Minions-owned state
  -> final runtime config injected by the plugin
```

For the first useful slice, Minions edits agent config through OpenCode's config
API. That keeps behavior aligned with the host and avoids direct ad hoc file
writes. A later managed-override layer can move repeatable Minions-owned
changes into versioned state.

The state model is expected to cover:

- managed agents and subagents
- built-in agent overrides
- per-agent model choices
- permission and task-access rules
- curated workflow assets when they are packaged separately from the plugin

## Agent Editing

The OpenCode adapter reads the effective agent list from the OpenCode API and
normalizes it for the TUI. The initial editable fields are:

- description
- mode
- model override
- prompt override
- hidden/visible state
- enabled/disabled state

Edits use a read-merge-write cycle through `config.get` and `config.update`,
then dispose the instance so OpenCode reloads the changed config. The plugin
does not edit Markdown agent source files directly yet.

OpenCode remains responsible for task execution, foreground/background
behavior, model providers, and host-level scheduling.

## Current Runtime Slice

The current implementation provides the first local-dogfooding slice:

- one `/minions` command that opens the Minions manager dialog
- agent inventory from OpenCode's agent API
- editing for description, mode, model, prompt, visibility, and enabled state
- diagnostics for detected agents, providers, and OpenCode paths

It does not register a selectable `minions` primary agent or hidden `minion`
subagent.

## Plugin Packaging

The OpenCode package exports separate server and TUI entry points:

- `./server` registers a compatibility config hook without injecting agents.
- `./tui` registers Minions TUI commands and dialogs.

The package build bundles private core code into the OpenCode adapter. Consumers
install only `@abijith-suresh/minions-opencode`.

Packed-package smoke tests validate exports and artifacts. Real-host tests run
the packed plugin against the minimum supported OpenCode release and the
current v1 release used for development.

## Target Invariants

- `/minions` is the only Minions command users need to open the manager.
- Minions distinguishes built-in, user-configured, and Minions-managed agents.
- Agent edits go through OpenCode APIs rather than direct unsupervised file
  rewrites.
- Minions does not inject hidden agents by default.
- Minions does not replace OpenCode's execution scheduler or model provider
  system.
- Host-specific behavior remains outside `packages/core/`.
