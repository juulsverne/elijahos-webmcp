import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  HIGH_SCORE_KEY,
  NAME_KEY,
} from "./constants";
import {
  readHighScore,
  readPlayerName,
  writeHighScore,
  writePlayerName,
} from "./storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function setWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value,
  });
}

function restoreWindow() {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
    return;
  }
  delete (globalThis as { window?: unknown }).window;
}

describe("snake storage", () => {
  afterEach(() => {
    restoreWindow();
  });

  it("falls back when browser storage is unavailable", () => {
    const localStorage = {
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {
        throw new Error("storage blocked");
      },
    };
    setWindow({ localStorage });

    assert.equal(readHighScore(), 0);
    assert.equal(readPlayerName(), "");
    assert.doesNotThrow(() => writeHighScore(12));
    assert.doesNotThrow(() => writePlayerName("Ada"));
  });

  it("rejects malformed persisted high scores", () => {
    const values = new Map<string, string | null>();
    const localStorage = {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    };
    setWindow({ localStorage });

    for (const raw of ["12abc", "3.5", "-1", "Infinity"]) {
      values.set(HIGH_SCORE_KEY, raw);
      assert.equal(readHighScore(), 0);
    }

    values.set(HIGH_SCORE_KEY, "0");
    assert.equal(readHighScore(), 0);
    values.set(HIGH_SCORE_KEY, "42");
    assert.equal(readHighScore(), 42);

    writeHighScore(9);
    assert.equal(values.get(HIGH_SCORE_KEY), "9");
    writeHighScore(-5);
    assert.equal(values.get(HIGH_SCORE_KEY), "9");
    writeHighScore(1.5);
    assert.equal(values.get(HIGH_SCORE_KEY), "9");
    writePlayerName("Ada");
    assert.equal(values.get(NAME_KEY), "Ada");
  });
});
