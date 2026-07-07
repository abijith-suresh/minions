import { MINIONS_PLUGIN_ID, type MinionsAgentOwnership } from "@minions/core";
import type { TuiDialogSelectOption, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { Agent, AgentConfig, Config, Provider } from "@opencode-ai/sdk/v2";

type AgentMode = "primary" | "subagent" | "all";
type MinionsMenuAction = "agents" | "diagnostics";
type AgentAction = "description" | "mode" | "model" | "prompt" | "visibility" | "disable";

interface WorkerModel {
  readonly id: string;
  readonly providerName: string;
  readonly name: string;
}

interface ManagedAgent {
  readonly id: string;
  readonly description: string | undefined;
  readonly mode: AgentMode;
  readonly ownership: MinionsAgentOwnership;
  readonly hidden: boolean;
  readonly disabled: boolean;
  readonly model: string | undefined;
  readonly prompt: string | undefined;
  readonly permissionSummary: string;
}

async function activeDirectory(api: TuiPluginApi): Promise<string | undefined> {
  const pathResult = await api.client.path.get({}, { throwOnError: true });
  return pathResult.data?.directory;
}

function directoryParameter(directory?: string): { directory?: string } {
  return directory ? { directory } : {};
}

function reportMinionsError(api: TuiPluginApi, error: unknown): void {
  api.ui.toast({
    variant: "error",
    message: error instanceof Error ? error.message : "Minions action failed",
  });
}

function modelId(model?: { providerID: string; modelID: string } | string): string | undefined {
  if (!model) return undefined;
  if (typeof model === "string") return model;
  return `${model.providerID}/${model.modelID}`;
}

function agentConfigFor(config: Config, agentId: string): AgentConfig {
  return { ...(config.agent?.[agentId] ?? {}) };
}

function configuredAgentIds(config: Config): ReadonlySet<string> {
  return new Set(Object.keys(config.agent ?? {}));
}

function ownershipFor(agent: Agent, config: Config): MinionsAgentOwnership {
  if (agent.name.startsWith("minions.")) return "minions";
  if ("builtIn" in agent && agent.builtIn && !configuredAgentIds(config).has(agent.name)) {
    return "built-in";
  }
  if ("native" in agent && agent.native && !configuredAgentIds(config).has(agent.name)) {
    return "built-in";
  }
  if (configuredAgentIds(config).has(agent.name)) return "user";
  return "unknown";
}

function permissionSummary(agent: Agent): string {
  const permission = agent.permission as unknown;
  if (!permission) return "no permissions reported";

  if (Array.isArray(permission)) {
    if (permission.length === 0) return "no permissions reported";
    return `${permission.length} permission rules`;
  }

  if (typeof permission !== "object") return String(permission);

  const entries = Object.entries(permission as Record<string, unknown>);
  if (entries.length === 0) return "no permissions reported";

  return entries
    .slice(0, 4)
    .map(([name, value]) => {
      if (typeof value === "string") return `${name}:${value}`;
      if (Array.isArray(value)) return `${name}:${value.length}`;
      if (value && typeof value === "object") return `${name}:${Object.keys(value).length}`;
      return `${name}:${String(value)}`;
    })
    .join(" ");
}

function normalizeAgent(agent: Agent, config: Config): ManagedAgent {
  const configured = agentConfigFor(config, agent.name);
  return {
    id: agent.name,
    description: configured.description ?? agent.description,
    mode: configured.mode ?? agent.mode,
    ownership: ownershipFor(agent, config),
    hidden: configured.hidden ?? agent.hidden ?? false,
    disabled: configured.disable ?? false,
    model: configured.model ?? modelId(agent.model),
    prompt: configured.prompt ?? agent.prompt,
    permissionSummary: permissionSummary(agent),
  };
}

function availableModels(providers: readonly Provider[]): WorkerModel[] {
  return providers
    .flatMap((provider) =>
      Object.values(provider.models ?? {}).map((model) => ({
        id: `${provider.id}/${model.id}`,
        providerName: provider.name,
        name: model.name,
      })),
    )
    .sort(
      (left, right) =>
        left.providerName.localeCompare(right.providerName) || left.name.localeCompare(right.name),
    );
}

async function reloadOpenCode(api: TuiPluginApi): Promise<void> {
  await api.client.instance.dispose({}, { throwOnError: true });
}

async function loadAgents(api: TuiPluginApi): Promise<ManagedAgent[]> {
  const directory = await activeDirectory(api);
  const location = directoryParameter(directory);
  const [agentsResult, configResult] = await Promise.all([
    api.client.app.agents(location, { throwOnError: true }),
    api.client.config.get(location, { throwOnError: true }),
  ]);
  const config = configResult.data ?? {};
  return (agentsResult.data ?? [])
    .map((agent) => normalizeAgent(agent, config))
    .sort((left, right) => {
      const modeOrder = modeRank(left.mode) - modeRank(right.mode);
      return modeOrder || left.id.localeCompare(right.id);
    });
}

function modeRank(mode: AgentMode): number {
  if (mode === "primary") return 0;
  if (mode === "all") return 1;
  return 2;
}

async function updateAgentConfig(
  api: TuiPluginApi,
  agentId: string,
  update: (current: AgentConfig) => AgentConfig,
): Promise<void> {
  const directory = await activeDirectory(api);
  const location = directoryParameter(directory);
  const configResult = await api.client.config.get(location, { throwOnError: true });
  const config = configResult.data ?? {};
  const agents = { ...(config.agent ?? {}) };
  agents[agentId] = update({ ...(agents[agentId] ?? {}) });

  await api.client.config.update(
    {
      ...location,
      config: {
        ...config,
        agent: agents,
      },
    },
    { throwOnError: true },
  );
  await reloadOpenCode(api);
}

function openPromptEditor(api: TuiPluginApi, agent: ManagedAgent): void {
  api.ui.dialog.replace(() =>
    api.ui.DialogPrompt({
      title: `Prompt: ${agent.id}`,
      placeholder: "Agent system prompt",
      value: agent.prompt ?? "",
      onConfirm: (value) => {
        void updateAgentConfig(api, agent.id, (current) => {
          const next = { ...current };
          if (value.trim()) next.prompt = value;
          else delete next.prompt;
          return next;
        })
          .then(() => {
            api.ui.toast({ variant: "success", message: `Updated ${agent.id} prompt` });
            openAgents(api);
          })
          .catch((error) => reportMinionsError(api, error));
      },
    }),
  );
}

function openDescriptionEditor(api: TuiPluginApi, agent: ManagedAgent): void {
  api.ui.dialog.replace(() =>
    api.ui.DialogPrompt({
      title: `Description: ${agent.id}`,
      placeholder: "When should this agent be used?",
      value: agent.description ?? "",
      onConfirm: (value) => {
        void updateAgentConfig(api, agent.id, (current) => {
          const next = { ...current };
          if (value.trim()) next.description = value;
          else delete next.description;
          return next;
        })
          .then(() => {
            api.ui.toast({ variant: "success", message: `Updated ${agent.id} description` });
            openAgents(api);
          })
          .catch((error) => reportMinionsError(api, error));
      },
    }),
  );
}

function openModeSelector(api: TuiPluginApi, agent: ManagedAgent): void {
  const options: TuiDialogSelectOption<AgentMode>[] = [
    { title: "Primary", value: "primary", description: "Shown as a primary chat agent" },
    { title: "Subagent", value: "subagent", description: "Invoked by primary agents or @ mention" },
    { title: "All", value: "all", description: "Available as both primary and subagent" },
  ];

  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<AgentMode>({
      title: `Mode: ${agent.id}`,
      current: agent.mode,
      options,
      onSelect: (option) => {
        void updateAgentConfig(api, agent.id, (current) => ({ ...current, mode: option.value }))
          .then(() => {
            api.ui.toast({
              variant: "success",
              message: `Set ${agent.id} mode to ${option.value}`,
            });
            openAgents(api);
          })
          .catch((error) => reportMinionsError(api, error));
      },
    }),
  );
}

