import { describe, expect, test } from "vitest";

import { createMinionsDelegationContract, MINIONS_PRIMARY_ID, MINIONS_WORKER_ID } from "./index.ts";

describe("@minions/core delegation contract", () => {
  test("exposes distinct role identifiers", () => {
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

  test("returns fresh contract state", () => {
    const first = createMinionsDelegationContract();
    const second = createMinionsDelegationContract();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.primary.delegation).not.toBe(second.primary.delegation);
  });
});
