import type { TuiDialogSelectOption, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
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
    message: error instanceof Error ? error.message : "Could not update the worker model",
  });
}

export async function registerWorkerModelSelector(api: TuiPluginApi): Promise<void> {
  api.command?.register(() => [
    {
      title: "Select Minions worker model",
      value: "minions.worker-model",
      description: "Choose the model used by the hidden Minions worker",
      category: "Minions",
      slash: {
        name: "minions-model",
      },
      onSelect: () => {
        void workerModelSnapshot(api)
          .then(async ({ models, stateDirectory }) => {
            const current = await readWorkerModelPreference(stateDirectory);
            api.ui.dialog.replace(() =>
              api.ui.DialogSelect<string>({
                title: "Minions worker model",
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
                          ? `Worker model set to ${workerModel}`
                          : "Worker model now inherits the primary model",
                      });
                    })
                    .catch((error) => reportWorkerModelError(api, error));
                },
              }),
            );
          })
          .catch((error) => reportWorkerModelError(api, error));
      },
    },
  ]);

  api.event.on("server.instance.disposed", () => {
    void refreshWorkerModelAvailability(api).catch((error) => reportWorkerModelError(api, error));
  });

  await refreshWorkerModelAvailability(api).catch((error) => reportWorkerModelError(api, error));
}

const plugin = {
  id: "minions",
  tui: async (api) => {
    await registerWorkerModelSelector(api);
  },
} satisfies TuiPluginModule;

export default plugin;
