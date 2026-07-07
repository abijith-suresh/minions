import { describe, expect, test } from "vitest";

import {
  createDefaultMinionContract,
  MINIONS_DEFAULT_SUBAGENT_ID,
  MINIONS_DELEGATE_SKILL_ID,
  MINIONS_PLUGIN_ID,
} from "./index.ts";

describe("@minions/core default subagent contract", () => {
  test("exposes stable plugin and default subagent identifiers", () => {
    expect(MINIONS_PLUGIN_ID).toBe("minions");
    expect(MINIONS_DEFAULT_SUBAGENT_ID).toBe("minion");
    expect(MINIONS_DELEGATE_SKILL_ID).toBe("minions-delegate");
  });

  test("defines a hidden subagent that cannot delegate", () => {
    expect(createDefaultMinionContract()).toMatchObject({
      id: MINIONS_DEFAULT_SUBAGENT_ID,
      kind: "subagent",
      visibility: "hidden",
      model: { strategy: "inherit" },
      delegation: { enabled: false },
    });
  });

  test("returns fresh contract state", () => {
    const first = createDefaultMinionContract();
    const second = createDefaultMinionContract();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.delegation).not.toBe(second.delegation);
  });
});

describe("@minions/core delegation skill", () => {
  test("exposes the shipped skill identifier", () => {
    expect(MINIONS_DELEGATE_SKILL_ID).toBe("minions-delegate");
  });
});
