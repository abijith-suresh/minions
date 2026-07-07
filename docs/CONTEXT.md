# Product Context

## Problem

OpenCode has powerful agent primitives, but managing them is still mostly a
configuration-file workflow. Users who want to tune built-in agents, create
subagents, adjust prompts, select models, or tighten permissions need to edit
config by hand and keep the resulting agent graph in their head.

That friction makes it harder to shape an agent setup intentionally. Minions
exists to make the current agent system visible and editable from inside
OpenCode instead of forcing users to bounce between the TUI and config files.

## Target User

Minions is for developers using OpenCode who want a TUI-first way to inspect
and configure their agent system without replacing OpenCode's native behavior.

The primary user is comfortable experimenting with agents, prompts, models, and
permissions, but wants those changes visible, reversible, and easier to reason
about than hand-edited config.

## Goals

- **One control panel.** Provide a single `/minions` TUI entry point for
  managing agent-related settings.
- **Agent visibility.** Show built-in agents, user-created agents, and
  Minions-managed agents with clear ownership.
- **Agent editing.** Let users edit OpenCode agent descriptions, modes,
  prompts, model choices, visibility, and enabled state from the TUI.
- **Managed overrides.** Let Minions create clear config-backed overrides for
  built-in agents and own the agents it creates later.
- **Permission clarity.** Make tool and task permissions easier to inspect and
  eventually modify without hand-editing OpenCode config.
- **Host-native behavior.** Let OpenCode own agent execution, task scheduling,
  model providers, and foreground/background behavior.
- **Portable policy.** Keep agent and state concepts separate from the
  OpenCode adapter so other hosts can be evaluated later.

## Non-Goals

Minions does not currently provide:

- A replacement scheduler or background task system
- A large prebuilt orchestration suite with planner/reviewer/commander loops
- Automatic model ranking or model selection
- Memory, rules, worktree orchestration, or review-gate systems
- Direct ownership of all user OpenCode configuration
- A bundled default Minions agent or hidden delegation worker
- OpenCode v2, Pi, or other host adapters

## Constraints

- OpenCode `>=1.4.0 <2`
- OpenCode terminal TUI
- One public command surface: `/minions`
- Minions must distinguish built-in agents, user-configured agents, and
  Minions-managed agents
- Agent edits currently use OpenCode's config API so behavior stays aligned
  with the host instead of writing ad hoc files
- Pre-v1 releases may change behavior in any patch release

## Current Runtime Slice

The current package has removed the earlier hidden Minion/delegation prototype.
It currently provides:

- one `/minions` TUI entry point
- an agent inventory inside `/minions`
- editing for agent description, mode, model, prompt, visibility, and enabled
  state through OpenCode's config API
- diagnostics for detected agents, providers, and OpenCode paths

Permission editing, source-aware markdown editing, Minions-owned agent creation,
and profile/import flows remain pre-v1 follow-up work.

## Success Criteria

1. A user can open `/minions` from the OpenCode TUI and see the current agent
   system.
2. Built-in, user-configured, and Minions-managed agents are clearly labeled.
3. A user can edit common agent config fields without hand-editing JSON or
   Markdown.
4. Agent edits are applied through OpenCode and are visible after reload.
5. Minions does not inject hidden agents or replace OpenCode's execution model.
6. Minions can grow toward managed overrides without corrupting user-owned
   config.
