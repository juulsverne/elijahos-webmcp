"use client";

import { useCallback, useEffect, useState } from "react";
import { UI_COPY } from "@/lib/ui-copy";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  fetchLeaderboard,
  submitLeaderboardScore,
} from "./leaderboard";
import { readPlayerName, writePlayerName } from "./storage";
import type { LeaderboardEntry } from "./constants";

type Phase = "name" | "submitting" | "board";

type Props = {
  score: number;
  onReset: () => void;
};

export function GameOverDialog({ score, onReset }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    score === 0 ? "board" : "name",
  );
  const [name, setName] = useState<string>(() => readPlayerName());
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  // Space restarts on desktop; on mobile there's no keyboard, so the "Play
  // again" button is the only restart affordance and the Space hint would lie.
  const isMobile = useIsMobile();

  useEffect(() => {
    if (score !== 0) return;
    let cancelled = false;
    void fetchLeaderboard().then((entries) => {
      if (!cancelled) setBoard(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [score]);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    writePlayerName(trimmed);
    setPhase("submitting");
    const id = await submitLeaderboardScore(trimmed, score);
    setSubmittedId(id);
    setBoard(await fetchLeaderboard());
    setPhase("board");
  }, [name, score]);

  return (
    <div className="snake-over" role="status">
      {phase === "name" && (
        <>
          <div className="snake-over-title">{UI_COPY.snake.gameOver}</div>
          <div className="snake-over-score">{UI_COPY.snake.score(score)}</div>
          <input
            className="snake-over-input"
            type="text"
            maxLength={20}
            placeholder={UI_COPY.snake.enterName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              e.stopPropagation();
            }}
            autoFocus
          />
          <button className="snake-over-submit" onClick={submit}>
            {UI_COPY.snake.submit}
          </button>
        </>
      )}
      {phase === "submitting" && (
        <div className="snake-over-hint">{UI_COPY.snake.submitting}</div>
      )}
      {phase === "board" && (
        <>
          <div className="snake-over-title">{UI_COPY.snake.leaderboard}</div>
          <table className="snake-leaderboard">
            <thead>
              <tr>
                <th>{UI_COPY.snake.rank}</th>
                <th>{UI_COPY.snake.name}</th>
                <th>{UI_COPY.snake.scoreHead}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((entry, i) => (
                <tr key={entry.id} className={entry.id === submittedId ? "highlighted" : ""}>
                  <td>{i + 1}</td>
                  <td>{entry.name}</td>
                  <td>{entry.score}</td>
                </tr>
              ))}
              {board.length === 0 && (
                <tr>
                  <td colSpan={3} className="snake-leaderboard-empty">
                    {UI_COPY.snake.noScores}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button className="snake-play-again" onClick={onReset}>
            {UI_COPY.snake.playAgain}
          </button>
          {isMobile === false && (
            <div className="snake-over-hint">{UI_COPY.snake.restartHint}</div>
          )}
        </>
      )}
    </div>
  );
}
