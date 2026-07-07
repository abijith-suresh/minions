export const MINIONS_CORE_VERSION = 1;

export const MINIONS_PLUGIN_ID = "minions";
export const MINIONS_DEFAULT_SUBAGENT_ID = "minion";

export const MINIONS_DEFAULT_SUBAGENT_DESCRIPTION =
  "Hidden Minions-managed subagent for explicitly delegated repository and tool work.";

export const MINIONS_DEFAULT_SUBAGENT_PROMPT = `You are minion, a Minions-managed OpenCode subagent.

Execute only the task explicitly delegated to you. Inspect relevant evidence before making assumptions, follow repository instructions and conventions, preserve unrelated work, and do not expand the task. Never delegate to another agent.

Complete requested changes rather than merely describing them. Verify the result in proportion to risk, then stop once the requested outcome and relevant checks are complete. Return a concise report with the outcome, specific evidence, files or behavior changed, checks performed, and unresolved risks or blockers.`;

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
