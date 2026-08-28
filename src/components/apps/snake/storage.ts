import {
  HIGH_SCORE_KEY,
  LOCAL_LEADERBOARD_KEY,
  NAME_KEY,
  type LeaderboardEntry,
} from "./constants";

const LOCAL_LEADERBOARD_LIMIT = 10;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStoredHighScore(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : 0;
}

function isPersistableHighScore(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function parseLocalLeaderboardEntry(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = positiveInteger(row.id);
  const score = positiveInteger(row.score);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const playedAt = typeof row.played_at === "string" ? row.played_at : "";

  if (id === null || score === null || !name || !Number.isFinite(Date.parse(playedAt))) {
    return null;
  }
  return { id, name, score, played_at: playedAt };
}

function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.played_at.localeCompare(b.played_at))
    .slice(0, LOCAL_LEADERBOARD_LIMIT);
}

export function readHighScore(): number {
  const storage = getStorage();
  if (!storage) return 0;
  let raw: string | null;
  try {
    raw = storage.getItem(HIGH_SCORE_KEY);
  } catch {
    return 0;
  }
  return parseStoredHighScore(raw);
}

export function writeHighScore(n: number) {
  if (!isPersistableHighScore(n)) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(HIGH_SCORE_KEY, String(n));
  } catch {
    // Best-effort local score cache only.
  }
}

export function readPlayerName(): string {
  const storage = getStorage();
  if (!storage) return "";
  try {
    return storage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writePlayerName(name: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(NAME_KEY, name);
  } catch {
    // Best-effort local player-name cache only.
  }
}

export function readLocalLeaderboard(): LeaderboardEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_LEADERBOARD_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return Array.isArray(parsed)
    ? rankLeaderboard(
        parsed.flatMap((row) => {
          const entry = parseLocalLeaderboardEntry(row);
          return entry ? [entry] : [];
        }),
      )
    : [];
}

export function appendLocalLeaderboardScore(name: string, score: number): number | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return null;
  if (positiveInteger(score) === null) return null;

  const storage = getStorage();
  if (!storage) return null;
  const current = readLocalLeaderboard();
  const nextId = Math.max(0, ...current.map((entry) => entry.id)) + 1;
  const next = rankLeaderboard([
    ...current,
    {
      id: nextId,
      name: trimmed,
      score,
      played_at: new Date().toISOString(),
    },
  ]);

  try {
    storage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(next));
    return nextId;
  } catch {
    return null;
  }
}
