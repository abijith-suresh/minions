import { describe, expect, test } from "vitest";

import server from "./server.ts";
import tui from "./tui.ts";

describe("@minions/opencode-v1 scaffold", () => {
  test("exports the server entry point", () => {
    expect(server.id).toBe("minions");
    expect(server.server).toBeTypeOf("function");
  });

  test("exports the TUI entry point", () => {
    expect(tui.id).toBe("minions");
    expect(tui.tui).toBeTypeOf("function");
  });
});
