// Remote-control seam for the music player, so the WebMCP `play_music` tool
// can drive the same player a human uses without reaching into component
// state.
//
// The mounted player (desktop MusicWidget) registers a controller; callers
// send commands through `sendMusicCommand`. When no player is mounted yet —
// the widget panel lazy-mounts its widgets on first open — the latest command
// is queued and delivered on registration, so "open the panel, then play"
// works in one tool call.
//
// Deliberately tiny and framework-free: no store, no events, one pending
// slot. Agent-triggered playback is best-effort by design — browsers may
// still block audio until the visitor has interacted with the page, and the
// player already surfaces that (widget shows paused, system log warns).

export type MusicAction = "play" | "pause" | "next" | "previous";

export type MusicCommand = {
  action: MusicAction;
  // Optional 0-based track to jump to before applying the action.
  trackIndex?: number;
};

export type MusicSnapshot = {
  playing: boolean;
  trackIndex: number;
  trackTitle: string | null;
};

export type MusicController = {
  command: (cmd: MusicCommand) => void;
  snapshot: () => MusicSnapshot;
};

let controller: MusicController | null = null;
let pending: MusicCommand | null = null;

// Registers the live player. Returns an unregister function for unmount.
// A command queued while no player was mounted is delivered immediately.
export function registerMusicController(c: MusicController): () => void {
  controller = c;
  if (pending) {
    const cmd = pending;
    pending = null;
    c.command(cmd);
  }
  return () => {
    if (controller === c) controller = null;
  };
}

export type SendMusicCommandResult = {
  // True when a mounted player handled the command synchronously; false when
  // it was queued for the player to pick up on mount.
  delivered: boolean;
};

export function sendMusicCommand(cmd: MusicCommand): SendMusicCommandResult {
  if (controller) {
    controller.command(cmd);
    return { delivered: true };
  }
  pending = cmd;
  return { delivered: false };
}

// Current player state, or null when no player is mounted.
export function musicSnapshot(): MusicSnapshot | null {
  return controller ? controller.snapshot() : null;
}

// Test hook: reset module state between cases.
export function __resetMusicRemoteForTests(): void {
  controller = null;
  pending = null;
}
