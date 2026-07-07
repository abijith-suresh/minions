export const MINIONS_CORE_VERSION = 1;

export const MINIONS_PLUGIN_ID = "minions";
export const MINIONS_MANAGED_STATE_VERSION = 1;

export type MinionsAgentOwnership = "built-in" | "user" | "minions" | "unknown";

export interface MinionsAgentSummary {
  readonly id: string;
  readonly ownership: MinionsAgentOwnership;
}
