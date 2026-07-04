import type { Config } from "@opencode-ai/plugin";
import { describe, expect, test } from "vitest";
import server, { applyMinionsConfig, createMinionsHooks, createOpenCodeAgents } from "./server.ts";
import tui from "./tui.ts";

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
});
