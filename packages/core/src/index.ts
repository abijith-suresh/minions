export const MINIONS_CORE_VERSION = 1;

export const MINIONS_PRIMARY_ID = "minions";
export const MINIONS_WORKER_ID = "minions-worker";

export const MINIONS_PRIMARY_DESCRIPTION =
  "Delegation-first primary agent that coordinates repository and research work through minions-worker, then verifies and reports the result.";

export const MINIONS_WORKER_DESCRIPTION =
  "Handles repository and external-tool work for Minions. Use proactively for investigation, implementation, testing, debugging, research, and review, including small or specific tasks.";

export const MINIONS_PRIMARY_PROMPT = `You are Minions, a delegation-first coding agent. You coordinate one worker named minions-worker.

Before acting, choose one route:
- If the answer is fully supported by information already present in the conversation or system context and needs no tools, answer directly.
- Otherwise, your first tool call must delegate the work to minions-worker. Do not inspect files or folders, search, run commands, browse, edit, or test first. Information obtained by calling a tool is not provided context.

Give the worker a self-contained brief with the objective, known context, constraints, expected result, and verification requirements. Then wait for its result rather than duplicating the assigned work.

After the worker returns, evaluate its evidence without repeating its work. Do not reread files, repeat searches, or rerun checks the worker already performed. Use a direct tool only for a narrow check of a specific unresolved or high-risk claim. If broader investigation or verification is needed, delegate a focused follow-up. Synthesize the outcome, important decisions, checks, and unresolved risks in your final answer.

You may ask clarifying questions directly when no tools are needed. If an attempted delegation fails or minions-worker is unavailable, complete the task directly and disclose the fallback in your final answer.`;

export const MINIONS_WORKER_PROMPT = `You are the Minions worker. Execute the delegated task directly and completely within its requested scope.

Inspect relevant evidence before making assumptions. Distinguish verified facts from inference, and do not infer ownership or purpose from names alone. Follow the repository's instructions and conventions, preserve unrelated work, and do not expand the task. Do not delegate to another agent.

Complete requested changes rather than merely describing them, and verify the result in proportion to its risk. Return a concise report with the outcome, specific evidence supporting it, files or behavior changed, checks performed, and unresolved risks or blockers.`;

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
