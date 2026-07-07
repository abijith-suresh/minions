import type {
  TuiCommand,
  TuiDialogAlertProps,
  TuiDialogPromptProps,
  TuiDialogSelectProps,
  TuiPluginApi,
} from "@opencode-ai/plugin/tui";
import { describe, expect, test, vi } from "vitest";
import server, { applyMinionsConfig, createMinionsHooks, createOpenCodeAgents } from "./server.ts";
import tui, { registerMinionsManager } from "./tui.ts";

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

describe("OpenCode config hook", () => {
  test("does not inject Minions agents", () => {
    expect(createOpenCodeAgents()).toEqual({});
  });

  test("leaves user agent configuration untouched", async () => {
    const config = {
      agent: {
        build: {
          description: "User build override",
          mode: "primary" as const,
        },
        minion: {
          description: "User-owned agent with an old Minions name",
          mode: "subagent" as const,
        },
      },
    };

    applyMinionsConfig(config);
    expect(config.agent).toEqual({
      build: {
        description: "User build override",
        mode: "primary",
      },
      minion: {
        description: "User-owned agent with an old Minions name",
        mode: "subagent",
      },
    });

    await createMinionsHooks().config?.(config);
    expect(config.agent).not.toHaveProperty("minions");
    expect(config.agent?.minion).toMatchObject({
      description: "User-owned agent with an old Minions name",
    });
  });
});

function createTuiHarness() {
  let commands: TuiCommand[] = [];
  const selects: TuiDialogSelectProps<unknown>[] = [];
  const prompts: TuiDialogPromptProps[] = [];
  const alerts: TuiDialogAlertProps[] = [];
  const toasts: unknown[] = [];
  const dispose = vi.fn(async () => ({ data: true }));
  let config = {
    agent: {
      build: {
        description: "Build things",
        mode: "primary" as const,
      },
    },
  };
  const updateConfig = vi.fn(async ({ config: next }: { config: typeof config }) => {
    config = next;
    return { data: config };
  });
  const api = {
    command: {
      register: (factory: () => TuiCommand[]) => {
        commands = factory();
        return () => {};
      },
    },
    client: {
      app: {
        agents: async () => ({
          data: [
            {
              name: "build",
              description: "Default build agent",
              mode: "primary",
              builtIn: true,
              hidden: false,
              permission: { edit: "allow", bash: "ask" },
              tools: {},
              options: {},
            },
            {
              name: "reviewer",
              description: "Review code",
              mode: "subagent",
              builtIn: false,
              hidden: false,
              permission: { edit: "deny", bash: "ask" },
              tools: {},
              options: {},
            },
          ],
        }),
      },
      config: {
        get: async () => ({ data: config }),
        update: updateConfig,
        providers: async () => ({
          data: {
            providers: [
              {
                id: "openai",
                name: "OpenAI",
                models: {
                  gpt5: {
                    id: "gpt-5",
                    name: "GPT-5",
                  },
                },
              },
            ],
          },
        }),
      },
      instance: { dispose },
      path: {
        get: async () => ({
          data: {
            config: "/tmp/opencode-config",
            directory: "/tmp/project",
            state: "/tmp/opencode-state",
          },
        }),
      },
    },
    event: {
      on: () => () => {},
    },
    state: {
      path: { state: "", config: "", directory: "", worktree: "" },
      provider: [],
      ready: false,
    },
    ui: {
      DialogAlert: (props: TuiDialogAlertProps) => {
        alerts.push(props);
        return undefined;
      },
      DialogPrompt: (props: TuiDialogPromptProps) => {
        prompts.push(props);
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

  return {
    get commands() {
      return commands;
    },
    selects,
    prompts,
    alerts,
    toasts,
    dispose,
    updateConfig,
    api,
  };
}

describe("/minions TUI manager", () => {
  test("opens the manager without minion or delegation actions", async () => {
    const harness = createTuiHarness();

    await registerMinionsManager(harness.api);
    expect(harness.commands).toHaveLength(1);
    expect(harness.commands[0]?.slash?.name).toBe("minions");

    harness.commands[0]?.onSelect?.();
    expect(harness.selects.at(-1)?.title).toBe("Minions");
    expect(harness.selects.at(-1)?.options).toEqual([
      expect.objectContaining({ value: "agents" }),
      expect.objectContaining({ value: "diagnostics" }),
    ]);
    expect(harness.selects.at(-1)?.options).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "minion-model" }),
        expect.objectContaining({ value: "delegation-skill" }),
      ]),
    );
  });

  test("lists agents and edits an agent description through OpenCode config", async () => {
    const harness = createTuiHarness();

    await registerMinionsManager(harness.api);
    harness.commands[0]?.onSelect?.();
    harness.selects.at(-1)?.onSelect?.({ title: "Agents", value: "agents" });

    await vi.waitFor(() => expect(harness.selects.at(-1)?.title).toBe("Agents"));
    expect(harness.selects.at(-1)?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "build",
          category: "user",
          description: expect.stringContaining("primary"),
        }),
        expect.objectContaining({
          value: "reviewer",
          category: "unknown",
          description: expect.stringContaining("subagent"),
        }),
      ]),
    );

    harness.selects.at(-1)?.onSelect?.({ title: "build", value: "build" });
    expect(harness.selects.at(-1)?.title).toBe("build");
    harness.selects.at(-1)?.onSelect?.({ title: "Description", value: "description" });
    expect(harness.prompts.at(-1)?.title).toBe("Description: build");
    harness.prompts.at(-1)?.onConfirm?.("Build and test code");

    await vi.waitFor(() => expect(harness.updateConfig).toHaveBeenCalledOnce());
    expect(harness.updateConfig).toHaveBeenCalledWith(
      {
        directory: "/tmp/project",
        config: {
          agent: {
            build: {
              description: "Build and test code",
              mode: "primary",
            },
          },
        },
      },
      { throwOnError: true },
    );
    expect(harness.dispose).toHaveBeenCalledOnce();
    expect(harness.toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variant: "success",
          message: "Updated build description",
        }),
      ]),
    );
  });

  test("shows diagnostics for paths, agents, and providers", async () => {
    const harness = createTuiHarness();

    await registerMinionsManager(harness.api);
    harness.commands[0]?.onSelect?.();
    harness.selects.at(-1)?.onSelect?.({ title: "Diagnostics", value: "diagnostics" });

    await vi.waitFor(() => expect(harness.alerts.at(-1)?.title).toBe("Minions diagnostics"));
    expect(harness.alerts.at(-1)?.message).toContain("Agents detected: 2");
    expect(harness.alerts.at(-1)?.message).toContain("Providers connected: 1");
    expect(harness.alerts.at(-1)?.message).toContain("Workspace: /tmp/project");
  });
});
