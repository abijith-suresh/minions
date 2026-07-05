# Architecture

This document describes the current implemented behavior of Minions. It is
descriptive, not prescriptive. When this document and the source disagree, the
source is authoritative.

## Overview

Minions is an npm workspace repository containing a host-neutral agent
contract, an OpenCode v1 adapter, and a private Astro website.

- `packages/core/` defines role identities, descriptions, prompts, and the
  delegation contract without depending on a host API.
- `packages/opencode/` maps that contract to OpenCode agents and provides the
  worker-model selector.
- `apps/website/` contains the static project website.

## Agent Contract

The core defines two roles:

| Role | Mode | Responsibility |
| --- | --- | --- |
| `minions` | Selectable primary | Brief the worker, coordinate work, verify results, and answer the user |
| `minions-worker` | Hidden subagent | Execute delegated investigation, implementation, testing, debugging, research, and review |

The primary may answer directly from the conversation or provided project
context when no tools are required. If it needs a repository or external tool,
the prompt directs that work through the worker before the primary calls the
tool. After delegation it may verify the result in proportion to risk without
repeating the assigned work.

The worker executes only its delegated scope, follows repository instructions,
verifies its result, and reports evidence and blockers.

## OpenCode Permission Boundary

The OpenCode adapter maps the core contract to reserved agent definitions:

- The primary denies task access by default and allows only
  `minions-worker`.
- The worker denies task access entirely.
- The worker is hidden from normal agent selection.
- Reserved Minions definitions replace user definitions with the same IDs so
  configuration cannot weaken the boundary.
- The plugin does not change the user's default agent or global tool
  permissions.

Delegation behavior is prompt-guided. Worker visibility and task access are
enforced by OpenCode configuration.

## Model Selection

The primary always follows the model selected for the current OpenCode
conversation.

The `/minions-model` TUI command lists connected, non-deprecated models that
support tool calls. The user may select one for the worker or inherit the
primary model. The preference is stored in OpenCode's global state directory
and applies across projects.

The stored state contains the selected model and the last connected-model
catalogue. When the selected model is unavailable, the server omits the worker
model override so OpenCode inherits the primary model. The selection is
retained and becomes effective again when the model reappears.

Writes use a temporary file followed by a rename. The TUI refreshes model
availability when OpenCode instances or providers change and reloads the
instance when the effective worker model changes.

## Plugin Packaging

The OpenCode package exports separate server and TUI entry points:

- `./server` registers the configuration hook and reserved agents.
- `./tui` registers the worker-model command and tracks model availability.

The package build bundles the private core into both entry points. Consumers
therefore install only `@abijith-suresh/minions-opencode`.

Packed-package smoke tests validate exports and artifacts. Real-host tests run
the packed plugin against the minimum supported OpenCode release and the
current v1 release used for development.

## Repository Invariants

- The primary remains selectable and non-default.
- The worker remains hidden.
- The primary can delegate only to the worker.
- The worker cannot delegate.
- The primary model is never pinned by Minions.
- An unavailable selected worker model falls back to inheritance without
  discarding the selection.
- Host-specific behavior remains outside `packages/core/`.
