import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Config } from "@opencode-ai/plugin";
import type { TuiCommand, TuiDialogSelectProps, TuiPluginApi } from "@opencode-ai/plugin/tui";
import { describe, expect, test, vi } from "vitest";
import server, { applyMinionsConfig, createMinionsHooks, createOpenCodeAgents } from "./server.ts";
import tui, { createWorkerModelOptions, registerWorkerModelSelector } from "./tui.ts";
import {
  availableWorkerModels,
  effectiveWorkerModel,
  readWorkerModelPreference,
  writeWorkerModelPreference,
} from "./worker-model.ts";

describe("@abijith-suresh/minions-opencode entry points", () => {
  test("exports the server entry point", () => {
    expect(server.id).toBe("minions");
    expect(server.server).toBeTypeOf("function");
  });

  test("exports the TUI entry point", () => {
    expect(tui.id).toBe("minions");
    expect(tui.tui).toBeTypeOf("function");
  });
});

describe("OpenCode agent mapping", () => {
  test("registers a selectable primary and hidden worker", () => {
    const agents = createOpenCodeAgents();

    expect(agents.minions).toMatchObject({
      mode: "primary",
      permission: {
        task: {
          "*": "deny",
          "minions-worker": "allow",
        },
      },
    });
    expect(agents["minions-worker"]).toMatchObject({
      mode: "subagent",
      hidden: true,
      permission: { task: "deny" },
    });
  });

  test("exposes only minions-worker through the primary task permission", () => {
    const taskPermission = createOpenCodeAgents().minions.permission.task;

    expect(taskPermission).toEqual({
      "*": "deny",
      "minions-worker": "allow",
    });
    expect(taskPermission).not.toHaveProperty("general");
    expect(taskPermission).not.toHaveProperty("explore");
  });

  test("retains normal primary tools and prevents worker delegation", () => {
    const agents = createOpenCodeAgents();

    expect(agents.minions).not.toHaveProperty("tools");
    expect(agents.minions.permission).toEqual({
      task: {
        "*": "deny",
        "minions-worker": "allow",
      },
    });
    expect(agents["minions-worker"].permission.task).toBe("deny");
  });

  test("omits fixed models so OpenCode inherits the calling model", () => {
    const agents = createOpenCodeAgents();

    expect(agents.minions).not.toHaveProperty("model");
    expect(agents["minions-worker"]).not.toHaveProperty("model");
  });

  test("pins only an available explicit worker model", () => {
    const available = createOpenCodeAgents({
      workerModel: "openai/gpt-5",
      availableModelIds: ["openai/gpt-5"],
    });
    const unavailable = createOpenCodeAgents({
      workerModel: "openai/gpt-5",
      availableModelIds: [],
    });

    expect(available.minions).not.toHaveProperty("model");
    expect(available["minions-worker"].model).toBe("openai/gpt-5");
    expect(unavailable["minions-worker"]).not.toHaveProperty("model");
  });

  test("adds roles without changing the default agent or unrelated agents", () => {
    const config = {
      default_agent: "build",
      agent: {
        custom: {
          description: "A user-defined agent",
          mode: "subagent",
        },
      },
    } as Config & { default_agent: string };

    applyMinionsConfig(config);

    expect(config.default_agent).toBe("build");
    expect(config.agent?.custom).toEqual({
      description: "A user-defined agent",
      mode: "subagent",
    });
    expect(config.agent?.minions?.mode).toBe("primary");
    expect(config.agent?.["minions-worker"]?.mode).toBe("subagent");
  });

  test("replaces reserved role definitions to preserve boundaries", () => {
    const config = {
      agent: {
        minions: {
          model: "provider/pinned",
          tools: { task: true },
        },
        "minions-worker": {
          model: "provider/pinned",
          tools: { task: true },
        },
      },
    } as Config;

    applyMinionsConfig(config);

    expect(config.agent?.minions).not.toHaveProperty("model");
    expect(config.agent?.minions).not.toHaveProperty("tools");
    expect(config.agent?.["minions-worker"]).not.toHaveProperty("model");
    expect(config.agent?.["minions-worker"]).not.toHaveProperty("tools");
  });

  test("exposes the config mapping through the plugin hook", async () => {
    const config = {} as Config;
    const hooks = createMinionsHooks();

    await hooks.config?.(config);

    expect(config.agent?.minions?.mode).toBe("primary");
    expect(config.agent?.["minions-worker"]?.mode).toBe("subagent");
  });

  test("loads the global worker preference through the config hook", async () => {
    const config = {} as Config;
    const hooks = createMinionsHooks(async () => ({
      workerModel: "openai/gpt-5",
      availableModelIds: ["openai/gpt-5"],
    }));

    await hooks.config?.(config);

    expect(config.agent?.minions).not.toHaveProperty("model");
    expect(config.agent?.["minions-worker"]?.model).toBe("openai/gpt-5");
    expect(config.agent?.["minions-worker"]?.permission).toEqual({
      task: "deny",
    });
  });
});

