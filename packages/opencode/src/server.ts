import {
  createMinionsDelegationContract,
  MINIONS_PRIMARY_ID,
  MINIONS_WORKER_ID,
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
  readonly mode: "primary" | "subagent";
  readonly hidden?: boolean;
  readonly prompt: string;
  readonly model?: string;
  readonly permission: {
    readonly task: PermissionAction | Readonly<Record<string, PermissionAction>>;
  };
}

export interface MinionsOpenCodeAgents {
  readonly minions: OpenCodeAgentDefinition;
  readonly "minions-worker": OpenCodeAgentDefinition;
}

/**
 * Map the host-neutral roles to OpenCode v1 agent configuration.
 *
 * OpenCode v1 inherits the calling message's model for a subagent when the
 * subagent has no configured model. The primary therefore always omits
 * `model`; the worker pins only a selected model confirmed by the TUI's
 * connected-model catalogue.
 */
export function createOpenCodeAgents(
  preference: WorkerModelPreference = { availableModelIds: [] },
): MinionsOpenCodeAgents {
  const contract = createMinionsDelegationContract();
  const workerModel = effectiveWorkerModel(preference);

  return {
    [MINIONS_PRIMARY_ID]: {
      description: contract.primary.description,
      mode: "primary",
      prompt: contract.primary.prompt,
      permission: {
        task: {
          "*": "deny",
          [MINIONS_WORKER_ID]: "allow",
        },
      },
    },
    [MINIONS_WORKER_ID]: {
      description: contract.worker.description,
      mode: "subagent",
      hidden: true,
      prompt: contract.worker.prompt,
      ...(workerModel ? { model: workerModel } : {}),
      permission: {
        task: "deny",
      },
    },
  };
}

/**
 * Install Minions without changing the user's default agent or global tools.
 * Reserved Minions role IDs are replaced atomically so user configuration
 * cannot accidentally weaken the delegation boundary.
 */
export function applyMinionsConfig(
  config: Config,
  preference: WorkerModelPreference = { availableModelIds: [] },
): void {
  config.agent = {
    ...config.agent,
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
  id: MINIONS_PRIMARY_ID,
  server: async () => createMinionsHooks(),
} satisfies PluginModule;

export default plugin;
