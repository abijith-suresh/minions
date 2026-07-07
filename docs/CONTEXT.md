# Product Context

## Problem

OpenCode has powerful agent primitives, but managing them is still mostly a
configuration-file workflow. Users who want to tune built-in agents, create
subagents, adjust prompts, select models, or tighten permissions need to edit
config by hand and keep the resulting agent graph in their head.

That friction makes it harder to experiment with agent teams safely. It also
pushes workflow ideas such as delegation into bespoke orchestrator agents when
they would often be better as explicit, reusable skills or workflows.

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
- **Managed overrides.** Let Minions create runtime overrides for built-in
  agents and own the agents it creates.
- **Subagent management.** Support Minions-managed subagents, including a
  hidden default subagent named `minion`.
- **Permission clarity.** Make task access and tool permissions easier to see
  and modify without hand-editing OpenCode config.
- **Explicit workflows.** Ship delegation as an explicitly invoked
  skill/workflow instead of forcing users into a special primary agent.
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
- OpenCode v2, Pi, or other host adapters

## Constraints

- OpenCode `>=1.4.0 <2`
- OpenCode terminal TUI
- One public command surface: `/minions`
- Runtime behavior should be injected from Minions-owned state where possible
  instead of directly rewriting user OpenCode config
- Minions must distinguish built-in agents, user-configured agents, and
  Minions-managed agents
- Pre-v1 releases may change behavior in any patch release

## Current Runtime Slice

The current package has removed the earlier delegation-primary prototype. It
currently provides:

- one `/minions` TUI entry point
- a hidden Minions-managed `minion` subagent
- minion model selection inside `/minions`
- installation of the explicitly invoked `minions-delegate` skill inside
  `/minions`
- diagnostics inside `/minions`

The broader agent manager remains pre-v1 follow-up work.

## Success Criteria

1. A user can open `/minions` from the OpenCode TUI and see the current agent
   system.
2. Built-in, user-configured, and Minions-managed agents are clearly labeled.
3. A user can configure a Minions-managed `minion` subagent without editing
   OpenCode config by hand.
4. A user can control which primary agents may call `minion`.
5. Delegation is available as an explicitly invoked skill/workflow, not as a
   mandatory primary-agent replacement.
6. Minions can inject its managed configuration at runtime without corrupting
   user-owned config.
