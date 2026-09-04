import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  __resetMusicRemoteForTests,
  musicSnapshot,
  registerMusicController,
  sendMusicCommand,
  type MusicCommand,
} from "./music-remote";

function fakeController(received: MusicCommand[]) {
  return {
    command: (cmd: MusicCommand) => received.push(cmd),
    snapshot: () => ({
      playing: true,
      trackIndex: 1,
      trackTitle: "Track Two",
    }),
  };
}

beforeEach(() => {
  __resetMusicRemoteForTests();
});

describe("music remote", () => {
  it("delivers commands synchronously to a mounted player", () => {
    const received: MusicCommand[] = [];
    registerMusicController(fakeController(received));
    const result = sendMusicCommand({ action: "play" });
    assert.equal(result.delivered, true);
    assert.deepEqual(received, [{ action: "play" }]);
  });

  it("queues the latest command while no player is mounted and delivers on mount", () => {
    const first = sendMusicCommand({ action: "next" });
    assert.equal(first.delivered, false);
    // Only the latest command survives — a queue of stale commands replayed
    // at once would be worse than honoring the most recent request.
    sendMusicCommand({ action: "play", trackIndex: 2 });

    const received: MusicCommand[] = [];
    registerMusicController(fakeController(received));
    assert.deepEqual(received, [{ action: "play", trackIndex: 2 }]);
  });

  it("reports a snapshot only while a player is mounted", () => {
    assert.equal(musicSnapshot(), null);
    const received: MusicCommand[] = [];
    const unregister = registerMusicController(fakeController(received));
    assert.deepEqual(musicSnapshot(), {
      playing: true,
      trackIndex: 1,
      trackTitle: "Track Two",
    });
    unregister();
    assert.equal(musicSnapshot(), null);
  });

  it("unregister is a no-op when another player already took over", () => {
    const a: MusicCommand[] = [];
    const b: MusicCommand[] = [];
    const unregisterA = registerMusicController(fakeController(a));
    registerMusicController(fakeController(b));
    unregisterA();
    const result = sendMusicCommand({ action: "pause" });
    assert.equal(result.delivered, true);
    assert.deepEqual(b, [{ action: "pause" }]);
  });
});
