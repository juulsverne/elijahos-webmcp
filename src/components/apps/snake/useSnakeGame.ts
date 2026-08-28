"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDesktopStore } from "@/lib/desktop-store";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  DIRS,
  TICK_DELTA_MS,
  TICK_FLOOR_MS,
  TICK_START_MS,
  GRID,
  type Dir,
  type Vec,
  opposite,
  randCell,
} from "./constants";
import { readHighScore, writeHighScore } from "./storage";
import { drawFrame } from "./draw";
import { readSnakeColors, type SnakeColors } from "./colors";

type InternalState = {
  snake: Vec[];
  dir: Dir;
  pendingDir: Dir;
  food: Vec;
  score: number;
  over: boolean;
  tickMs: number;
  lastTick: number;
};

function initialState(): InternalState {
  const seed = { x: 10, y: 10 };
  return {
    snake: [seed],
    dir: "right",
    pendingDir: "right",
    food: randCell([seed]),
    score: 0,
    over: false,
    tickMs: TICK_START_MS,
    lastTick: 0,
  };
}

export function useSnakeGame(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const focusId = useDesktopStore((s) => s.focusId);
  // On desktop the game runs only while its window is focused (so it doesn't
  // eat arrow keys or burn frames behind another window). On the mobile shell
  // there's no window system — the app is the full-screen surface whenever it's
  // mounted — so `focusId` is never "snake" there. Treat mobile as always
  // active so the game actually ticks and accepts swipe input.
  const isMobile = useIsMobile();
  const active = isMobile === true || focusId === "snake";

  const stateRef = useRef<InternalState>(initialState());
  const colorsRef = useRef<SnakeColors | null>(null);
  const scoreFlashRef = useRef<HTMLSpanElement>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => readHighScore());
  const [over, setOver] = useState(false);

  useEffect(() => {
    colorsRef.current = readSnakeColors();
  }, []);

  const reset = useCallback(() => {
    stateRef.current = initialState();
    setScore(0);
    setOver(false);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const step = (t: number) => {
      const s = stateRef.current;
      if (!s.over && active) {
        if (t - s.lastTick >= s.tickMs) {
          s.lastTick = t;
          if (!opposite(s.dir, s.pendingDir)) s.dir = s.pendingDir;
          const d = DIRS[s.dir];
          const nextHead = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };

          const hitWall =
            nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID;
          const willEat = nextHead.x === s.food.x && nextHead.y === s.food.y;
          const bodyToCheck = willEat ? s.snake : s.snake.slice(0, -1);
          const hitSelf = bodyToCheck.some((p) => p.x === nextHead.x && p.y === nextHead.y);

          if (hitWall || hitSelf) {
            s.over = true;
            setOver(true);
            const prev = readHighScore();
            if (s.score > prev) {
              writeHighScore(s.score);
              setHighScore(s.score);
            }
          } else {
            const nextSnake = [nextHead, ...s.snake];
            if (!willEat) nextSnake.pop();
            s.snake = nextSnake;
            if (willEat) {
              s.score += 1;
              setScore(s.score);
              s.food = randCell(s.snake);
              s.tickMs = Math.max(TICK_FLOOR_MS, s.tickMs - TICK_DELTA_MS);
              flashScore(scoreFlashRef.current);
            }
          }
        }
      } else if (!active) {
        s.lastTick = t;
      }
      const colors = colorsRef.current;
      if (colors) drawFrame(ctx, s, colors, t);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, active]);

  // Touch steering. The canvas owns the listeners so a swipe on the board
  // changes direction without scrolling the surrounding app frame. Pairs with
  // `touch-action: none` on `.snake-canvas` so the browser hands us the gesture
  // instead of treating it as a scroll/zoom. Reversal into the snake's own neck
  // is rejected by the `opposite()` check in the tick, same as the keyboard.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SWIPE_MIN = 18; // px of travel before a drag counts as a swipe
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      // Keep a swipe on the board from scrolling the app frame underneath.
      if (tracking) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
      const next: Dir =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
      if (stateRef.current.over) return;
      stateRef.current.pendingDir = next;
    };

    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [canvasRef]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (useDesktopStore.getState().launchpadOpen) return;
      const k = e.key.toLowerCase();
      const map: Record<string, Dir | undefined> = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const next = map[k];
      if (next) {
        stateRef.current.pendingDir = next;
        e.preventDefault();
        return;
      }
      if (k === " " && stateRef.current.over) {
        reset();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, reset]);

  return { score, highScore, over, reset, scoreFlashRef, stateRef };
}

function flashScore(el: HTMLSpanElement | null) {
  if (!el) return;
  el.classList.remove("snake-score-flash");
  void el.offsetWidth;
  el.classList.add("snake-score-flash");
}