function openModelSelector(api: TuiPluginApi, agent: ManagedAgent): void {
  void activeDirectory(api)
    .then((directory) =>
      api.client.config.providers(directoryParameter(directory), { throwOnError: true }),
    )
    .then((providersResult) => {
      const models = availableModels(providersResult.data?.providers ?? []);
      const options: TuiDialogSelectOption<string>[] = [
        {
          title: "Use OpenCode default",
          value: "",
          description: "Remove the agent-specific model override",
        },
        ...models.map((model) => ({
          title: model.name,
          value: model.id,
          category: model.providerName,
          description: model.id,
        })),
      ];

      api.ui.dialog.replace(() =>
        api.ui.DialogSelect<string>({
          title: `Model: ${agent.id}`,
          placeholder: "Search connected models",
          current: agent.model ?? "",
          options,
          onSelect: (option) => {
            void updateAgentConfig(api, agent.id, (current) => {
              const next = { ...current };
              if (option.value) next.model = option.value;
              else delete next.model;
              return next;
            })
              .then(() => {
                api.ui.toast({
                  variant: "success",
                  message: option.value
                    ? `Set ${agent.id} model to ${option.value}`
                    : `Removed ${agent.id} model override`,
                });
                openAgents(api);
              })
              .catch((error) => reportMinionsError(api, error));
          },
        }),
      );
    })
    .catch((error) => reportMinionsError(api, error));
}

function toggleVisibility(api: TuiPluginApi, agent: ManagedAgent): void {
  void updateAgentConfig(api, agent.id, (current) => ({ ...current, hidden: !agent.hidden }))
    .then(() => {
      api.ui.toast({
        variant: "success",
        message: agent.hidden ? `${agent.id} is visible` : `${agent.id} is hidden`,
      });
      openAgents(api);
    })
    .catch((error) => reportMinionsError(api, error));
}

