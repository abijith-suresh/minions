import { MINIONS_PLUGIN_ID } from "@minions/core";
import type { Config, Hooks, PluginModule } from "@opencode-ai/plugin";

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

export type MinionsOpenCodeAgents = Readonly<Record<string, OpenCodeAgentDefinition>>;

export function createOpenCodeAgents(): MinionsOpenCodeAgents {
  return {};
}

export function applyMinionsConfig(_config: Config): void {
  // Minions is now a TUI-first agent manager. It does not inject agents at startup.
}

export function createMinionsHooks(): Hooks {
  return {
    config: async (config: Config) => {
      applyMinionsConfig(config);
    },
  };
}

const plugin = {
  id: MINIONS_PLUGIN_ID,
  server: async () => createMinionsHooks(),
} satisfies PluginModule;

export default plugin;
