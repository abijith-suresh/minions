import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const MINIONS_MINION_MODEL_STATE_FILE = "minion-model.json";
export const MINIONS_LEGACY_WORKER_MODEL_STATE_FILE = "minions-worker-model.json";

export interface WorkerModelPreference {
  readonly workerModel?: string;
  readonly availableModelIds: readonly string[];
}

export interface WorkerModel {
  readonly id: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly name: string;
}

export interface WorkerModelProvider {
  readonly id: string;
  readonly name: string;
  readonly models: Readonly<
    Record<
      string,
      {
        readonly id: string;
        readonly name: string;
        readonly status?: "alpha" | "beta" | "deprecated" | "active";
        readonly capabilities: {
          readonly toolcall: boolean;
        };
      }
    >
  >;
}

function isModelId(value: unknown): value is string {
  return typeof value === "string" && value.includes("/") && !value.startsWith("/");
}

export function defaultOpenCodeStateDirectory(): string {
  const stateHome = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(stateHome, "opencode");
}

export function workerModelStatePath(stateDirectory = defaultOpenCodeStateDirectory()): string {
  return join(stateDirectory, MINIONS_MINION_MODEL_STATE_FILE);
}

export function legacyWorkerModelStatePath(
  stateDirectory = defaultOpenCodeStateDirectory(),
): string {
  return join(stateDirectory, MINIONS_LEGACY_WORKER_MODEL_STATE_FILE);
}

async function readWorkerModelStateFile(file: string): Promise<WorkerModelPreference> {
  const parsed = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  const workerModel = isModelId(parsed.workerModel) ? parsed.workerModel : undefined;
  return {
    ...(workerModel ? { workerModel } : {}),
    availableModelIds: Array.isArray(parsed.availableModelIds)
      ? parsed.availableModelIds.filter(isModelId)
      : [],
  };
}

export async function readWorkerModelPreference(
  stateDirectory?: string,
): Promise<WorkerModelPreference> {
  try {
    return await readWorkerModelStateFile(workerModelStatePath(stateDirectory));
  } catch {
    try {
      return await readWorkerModelStateFile(legacyWorkerModelStatePath(stateDirectory));
    } catch {
      return { availableModelIds: [] };
    }
  }
}

export async function writeWorkerModelPreference(
  preference: WorkerModelPreference,
  stateDirectory?: string,
): Promise<void> {
  const file = workerModelStatePath(stateDirectory);
  const temporary = `${file}.${process.pid}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(preference, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

export function availableWorkerModels(providers: readonly WorkerModelProvider[]): WorkerModel[] {
  return providers
    .flatMap((provider) =>
      Object.values(provider.models)
        .filter((model) => model.capabilities.toolcall && model.status !== "deprecated")
        .map((model) => ({
          id: `${provider.id}/${model.id}`,
          providerId: provider.id,
          providerName: provider.name,
          name: model.name,
        })),
    )
    .sort(
      (left, right) =>
        left.providerName.localeCompare(right.providerName) || left.name.localeCompare(right.name),
    );
}

export function effectiveWorkerModel(preference: WorkerModelPreference): string | undefined {
  if (!preference.workerModel) return undefined;
  return preference.availableModelIds.includes(preference.workerModel)
    ? preference.workerModel
    : undefined;
}