describe("worker model selection", () => {
  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      models: {
        current: {
          id: "gpt-5",
          name: "GPT-5",
          status: "active" as const,
          capabilities: { toolcall: true },
        },
        textOnly: {
          id: "text-only",
          name: "Text only",
          status: "active" as const,
          capabilities: { toolcall: false },
        },
        old: {
          id: "old",
          name: "Old",
          status: "deprecated" as const,
          capabilities: { toolcall: true },
        },
      },
    },
  ];

  test("lists connected, tool-capable, non-deprecated models", () => {
    expect(availableWorkerModels(providers)).toEqual([
      {
        id: "openai/gpt-5",
        providerId: "openai",
        providerName: "OpenAI",
        name: "GPT-5",
      },
    ]);
  });

  test("falls back to inheritance while retaining an unavailable preference", () => {
    const preference = {
      workerModel: "openai/missing",
      availableModelIds: ["openai/gpt-5"],
    };

    expect(effectiveWorkerModel(preference)).toBeUndefined();
    expect(
      createWorkerModelOptions(availableWorkerModels(providers), preference.workerModel),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "openai/missing",
          disabled: true,
        }),
      ]),
    );
  });

  test("persists the preference globally and supports resetting to inherit", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "minions-model-test-"));

    try {
      await writeWorkerModelPreference(
        {
          workerModel: "openai/gpt-5",
          availableModelIds: ["openai/gpt-5"],
        },
        stateDirectory,
      );
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        workerModel: "openai/gpt-5",
        availableModelIds: ["openai/gpt-5"],
      });

      await writeWorkerModelPreference({ availableModelIds: ["openai/gpt-5"] }, stateDirectory);
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        availableModelIds: ["openai/gpt-5"],
      });
    } finally {
      await rm(stateDirectory, { recursive: true, force: true });
    }
  });

  test("uses the host global state path before reactive TUI state is ready", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "minions-tui-model-test-"));
    let commands: TuiCommand[] = [];
    let select: TuiDialogSelectProps<string> | undefined;
    const dispose = vi.fn(async () => ({ data: true }));
    const api = {
      command: {
        register: (factory: () => TuiCommand[]) => {
          commands = factory();
          return () => {};
        },
      },
      client: {
        config: {
          providers: async () => ({ data: { providers } }),
        },
        instance: { dispose },
        path: {
          get: async () => ({
            data: { state: stateDirectory },
          }),
        },
      },
      event: {
        on: () => () => {},
      },
      state: {
        path: { state: "", directory: "" },
        provider: [],
        ready: false,
      },
      ui: {
        DialogSelect: (props: TuiDialogSelectProps<string>) => {
          select = props;
          return undefined;
        },
        dialog: {
          replace: (render: () => unknown) => {
            render();
          },
          clear: () => {},
        },
        toast: () => {},
      },
    } as unknown as TuiPluginApi;

    try {
      await registerWorkerModelSelector(api);
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        availableModelIds: ["openai/gpt-5"],
      });

      commands[0]?.onSelect?.();
      await vi.waitFor(() => expect(select).toBeDefined());
      const model = select?.options.find((option) => option.value === "openai/gpt-5");
      expect(model).toBeDefined();
      if (!model) throw new Error("Expected the connected model option");
      select?.onSelect?.(model);

      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        workerModel: "openai/gpt-5",
        availableModelIds: ["openai/gpt-5"],
      });
    } finally {
      await rm(stateDirectory, { recursive: true, force: true });
    }
  });

  test("refreshes availability after OpenCode reloads and retains fallback preference", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "minions-tui-reload-test-"));
    let connectedProviders = providers;
    let instanceDisposed: (() => void) | undefined;
    const dispose = vi.fn(async () => ({ data: true }));
    const api = {
      command: {
        register: () => () => {},
      },
      client: {
        config: {
          providers: async () => ({ data: { providers: connectedProviders } }),
        },
        instance: { dispose },
        path: {
          get: async () => ({
            data: { state: stateDirectory },
          }),
        },
      },
      event: {
        on: (_type: string, handler: () => void) => {
          instanceDisposed = handler;
          return () => {};
        },
      },
      ui: {
        toast: () => {},
      },
    } as unknown as TuiPluginApi;

    try {
      await writeWorkerModelPreference(
        {
          workerModel: "openai/gpt-5",
          availableModelIds: ["openai/gpt-5"],
        },
        stateDirectory,
      );
      await registerWorkerModelSelector(api);
      expect(dispose).not.toHaveBeenCalled();

      connectedProviders = [];
      instanceDisposed?.();
      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        workerModel: "openai/gpt-5",
        availableModelIds: [],
      });
    } finally {
      await rm(stateDirectory, { recursive: true, force: true });
    }
  });
});
