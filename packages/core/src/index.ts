export const MINIONS_CORE_VERSION = 1;

export const MINIONS_PLUGIN_ID = "minions";
export const MINIONS_DEFAULT_SUBAGENT_ID = "minion";
export const MINIONS_DELEGATE_SKILL_ID = "minions-delegate";

export const MINIONS_DEFAULT_SUBAGENT_DESCRIPTION =
  "Hidden Minions-managed subagent for explicitly delegated repository and tool work.";

export const MINIONS_DEFAULT_SUBAGENT_PROMPT = `You are minion, a Minions-managed OpenCode subagent.

Execute only the task explicitly delegated to you. Inspect relevant evidence before making assumptions, follow repository instructions and conventions, preserve unrelated work, and do not expand the task. Never delegate to another agent.

Complete requested changes rather than merely describing them. Verify the result in proportion to risk, then stop once the requested outcome and relevant checks are complete. Return a concise report with the outcome, specific evidence, files or behavior changed, checks performed, and unresolved risks or blockers.`;

export const MINIONS_DELEGATE_SKILL_DESCRIPTION =
  "Use the Minions delegation workflow with the hidden minion subagent. Use only when the user explicitly invokes the minions-delegate skill or workflow. Do not trigger implicitly from ordinary task requests.";

export const MINIONS_DELEGATE_SKILL_CONTENT = `---
name: ${MINIONS_DELEGATE_SKILL_ID}
description: >-
  ${MINIONS_DELEGATE_SKILL_DESCRIPTION}
---

# Minions Delegate

Use this workflow only for the current request where the user explicitly invoked the \`${MINIONS_DELEGATE_SKILL_ID}\` skill or workflow.

You are the active primary agent. Keep using your current OpenCode agent mode, such as build, plan, or a user-created agent. Do not switch to or require a special Minions primary agent.

For repository or external-tool work, delegate the substantive investigation, implementation, testing, debugging, research, and review to the hidden \`${MINIONS_DEFAULT_SUBAGENT_ID}\` subagent. Give \`${MINIONS_DEFAULT_SUBAGENT_ID}\` a self-contained brief with the objective, relevant context, constraints, expected result, and verification requirements.

After \`${MINIONS_DEFAULT_SUBAGENT_ID}\` returns, synthesize the result from its evidence. Do not broadly repeat the same file reads, searches, commands, tests, or review it already performed. If evidence is missing or unclear, delegate a focused follow-up to \`${MINIONS_DEFAULT_SUBAGENT_ID}\`.

Use your own tools only for coordination, user clarification, or narrow verification of a specific high-risk claim that cannot be resolved from the subagent report. If \`${MINIONS_DEFAULT_SUBAGENT_ID}\` or the task tool is unavailable, disclose the fallback and proceed with the best available host behavior.

In the final response, report the outcome, important files or behavior changed, checks performed, and any unresolved risks or blockers.`;

export type MinionsManagedAgentKind = "subagent";
export type MinionsManagedAgentVisibility = "hidden";

export interface MinionsManagedAgentContract {
  readonly id: string;
  readonly kind: MinionsManagedAgentKind;
  readonly visibility: MinionsManagedAgentVisibility;
  readonly description: string;
  readonly prompt: string;
  readonly model: {
    /**
     * The host adapter must not pin a model for this agent unless a user
     * selected model is currently available. Without a pinned model the host
     * uses the model selected for the calling conversation.
     */
    readonly strategy: "inherit";
  };
  readonly delegation: {
    readonly enabled: false;
  };
}

/**
 * Build a fresh host-neutral default subagent contract so adapters can map it
 * without sharing mutable host configuration between plugin instances.
 */
export function createDefaultMinionContract(): MinionsManagedAgentContract {
  return {
    id: MINIONS_DEFAULT_SUBAGENT_ID,
    kind: "subagent",
    visibility: "hidden",
    description: MINIONS_DEFAULT_SUBAGENT_DESCRIPTION,
    prompt: MINIONS_DEFAULT_SUBAGENT_PROMPT,
    model: { strategy: "inherit" },
    delegation: { enabled: false },
  };
}
