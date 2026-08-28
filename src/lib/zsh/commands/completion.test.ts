import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFs } from "../fs";
import { completePath } from "./completion";
import type { CommandContext } from "./types";

function context(unlocked = false): CommandContext {
  return {
    cwd: "/home/guest",
    fs: buildFs(() => unlocked),
    history: [],
    hasUnlock: (id) => unlocked && id === "root.real",
    unlock: () => {},
    clearUnlocks: () => {},
    sessionPassword: null,
    setCwd: () => {},
    openWindow: () => {},
    closeTerminal: () => {},
    setTheme: () => {},
    verifyPassword: async () => false,
    decryptPitch: async () => null,
  };
}

describe("terminal completion", () => {
  it("marks directory path completions with a trailing slash", () => {
    assert.deepEqual(completePath("~/.s", context()), ["~/.ssh/"]);
    assert.deepEqual(completePath("/var/l", context()), ["/var/log/"]);
    assert.deepEqual(completePath("/etc/m", context()), ["/etc/motd"]);
  });

  it("only completes root puzzle files after root is unlocked", () => {
    assert.deepEqual(completePath("/root/.", context(false)), []);
    assert.deepEqual(completePath("/root/.", context(true)), ["/root/.real"]);
  });
});
