"use client";

import { useRef } from "react";
import { APPS } from "@/lib/apps";
import { useIsMobile } from "@/lib/use-is-mobile";
import { UI_COPY } from "@/lib/ui-copy";
import { CELL, GRID } from "./snake/constants";
import { useSnakeGame } from "./snake/useSnakeGame";
import { GameOverDialog } from "./snake/GameOverDialog";

export function SnakeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { score, highScore, over, reset, scoreFlashRef } = useSnakeGame(canvasRef);
  const isMobile = useIsMobile();

  return (
    <div className="snake-app">
      <span className="app-kicker">{APPS.snake.title}</span>
      <header className="snake-bar">
        <span>
          {UI_COPY.snake.scoreLabel}: <strong ref={scoreFlashRef}>{score}</strong>
        </span>
        <span>
          {UI_COPY.snake.highScoreLabel}: <strong>{highScore}</strong>
        </span>
      </header>
      <div className="snake-stage">
        <canvas
          ref={canvasRef}
          width={GRID * CELL}
          height={GRID * CELL}
          className="snake-canvas"
        />
        {over && <GameOverDialog score={score} onReset={reset} />}
      </div>
      <p className="snake-hint">
        {isMobile ? UI_COPY.snake.mobileHint : UI_COPY.snake.desktopHint}{" "}
        {UI_COPY.snake.goalHint} {UI_COPY.snake.avoidHint}
      </p>
    </div>
  );
}
