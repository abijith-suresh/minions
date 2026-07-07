import { describe, expect, test } from "vitest";

import {
  MINIONS_CORE_VERSION,
  MINIONS_MANAGED_STATE_VERSION,
  MINIONS_PLUGIN_ID,
  type MinionsAgentOwnership,
} from "./index.ts";

describe("@minions/core agent manager contract", () => {
  test("exposes stable manager identifiers", () => {
    expect(MINIONS_CORE_VERSION).toBe(1);
    expect(MINIONS_PLUGIN_ID).toBe("minions");
    expect(MINIONS_MANAGED_STATE_VERSION).toBe(1);
  });

  test("defines ownership labels for agent inventory", () => {
    const ownerships: MinionsAgentOwnership[] = ["built-in", "user", "minions", "unknown"];
    expect(ownerships).toContain("built-in");
    expect(ownerships).toContain("user");
  });
});
