import {
  createMinionsDelegationContract,
  MINIONS_PRIMARY_ID,
  MINIONS_WORKER_ID,
} from "@minions/core";
import type { Config, Hooks, PluginModule } from "@opencode-ai/plugin";

type PermissionAction = "allow" | "deny";

export interface OpenCodeAgentDefinition {
  readonly description: string;
  readonly mode: "primary" | "subagent";
  readonly hidden?: boolean;
  readonly prompt: string;
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
 * subagent has no configured model, so both role definitions deliberately
 * omit `model`.
 */
export function createOpenCodeAgents(): MinionsOpenCodeAgents {
  const contract = createMinionsDelegationContract();

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
export function applyMinionsConfig(config: Config): void {
  config.agent = {
    ...config.agent,
    ...createOpenCodeAgents(),
  } as unknown as NonNullable<Config["agent"]>;
}

export function createMinionsHooks(): Hooks {
  return {
    config: async (config) => {
      applyMinionsConfig(config);
    },
  };
}

const plugin = {
  id: MINIONS_PRIMARY_ID,
  server: async () => createMinionsHooks(),
} satisfies PluginModule;

export default plugin;