function toggleDisabled(api: TuiPluginApi, agent: ManagedAgent): void {
  void updateAgentConfig(api, agent.id, (current) => ({ ...current, disable: !agent.disabled }))
    .then(() => {
      api.ui.toast({
        variant: "success",
        message: agent.disabled ? `${agent.id} is enabled` : `${agent.id} is disabled`,
      });
      openAgents(api);
    })
    .catch((error) => reportMinionsError(api, error));
}

function openAgentDetails(api: TuiPluginApi, agent: ManagedAgent): void {
  const status = [
    `${agent.ownership} ${agent.mode}`,
    agent.hidden ? "hidden" : "visible",
    agent.disabled ? "disabled" : "enabled",
    agent.model ?? "default model",
  ].join(" · ");

  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<AgentAction>({
      title: agent.id,
      placeholder: "Choose an agent setting",
      options: [
        {
          title: "Description",
          value: "description",
          description: agent.description || "No description configured",
        },
        {
          title: "Mode",
          value: "mode",
          description: status,
        },
        {
          title: "Model",
          value: "model",
          description: agent.model ?? "Uses OpenCode default model",
        },
        {
          title: "Prompt",
          value: "prompt",
          description: agent.prompt ? `${agent.prompt.length} characters` : "No prompt override",
        },
        {
          title: agent.hidden ? "Make visible" : "Hide",
          value: "visibility",
          description: "Toggle OpenCode agent visibility",
        },
        {
          title: agent.disabled ? "Enable" : "Disable",
          value: "disable",
          description: "Toggle whether OpenCode can use this agent",
        },
      ],
      onSelect: (option) => {
        if (option.value === "description") openDescriptionEditor(api, agent);
        if (option.value === "mode") openModeSelector(api, agent);
        if (option.value === "model") openModelSelector(api, agent);
        if (option.value === "prompt") openPromptEditor(api, agent);
        if (option.value === "visibility") toggleVisibility(api, agent);
        if (option.value === "disable") toggleDisabled(api, agent);
      },
    }),
  );
}

export function openAgents(api: TuiPluginApi): void {
  void loadAgents(api)
    .then((agents) => {
      api.ui.dialog.replace(() =>
        api.ui.DialogSelect<string>({
          title: "Agents",
          placeholder: "Search agents",
          options: agents.map((agent) => ({
            title: agent.id,
            value: agent.id,
            category: agent.ownership,
            description: [
              agent.mode,
              agent.hidden ? "hidden" : "visible",
              agent.disabled ? "disabled" : "enabled",
              agent.model ?? "default model",
              agent.permissionSummary,
            ].join(" · "),
          })),
          onSelect: (option) => {
            const agent = agents.find(({ id }) => id === option.value);
            if (agent) openAgentDetails(api, agent);
          },
        }),
      );
    })
    .catch((error) => reportMinionsError(api, error));
}

function openDiagnostics(api: TuiPluginApi): void {
  void api.client.path
    .get({}, { throwOnError: true })
    .then(async (pathResult) => {
      const directory = pathResult.data?.directory;
      const location = directoryParameter(directory);
      const [agentsResult, providersResult] = await Promise.all([
        api.client.app.agents(location, { throwOnError: true }),
        api.client.config.providers(location, { throwOnError: true }),
      ]);
      return { pathResult, agentsResult, providersResult };
    })
    .then(({ pathResult, agentsResult, providersResult }) => {
      api.ui.dialog.replace(() =>
        api.ui.DialogAlert({
          title: "Minions diagnostics",
          message: [
            `Plugin: ${MINIONS_PLUGIN_ID}`,
            `Agents detected: ${agentsResult.data?.length ?? 0}`,
            `Providers connected: ${providersResult.data?.providers?.length ?? 0}`,
            `Config directory: ${pathResult.data?.config ?? "unknown"}`,
            `State directory: ${pathResult.data?.state ?? "unknown"}`,
            `Workspace: ${pathResult.data?.directory ?? "unknown"}`,
          ].join("\n"),
        }),
      );
    })
    .catch((error) => reportMinionsError(api, error));
}

export function openMinionsManager(api: TuiPluginApi): void {
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<MinionsMenuAction>({
      title: "Minions",
      placeholder: "Choose what to manage",
      options: [
        {
          title: "Agents",
          value: "agents",
          description: "Inspect and edit OpenCode agent configuration",
        },
        {
          title: "Diagnostics",
          value: "diagnostics",
          description: "Show detected OpenCode paths, agents, and providers",
        },
      ],
      onSelect: (option) => {
        if (option.value === "agents") {
          openAgents(api);
          return;
        }
        openDiagnostics(api);
      },
    }),
  );
}

export async function registerMinionsManager(api: TuiPluginApi): Promise<void> {
  api.command?.register(() => [
    {
      title: "Open Minions",
      value: "minions.open",
      description: "Manage OpenCode agents, models, prompts, visibility, and diagnostics",
      category: "Minions",
      slash: {
        name: "minions",
      },
      onSelect: () => openMinionsManager(api),
    },
  ]);
}

const plugin = {
  id: MINIONS_PLUGIN_ID,
  tui: async (api) => {
    await registerMinionsManager(api);
  },
} satisfies TuiPluginModule;

export default plugin;
