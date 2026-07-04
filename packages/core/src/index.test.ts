import { describe, expect, test } from "vitest";

import {
  createMinionsDelegationContract,
  MINIONS_CORE_VERSION,
  MINIONS_PRIMARY_ID,
  MINIONS_PRIMARY_PROMPT,
  MINIONS_WORKER_ID,
  MINIONS_WORKER_PROMPT,
} from "./index.ts";

describe("@minions/core delegation contract", () => {
  test("exposes stable, distinct role identifiers", () => {
    expect(MINIONS_CORE_VERSION).toBe(1);
    expect(MINIONS_PRIMARY_ID).toBe("minions");
    expect(MINIONS_WORKER_ID).toBe("minions-worker");
    expect(MINIONS_PRIMARY_ID).not.toBe(MINIONS_WORKER_ID);
  });

  test("defines a selectable primary with one allowed worker", () => {
    const { primary } = createMinionsDelegationContract();

    expect(primary).toMatchObject({
      id: MINIONS_PRIMARY_ID,
      kind: "primary",
      visibility: "selectable",
      model: { strategy: "inherit" },
      delegation: {
        enabled: true,
        allowedRoleIds: [MINIONS_WORKER_ID],
      },
    });
  });

  test("defines a hidden worker that cannot delegate", () => {
    const { worker } = createMinionsDelegationContract();

    expect(worker).toMatchObject({
      id: MINIONS_WORKER_ID,
      kind: "worker",
      visibility: "hidden",
      model: { strategy: "inherit" },
      delegation: { enabled: false },
    });
  });

  test("makes delegation and verification explicit in the primary prompt", () => {
    expect(MINIONS_PRIMARY_PROMPT).toContain("Delegate substantive");
    expect(MINIONS_PRIMARY_PROMPT).toContain("only minions-worker");
    expect(MINIONS_PRIMARY_PROMPT).toContain("independently verify");
    expect(MINIONS_PRIMARY_PROMPT).toContain("final answer");
  });

  test("forbids recursive delegation in the worker prompt", () => {
    expect(MINIONS_WORKER_PROMPT).toContain("Never delegate");
    expect(MINIONS_WORKER_PROMPT).toContain("Verify your work");
  });

  test("returns fresh contract state", () => {
    const first = createMinionsDelegationContract();
    const second = createMinionsDelegationContract();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.primary.delegation).not.toBe(second.primary.delegation);
  });
});
