import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Config } from "@opencode-ai/plugin";
import type {
  TuiCommand,
  TuiDialogAlertProps,
  TuiDialogSelectProps,
  TuiPluginApi,
} from "@opencode-ai/plugin/tui";
import { describe, expect, test, vi } from "vitest";
import server, { applyMinionsConfig, createMinionsHooks, createOpenCodeAgents } from "./server.ts";
import { installMinionsDelegateSkill, minionsDelegateSkillPath } from "./skill.ts";
import tui, { createWorkerModelOptions, registerMinionsManager } from "./tui.ts";
import {
  availableWorkerModels,
  effectiveWorkerModel,
  legacyWorkerModelStatePath,
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
  test("registers only the hidden minion subagent", () => {
    const agents = createOpenCodeAgents();

    expect(Object.keys(agents)).toEqual(["minion"]);
    expect(agents.minion).toMatchObject({
      mode: "subagent",
      hidden: true,
      permission: { task: "deny" },
    });
  });

  test("does not register a selectable Minions primary", () => {
    expect(createOpenCodeAgents()).not.toHaveProperty("minions");
  });

  test("omits fixed models so OpenCode inherits the calling model", () => {
    expect(createOpenCodeAgents().minion).not.toHaveProperty("model");
  });

  test("pins only an available explicit minion model", () => {
    const available = createOpenCodeAgents({
      workerModel: "openai/gpt-5",
      availableModelIds: ["openai/gpt-5"],
    });
    const unavailable = createOpenCodeAgents({
      workerModel: "openai/gpt-5",
      availableModelIds: [],
    });

    expect(available.minion.model).toBe("openai/gpt-5");
    expect(unavailable.minion).not.toHaveProperty("model");
  });

  test("adds the managed subagent without changing the default agent or unrelated agents", () => {
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
    expect(config.agent?.minion?.mode).toBe("subagent");
    expect(config.agent).not.toHaveProperty("minions");
  });

  test("removes legacy Minions prototype agents from user configuration", () => {
    const config = {
      agent: {
        minions: {
          description: "Legacy primary",
          mode: "primary",
        },
        "minions-worker": {
          description: "Legacy worker",
          mode: "subagent",
        },
        custom: {
          description: "A user-defined agent",
          mode: "subagent",
        },
      },
    } as Config;

    applyMinionsConfig(config);

    expect(config.agent).not.toHaveProperty("minions");
    expect(config.agent).not.toHaveProperty("minions-worker");
    expect(config.agent?.custom).toMatchObject({ description: "A user-defined agent" });
    expect(config.agent?.minion?.mode).toBe("subagent");
  });

  test("replaces the reserved minion definition to preserve boundaries", () => {
    const config = {
      agent: {
        minion: {
          model: "provider/pinned",
          tools: { task: true },
        },
      },
    } as Config;

    applyMinionsConfig(config);

    expect(config.agent?.minion).not.toHaveProperty("tools");
    expect(config.agent?.minion?.permission).toEqual({ task: "deny" });
  });

  test("exposes the config mapping through the plugin hook", async () => {
    const config = {} as Config;
    const hooks = createMinionsHooks();

    await hooks.config?.(config);

    expect(config.agent?.minion?.mode).toBe("subagent");
    expect(config.agent).not.toHaveProperty("minions");
  });

  test("loads the global minion model preference through the config hook", async () => {
    const config = {} as Config;
    const hooks = createMinionsHooks(async () => ({
      workerModel: "openai/gpt-5",
      availableModelIds: ["openai/gpt-5"],
    }));

    await hooks.config?.(config);

    expect(config.agent?.minion?.model).toBe("openai/gpt-5");
    expect(config.agent?.minion?.permission).toEqual({
      task: "deny",
    });
  });
});

