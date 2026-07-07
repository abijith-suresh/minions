import { MINIONS_DEFAULT_SUBAGENT_ID, MINIONS_PLUGIN_ID } from "@minions/core";
import type { TuiDialogSelectOption, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { installMinionsDelegateSkill } from "./skill.js";
import {
  availableWorkerModels,
  effectiveWorkerModel,
  readWorkerModelPreference,
  type WorkerModel,
  writeWorkerModelPreference,
} from "./worker-model.js";

const INHERIT_MODEL = "__minions_inherit__";

export function createWorkerModelOptions(
  models: readonly WorkerModel[],
  selectedModel?: string,
): TuiDialogSelectOption<string>[] {
  const options: TuiDialogSelectOption<string>[] = [
    {
      title: "Inherit primary model",
      value: INHERIT_MODEL,
      description: "Use the model selected for the current conversation",
    },
  ];

  if (selectedModel && !models.some((model) => model.id === selectedModel)) {
    options.push({
      title: selectedModel,
      value: selectedModel,
      description: "Unavailable — currently inheriting the primary model",
      disabled: true,
    });
  }

  options.push(
    ...models.map((model) => ({
      title: model.name,
      value: model.id,
      description: `${model.providerName} · ${model.id}`,
      category: model.providerName,
    })),
  );
  return options;
}

interface WorkerModelSnapshot {
  readonly models: readonly WorkerModel[];
  readonly stateDirectory: string;
}

type MinionsMenuAction = "delegation-skill" | "minion-model" | "diagnostics";

async function workerModelSnapshot(api: TuiPluginApi): Promise<WorkerModelSnapshot> {
  const [pathResult, providersResult] = await Promise.all([
    api.client.path.get({}, { throwOnError: true }),
    api.client.config.providers({}, { throwOnError: true }),
  ]);
  const stateDirectory = pathResult.data?.state;
  if (!stateDirectory) throw new Error("OpenCode did not provide its global state directory");

  return {
    stateDirectory,
    models: availableWorkerModels(providersResult.data?.providers ?? []),
  };
}

async function reloadOpenCode(api: TuiPluginApi): Promise<void> {
  await api.client.instance.dispose({}, { throwOnError: true });
}

async function refreshWorkerModelAvailability(api: TuiPluginApi): Promise<void> {
  const { models, stateDirectory } = await workerModelSnapshot(api);
  const availableModelIds = models.map((model) => model.id);
  const saved = await readWorkerModelPreference(stateDirectory);
  const refreshed = { ...saved, availableModelIds };
  const availabilityChanged =
    saved.availableModelIds.length !== availableModelIds.length ||
    saved.availableModelIds.some((id, index) => id !== availableModelIds[index]);

  if (!availabilityChanged) return;

  await writeWorkerModelPreference(refreshed, stateDirectory);
  if (effectiveWorkerModel(saved) !== effectiveWorkerModel(refreshed)) {
    await reloadOpenCode(api);
  }
}

function reportWorkerModelError(api: TuiPluginApi, error: unknown): void {
  api.ui.toast({
    variant: "error",
    message: error instanceof Error ? error.message : "Could not update the minion model",
  });
}

function reportMinionsError(api: TuiPluginApi, error: unknown): void {
  api.ui.toast({
    variant: "error",
    message: error instanceof Error ? error.message : "Minions action failed",
  });
}

function installDelegationSkill(api: TuiPluginApi): void {
  void api.client.path
    .get({}, { throwOnError: true })
    .then(async (pathResult) => {
      const configDirectory = pathResult.data?.config;
      if (!configDirectory) throw new Error("OpenCode did not provide its global config directory");

      const skillPath = await installMinionsDelegateSkill(configDirectory);
      api.ui.toast({
        variant: "success",
        message: `Installed minions-delegate skill at ${skillPath}`,
      });
      api.ui.dialog.replace(() =>
        api.ui.DialogAlert({
          title: "Delegation skill installed",
          message: [
            "Installed or updated the minions-delegate skill.",
            "",
            `Path: ${skillPath}`,
            "",
            "If OpenCode does not show the skill immediately, restart or reload OpenCode.",
            "Invoke it explicitly, for example: use the minions-delegate skill for this task.",
          ].join("\n"),
        }),
      );
    })
    .catch((error) => reportMinionsError(api, error));
}

function openMinionModelSelector(api: TuiPluginApi): void {
  void workerModelSnapshot(api)
    .then(async ({ models, stateDirectory }) => {
      const current = await readWorkerModelPreference(stateDirectory);
      api.ui.dialog.replace(() =>
        api.ui.DialogSelect<string>({
          title: "Minion model",
          placeholder: "Search connected models",
          current: current.workerModel ?? INHERIT_MODEL,
          options: createWorkerModelOptions(models, current.workerModel),
          onSelect: (option) => {
            const workerModel = option.value === INHERIT_MODEL ? undefined : option.value;
            void writeWorkerModelPreference(
              {
                ...(workerModel ? { workerModel } : {}),
                availableModelIds: models.map((model) => model.id),
              },
              stateDirectory,
            )
              .then(() => reloadOpenCode(api))
              .then(() => {
                api.ui.dialog.clear();
                api.ui.toast({
                  variant: "success",
                  message: workerModel
                    ? `Minion model set to ${workerModel}`
                    : "Minion now inherits the primary model",
                });
              })
              .catch((error) => reportWorkerModelError(api, error));
          },
        }),
      );
    })
    .catch((error) => reportWorkerModelError(api, error));
}

function openDiagnostics(api: TuiPluginApi): void {
  void workerModelSnapshot(api)
    .then(async ({ models, stateDirectory }) => {
      const current = await readWorkerModelPreference(stateDirectory);
      const effectiveModel = effectiveWorkerModel(current) ?? "inherits primary model";

      api.ui.dialog.replace(() =>
        api.ui.DialogAlert({
          title: "Minions diagnostics",
          message: [
            `Plugin: ${MINIONS_PLUGIN_ID}`,
            `Managed subagent: ${MINIONS_DEFAULT_SUBAGENT_ID}`,
            `Minion model: ${effectiveModel}`,
            `Connected tool-capable models: ${models.length}`,
            `State directory: ${stateDirectory}`,
          ].join("\n"),
        }),
      );
    })
    .catch((error) => reportWorkerModelError(api, error));
}

export function openMinionsManager(api: TuiPluginApi): void {
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<MinionsMenuAction>({
      title: "Minions",
      placeholder: "Choose what to configure",
      options: [
        {
          title: "Minion model",
          value: "minion-model",
          description: "Choose the model used by the hidden minion subagent",
        },
        {
          title: "Delegation skill",
          value: "delegation-skill",
          description: "Install or update the explicitly invoked minions-delegate skill",
        },
        {
          title: "Diagnostics",
          value: "diagnostics",
          description: "Show the runtime state Minions is injecting",
        },
      ],
      onSelect: (option) => {
        if (option.value === "delegation-skill") {
          installDelegationSkill(api);
          return;
        }
        if (option.value === "minion-model") {
          openMinionModelSelector(api);
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
      description: "Manage Minions agents, models, permissions, and diagnostics",
      category: "Minions",
      slash: {
        name: "minions",
      },
      onSelect: () => openMinionsManager(api),
    },
  ]);

  api.event.on("server.instance.disposed", () => {
    void refreshWorkerModelAvailability(api).catch((error) => reportWorkerModelError(api, error));
  });

  await refreshWorkerModelAvailability(api).catch((error) => reportWorkerModelError(api, error));
}

const plugin = {
  id: MINIONS_PLUGIN_ID,
  tui: async (api) => {
    await registerMinionsManager(api);
  },
} satisfies TuiPluginModule;

export default plugin;
