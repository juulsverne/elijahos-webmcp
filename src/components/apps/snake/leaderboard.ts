import type { LeaderboardEntry } from "./constants";
import {
  appendLocalLeaderboardScore,
  readLocalLeaderboard,
} from "./storage";

const SCORES_ENDPOINT = "/api/snake/scores";

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function parseLeaderboardEntry(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = positiveInteger(row.id);
  const score = positiveInteger(row.score);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const playedAt = typeof row.played_at === "string" ? row.played_at : "";

  if (id === null || score === null || !name || !playedAt) return null;
  return { id, name, score, played_at: playedAt };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(SCORES_ENDPOINT);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const disabled =
      data && typeof data === "object"
        ? (data as { disabled?: unknown }).disabled === true
        : false;
    if (disabled) return readLocalLeaderboard();
    const scores =
      data && typeof data === "object"
        ? (data as { scores?: unknown }).scores
        : undefined;
    return Array.isArray(scores)
      ? scores.flatMap((row) => {
          const entry = parseLeaderboardEntry(row);
          return entry ? [entry] : [];
        })
      : [];
  } catch {
    return readLocalLeaderboard();
  }
}

export async function submitLeaderboardScore(
  name: string,
  score: number,
): Promise<number | null> {
  try {
    const res = await fetch(SCORES_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    if (!res.ok) {
      return res.status === 503
        ? appendLocalLeaderboardScore(name, score)
        : null;
    }
    const data: unknown = await res.json();
    const id =
      data && typeof data === "object"
        ? positiveInteger((data as { id?: unknown }).id)
        : null;
    return id;
  } catch {
    return null;
  }
}
