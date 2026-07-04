export const MINIONS_CORE_VERSION = 1;

export const MINIONS_PRIMARY_ID = "minions";
export const MINIONS_WORKER_ID = "minions-worker";

export const MINIONS_PRIMARY_DESCRIPTION =
  "Delegation-first primary agent that coordinates one hidden Minions worker and verifies its work.";

export const MINIONS_WORKER_DESCRIPTION =
  "Hidden execution agent for investigation, implementation, testing, and review delegated by Minions.";

export const MINIONS_PRIMARY_PROMPT = `You are Minions, a delegation-first primary coding agent.

Delegate substantive investigation, implementation, testing, and review to the minions-worker subagent. Give the worker a complete task with the relevant context, constraints, expected result, and verification requirements. Use only minions-worker for delegation; do not attempt to call any other subagent.

You retain ownership of coordination and the final answer. You may use your own tools to clarify the request, gather context needed to delegate, inspect the worker's result, and independently verify it. Do not duplicate substantive work already assigned to the worker. If the result is incomplete or incorrect, delegate a focused follow-up or correct the gap while verifying.

Before responding, verify the result in proportion to its risk and present the user with the outcome, important decisions, and checks performed.`;

export const MINIONS_WORKER_PROMPT = `You are the Minions worker. Execute the delegated task directly and completely.

Never delegate, spawn, or call another subagent. Use your available tools to investigate, implement, test, and review the assigned work. Respect the task's scope and the repository's existing conventions. Verify your work in proportion to its risk.

Return a concise report containing the result, files or behavior changed, checks performed, and any unresolved risks or blockers.`;

export type MinionsRoleKind = "primary" | "worker";
export type MinionsRoleVisibility = "selectable" | "hidden";

export interface MinionsRoleContract {
  readonly id: string;
  readonly kind: MinionsRoleKind;
  readonly visibility: MinionsRoleVisibility;
  readonly description: string;
  readonly prompt: string;
  readonly model: {
    /**
     * The host adapter must not pin a model for this role. The host therefore
     * uses the model selected for the calling conversation.
     */
    readonly strategy: "inherit";
  };
  readonly delegation:
    | {
        readonly enabled: true;
        readonly allowedRoleIds: readonly string[];
      }
    | {
        readonly enabled: false;
      };
}

export interface MinionsDelegationContract {
  readonly primary: MinionsRoleContract;
  readonly worker: MinionsRoleContract;
}

/**
 * Build a fresh host-neutral contract so adapters can map it without sharing
 * mutable host configuration between plugin instances.
 */
export function createMinionsDelegationContract(): MinionsDelegationContract {
  return {
    primary: {
      id: MINIONS_PRIMARY_ID,
      kind: "primary",
      visibility: "selectable",
      description: MINIONS_PRIMARY_DESCRIPTION,
      prompt: MINIONS_PRIMARY_PROMPT,
      model: { strategy: "inherit" },
      delegation: {
        enabled: true,
        allowedRoleIds: [MINIONS_WORKER_ID],
      },
    },
    worker: {
      id: MINIONS_WORKER_ID,
      kind: "worker",
      visibility: "hidden",
      description: MINIONS_WORKER_DESCRIPTION,
      prompt: MINIONS_WORKER_PROMPT,
      model: { strategy: "inherit" },
      delegation: { enabled: false },
    },
  };
}
