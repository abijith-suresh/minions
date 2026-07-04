import type { PluginModule } from "@opencode-ai/plugin";

const plugin = {
  id: "minions",
  server: async () => ({}),
} satisfies PluginModule;

export default plugin;
