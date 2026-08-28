import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFs } from "../../fs";
import { ls } from "./fs";
import type { CommandContext } from "../types";

function context(unlocked: boolean): CommandContext {
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

describe("zsh fs commands", () => {
  it("lists root puzzle files after unlock", async () => {
    assert.deepEqual(await ls(["-a", "/root"], context(false)), {
      output: ["ls: cannot open directory '/root': Permission denied"],
    });

    assert.deepEqual(await ls(["-a", "/root"], context(true)), {
      output: [".real"],
    });
  });

  it("reports every explicit ls target", async () => {
    assert.deepEqual(await ls(["/etc/motd", "/missing"], context(false)), {
      output: [
        "/etc/motd",
        "ls: cannot access '/missing': No such file or directory",
      ],
    });
  });
});
