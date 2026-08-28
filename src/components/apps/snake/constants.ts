import { ELIJAH } from "@/lib/elijah";

export const GRID = 20;
export const CELL = 22;
export const TICK_START_MS = 140;
export const TICK_FLOOR_MS = 60;
export const TICK_DELTA_MS = 4;

export const HIGH_SCORE_KEY = `${ELIJAH.osSlug}:snake:highscore`;
export const NAME_KEY = `${ELIJAH.osSlug}:snake:name`;
export const LOCAL_LEADERBOARD_KEY = `${ELIJAH.osSlug}:snake:leaderboard`;

export type Vec = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";

export const DIRS: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function opposite(a: Dir, b: Dir): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export function randCell(snake: Vec[]): Vec {
  while (true) {
    const c = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!snake.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
}

export type LeaderboardEntry = {
  id: number;
  name: string;
  score: number;
  played_at: string;
};
