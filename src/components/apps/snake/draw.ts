import { CELL, GRID, type Dir, type Vec } from "./constants";
import { lerpColor, type SnakeColors } from "./colors";

export type SnakeRenderState = {
  snake: Vec[];
  dir: Dir;
  food: Vec;
};

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: SnakeRenderState,
  colors: SnakeColors,
  t: number,
) {
  const w = GRID * CELL;
  ctx.clearRect(0, 0, w, w);

  ctx.strokeStyle = colors.gridStroke;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += CELL) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, w);
    ctx.stroke();
  }
  for (let y = 0; y <= w; y += CELL) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const pulse = 0.5 + 0.5 * Math.sin(t * 0.003);
  ctx.shadowBlur = 4 + 8 * pulse;
  ctx.shadowColor = colors.food;
  ctx.fillStyle = colors.food;
  ctx.beginPath();
  ctx.arc(
    state.food.x * CELL + CELL / 2,
    state.food.y * CELL + CELL / 2,
    CELL / 3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  const N = state.snake.length;
  state.snake.forEach((seg, i) => {
    const segT = i / Math.max(N - 1, 1);
    const segColor = lerpColor(colors.head, colors.body, segT);
    ctx.shadowBlur = i === 0 ? 16 : 8;
    ctx.shadowColor = segColor;
    ctx.fillStyle = segColor;
    ctx.beginPath();
    ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 5);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  const head = state.snake[0];
  ctx.fillStyle = colors.eye;
  const eyeR = CELL * 0.12;
  const e = eyeOffsets(state.dir);
  ctx.beginPath();
  ctx.arc(head.x * CELL + CELL * e.x1, head.y * CELL + CELL * e.y1, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(head.x * CELL + CELL * e.x2, head.y * CELL + CELL * e.y2, eyeR, 0, Math.PI * 2);
  ctx.fill();
}

function eyeOffsets(dir: Dir) {
  switch (dir) {
    case "right":
      return { x1: 0.72, y1: 0.3, x2: 0.72, y2: 0.7 };
    case "left":
      return { x1: 0.28, y1: 0.3, x2: 0.28, y2: 0.7 };
    case "up":
      return { x1: 0.3, y1: 0.28, x2: 0.7, y2: 0.28 };
    case "down":
      return { x1: 0.3, y1: 0.72, x2: 0.7, y2: 0.72 };
  }
}
