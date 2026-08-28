import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { fetchLeaderboard, submitLeaderboardScore } from "./leaderboard";
import { LOCAL_LEADERBOARD_KEY } from "./constants";

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

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    values,
    localStorage: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    },
  };
}

function mockFetch(response: Response | (() => Response)): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    typeof response === "function" ? response() : response;
  return () => {
    globalThis.fetch = original;
  };
}

describe("snake leaderboard client", () => {
  afterEach(() => {
    restoreWindow();
  });

  it("keeps malformed leaderboard rows out of display state", async () => {
    const restore = mockFetch(
      Response.json({
        scores: [
          { id: 1, name: "Ada", score: 12, played_at: "2026-06-10T00:00:00Z" },
          { id: 2.5, name: "Fraction", score: 9, played_at: "2026-06-10T00:00:00Z" },
          { id: 3, name: "", score: 8, played_at: "2026-06-10T00:00:00Z" },
          { id: 4, name: "BadScore", score: Number.NaN, played_at: "2026-06-10T00:00:00Z" },
          { id: 5, name: "MissingDate", score: 7 },
        ],
      }),
    );

    try {
      assert.deepEqual(await fetchLeaderboard(), [
        {
          id: 1,
          name: "Ada",
          score: 12,
          played_at: "2026-06-10T00:00:00Z",
        },
      ]);
    } finally {
      restore();
    }
  });

  it("returns null when a submit response has a malformed id", async () => {
    const restore = mockFetch(Response.json({ id: Number.NaN }));

    try {
      assert.equal(await submitLeaderboardScore("Ada", 12), null);
    } finally {
      restore();
    }
  });

  it("ignores leaderboard data from failed responses", async () => {
    const restore = mockFetch(
      Response.json(
        {
          scores: [
            { id: 1, name: "Ada", score: 12, played_at: "2026-06-10T00:00:00Z" },
          ],
        },
        { status: 500 },
      ),
    );

    try {
      assert.deepEqual(await fetchLeaderboard(), []);
    } finally {
      restore();
    }
  });

  it("returns null when score submit fails even if the body has an id", async () => {
    const restore = mockFetch(Response.json({ id: 99 }, { status: 500 }));

    try {
      assert.equal(await submitLeaderboardScore("Ada", 12), null);
    } finally {
      restore();
    }
  });

  it("persists submitted names locally when the shared leaderboard is disabled", async () => {
    const { values, localStorage } = createLocalStorage();
    setWindow({ localStorage });

    const responses = [
      Response.json(
        { error: "Leaderboard database is not configured", id: null },
        { status: 503 },
      ),
      Response.json({ scores: [], disabled: true }),
    ];
    const restore = mockFetch(() => responses.shift() ?? Response.json({}));

    try {
      assert.equal(await submitLeaderboardScore("Ada", 12), 1);
      assert.match(values.get(LOCAL_LEADERBOARD_KEY) ?? "", /Ada/);
      const scores = await fetchLeaderboard();
      assert.equal(scores.length, 1);
      assert.equal(scores[0].id, 1);
      assert.equal(scores[0].name, "Ada");
      assert.equal(scores[0].score, 12);
      assert.ok(Number.isFinite(Date.parse(scores[0].played_at)));
    } finally {
      restore();
    }
  });
});
