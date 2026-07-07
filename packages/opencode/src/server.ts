import {
  createDefaultMinionContract,
  MINIONS_DEFAULT_SUBAGENT_ID,
  MINIONS_PLUGIN_ID,
} from "@minions/core";
import type { Config, Hooks, PluginModule } from "@opencode-ai/plugin";
import {
  effectiveWorkerModel,
  readWorkerModelPreference,
  type WorkerModelPreference,
} from "./worker-model.js";

type PermissionAction = "allow" | "deny";

export interface OpenCodeAgentDefinition {
  readonly description: string;
  readonly mode: "subagent";
  readonly hidden?: boolean;
  readonly prompt: string;
  readonly model?: string;
  readonly permission: {
    readonly task: PermissionAction | Readonly<Record<string, PermissionAction>>;
  };
}

export type MinionsOpenCodeAgents = Readonly<
  Record<typeof MINIONS_DEFAULT_SUBAGENT_ID, OpenCodeAgentDefinition>
>;

const MINIONS_LEGACY_AGENT_IDS = ["minions", "minions-worker"] as const;

/**
 * Map the host-neutral default subagent to OpenCode v1 agent configuration.
 *
 * OpenCode v1 inherits the calling message's model for a subagent when the
 * subagent has no configured model. Minions pins only a selected model
 * confirmed by the TUI's connected-model catalogue.
 */
export function createOpenCodeAgents(
  preference: WorkerModelPreference = { availableModelIds: [] },
): MinionsOpenCodeAgents {
  const minion = createDefaultMinionContract();
  const workerModel = effectiveWorkerModel(preference);

  return {
    [MINIONS_DEFAULT_SUBAGENT_ID]: {
      description: minion.description,
      mode: "subagent",
      hidden: true,
      prompt: minion.prompt,
      ...(workerModel ? { model: workerModel } : {}),
      permission: {
        task: "deny",
      },
    },
  };
}

/**
 * Install Minions-managed agents without changing the user's default agent or
 * global tools. Reserved Minions definitions are replaced atomically so user
 * configuration cannot accidentally weaken the boundary.
 */
export function applyMinionsConfig(
  config: Config,
  preference: WorkerModelPreference = { availableModelIds: [] },
): void {
  const existingAgents = { ...config.agent } as Record<string, unknown>;
  for (const agentId of MINIONS_LEGACY_AGENT_IDS) {
    delete existingAgents[agentId];
  }

  config.agent = {
    ...existingAgents,
    ...createOpenCodeAgents(preference),
  } as unknown as NonNullable<Config["agent"]>;
}

export function createMinionsHooks(
  readPreference: () => Promise<WorkerModelPreference> = () => readWorkerModelPreference(),
): Hooks {
  return {
    config: async (config) => {
      applyMinionsConfig(config, await readPreference());
    },
  };
}

const plugin = {
  id: MINIONS_PLUGIN_ID,
  server: async () => createMinionsHooks(),
} satisfies PluginModule;

export default plugin;
