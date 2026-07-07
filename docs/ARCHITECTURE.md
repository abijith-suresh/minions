# Architecture

This document describes Minions' intended architecture during the pre-v1
rewrite. Source code and tests remain authoritative for runtime behavior while
the package moves from the delegation prototype to the agent manager model.

## Overview

Minions is an npm workspace repository containing host-neutral agent-management
concepts, an OpenCode v1 adapter, and a private Astro website.

- `packages/core/` owns host-neutral state and policy concepts.
- `packages/opencode/` maps Minions-managed state into OpenCode v1 plugin
  hooks and TUI screens.
- `apps/website/` contains the static project website.

## Product Architecture

The target product has one public TUI entry point:

```text
/minions
```

That command opens a manager for:

- built-in OpenCode agents
- user-configured agents
- Minions-managed agents and subagents
- model preferences
- prompts and workflow assets
- permissions, visibility, and task access
- diagnostics for what Minions injects at runtime

Minions should label ownership clearly. Built-in agents and user-configured
agents can be inspected, while Minions-owned agents and Minions-owned runtime
overrides are managed by the plugin.

## Managed State

The intended runtime model is:

```text
OpenCode resolved config
  + Minions-owned state
  -> final runtime config injected by the plugin
```

Minions should prefer state it owns over direct edits to user OpenCode config.
This keeps changes reversible and reduces the risk of corrupting user-managed
configuration.

The state model is expected to cover:

- managed agents and subagents
- built-in agent overrides
- per-agent model choices
- permission and task-access rules
- shipped workflow assets such as delegation

## Default Subagent

The default Minions-managed subagent is named `minion`.

It is hidden by default and must not be able to delegate recursively. It is
available for explicitly invoked workflows, not as part of a mandatory primary
agent replacement.

## Delegation Workflow

Delegation is no longer the product's central runtime mode. It is a workflow
asset shipped with Minions.

The intended behavior is:

- the user explicitly invokes the delegation skill/workflow;
- the current primary agent can keep being `build`, `plan`, or another agent;
- delegated repository or tool-dependent work can be sent to `minion`;
- the primary synthesizes from the subagent's evidence instead of repeating the
  same broad work.

OpenCode remains responsible for task execution, foreground/background
behavior, model providers, and host-level scheduling.

## Transitional Runtime

The current implementation still contains the earlier delegation prototype:

- a selectable `minions` primary agent
- a hidden `minions-worker` subagent
- `/minions-model` for selecting the worker model

Those runtime details are transitional and should not be treated as the target
architecture for the first public release.

## Plugin Packaging

The OpenCode package exports separate server and TUI entry points:

- `./server` registers configuration hooks and runtime agent definitions.
- `./tui` registers Minions TUI commands and dialogs.

The package build bundles private core code into the OpenCode adapter. Consumers
install only `@abijith-suresh/minions-opencode`.

Packed-package smoke tests validate exports and artifacts. Real-host tests run
the packed plugin against the minimum supported OpenCode release and the
current v1 release used for development.

## Target Invariants

- `/minions` is the only Minions command users need to open the manager.
- Minions distinguishes built-in, user-configured, and Minions-managed agents.
- Minions-owned runtime changes are derived from Minions-owned state.
- `minion` is hidden by default and cannot delegate recursively.
- Delegation is explicitly invoked as a skill/workflow.
- Minions does not replace OpenCode's execution scheduler or model provider
  system.
- Host-specific behavior remains outside `packages/core/`.
