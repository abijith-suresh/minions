import { describe, expect, test } from "vitest";

import { MINIONS_CORE_VERSION } from "./index.ts";

describe("@minions/core scaffold", () => {
  test("exports its contract version", () => {
    expect(MINIONS_CORE_VERSION).toBe(1);
  });
});
