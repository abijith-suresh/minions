# Product Context

## Problem

Coding agents often combine coordination and execution in one context. On
larger tasks this makes it harder to keep the main conversation focused,
delegate work consistently, and verify the result before reporting it.

## Target User

Minions is for developers using OpenCode who want a delegation-first workflow
with a primary agent coordinating one worker. The worker may use a different
model so users can choose the cost and capability balance for execution.

## Goals

- **Focused coordination.** The primary delegates tool-dependent repository
  and research work, evaluates the worker's result, and owns the final answer.
- **One clear execution path.** The primary delegates only to the Minions
  worker, and the worker cannot delegate recursively.
- **Host-native behavior.** OpenCode owns task scheduling, model providers, and
  foreground or background execution.
- **Configurable worker model.** Users can inherit the primary model or select
  a connected, tool-capable model globally.
- **Portable core policy.** Agent roles and prompts remain separate from the
  OpenCode adapter so other hosts can be evaluated later.

## Non-Goals

Minions does not currently provide:

- Multiple worker roles or workflow profiles
- Iteration limits, approval gates, or independent verifier agents
- Its own scheduler or background task system
- Automatic model selection or model quality ranking
- OpenCode v2, Pi, or other host adapters

## Constraints

- OpenCode `>=1.4.0 <2`
- OpenCode terminal TUI
- One selectable primary and one hidden worker
- Prompt policy guides primary delegation; OpenCode permissions enforce the
  allowed worker boundary and prevent recursive delegation
- Pre-v1 releases may change behavior in any patch release

## Success Criteria

1. A user can select `minions` as the primary agent without changing their
   normal OpenCode model selection.
2. Tool-dependent repository and research requests are delegated to
   `minions-worker` before the primary performs that work.
3. The primary evaluates and verifies the worker's result before reporting it.
4. The primary cannot delegate to another subagent, and the worker cannot
   delegate recursively.
5. A selected worker model persists globally and falls back to the primary
   model while unavailable.