describe("minion model selection", () => {
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

  test("reads the legacy worker-model preference when no minion preference exists", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "minions-legacy-model-test-"));

    try {
      await writeFile(
        legacyWorkerModelStatePath(stateDirectory),
        `${JSON.stringify(
          {
            workerModel: "openai/gpt-5",
            availableModelIds: ["openai/gpt-5"],
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        workerModel: "openai/gpt-5",
        availableModelIds: ["openai/gpt-5"],
      });
    } finally {
      await rm(stateDirectory, { recursive: true, force: true });
    }
  });

  test("opens one /minions command with skill install, model selector, and diagnostics", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "minions-tui-model-test-"));
    const configDirectory = await mkdtemp(join(tmpdir(), "minions-tui-config-test-"));
    let commands: TuiCommand[] = [];
    const selects: TuiDialogSelectProps<unknown>[] = [];
    const alerts: TuiDialogAlertProps[] = [];
    const toasts: unknown[] = [];
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
            data: { config: configDirectory, state: stateDirectory },
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
        DialogAlert: (props: TuiDialogAlertProps) => {
          alerts.push(props);
          return undefined;
        },
        DialogSelect: (props: TuiDialogSelectProps<unknown>) => {
          selects.push(props);
          return undefined;
        },
        dialog: {
          replace: (render: () => unknown) => {
            render();
          },
          clear: () => {},
        },
        toast: (toast: unknown) => {
          toasts.push(toast);
        },
      },
    } as unknown as TuiPluginApi;

    try {
      await registerMinionsManager(api);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.slash?.name).toBe("minions");
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        availableModelIds: ["openai/gpt-5"],
      });

      commands[0]?.onSelect?.();
      expect(selects.at(-1)?.title).toBe("Minions");
      const skillMenuItem = selects
        .at(-1)
        ?.options.find((option) => option.value === "delegation-skill");
      expect(skillMenuItem).toBeDefined();
      if (!skillMenuItem) throw new Error("Expected the delegation skill menu option");
      selects.at(-1)?.onSelect?.(skillMenuItem);

      await vi.waitFor(() => expect(alerts.at(-1)?.title).toBe("Delegation skill installed"));
      expect(await readFile(minionsDelegateSkillPath(configDirectory), "utf8")).toContain(
        "name: minions-delegate",
      );
      expect(toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            variant: "success",
            message: expect.stringContaining("minions-delegate"),
          }),
        ]),
      );

      commands[0]?.onSelect?.();
      const modelMenuItem = selects
        .at(-1)
        ?.options.find((option) => option.value === "minion-model");
      expect(modelMenuItem).toBeDefined();
      if (!modelMenuItem) throw new Error("Expected the minion model menu option");
      selects.at(-1)?.onSelect?.(modelMenuItem);

      await vi.waitFor(() => expect(selects.at(-1)?.title).toBe("Minion model"));
      const model = selects.at(-1)?.options.find((option) => option.value === "openai/gpt-5");
      expect(model).toBeDefined();
      if (!model) throw new Error("Expected the connected model option");
      selects.at(-1)?.onSelect?.(model);

      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
      expect(await readWorkerModelPreference(stateDirectory)).toEqual({
        workerModel: "openai/gpt-5",
        availableModelIds: ["openai/gpt-5"],
      });

      commands[0]?.onSelect?.();
      const diagnosticsMenuItem = selects
        .at(-1)
        ?.options.find((option) => option.value === "diagnostics");
      expect(diagnosticsMenuItem).toBeDefined();
      if (!diagnosticsMenuItem) throw new Error("Expected the diagnostics menu option");
      selects.at(-1)?.onSelect?.(diagnosticsMenuItem);

      await vi.waitFor(() => expect(alerts.at(-1)?.title).toBe("Minions diagnostics"));
      expect(alerts.at(-1)?.message).toContain("Managed subagent: minion");
    } finally {
      await rm(stateDirectory, { recursive: true, force: true });
      await rm(configDirectory, { recursive: true, force: true });
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
      await registerMinionsManager(api);
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

describe("delegation skill installer", () => {
  test("writes the minions-delegate skill under the OpenCode config directory", async () => {
    const configDirectory = await mkdtemp(join(tmpdir(), "minions-skill-test-"));

    try {
      const skillPath = await installMinionsDelegateSkill(configDirectory);

      expect(skillPath).toBe(minionsDelegateSkillPath(configDirectory));
      expect(await readFile(skillPath, "utf8")).toContain("name: minions-delegate");
      expect(await readFile(skillPath, "utf8")).toContain("minion");
    } finally {
      await rm(configDirectory, { recursive: true, force: true });
    }
  });
});
