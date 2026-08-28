import assert from "node:assert/strict";
import { describe, it } from "node:test";

type DesktopStore = typeof import("./desktop-store").useDesktopStore;

function installBrowserStorage(): void {
  const data = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      innerWidth: 1280,
      innerHeight: 800,
    },
  });
}

async function loadDesktopStore(): Promise<DesktopStore> {
  installBrowserStorage();
  return (await import("./desktop-store")).useDesktopStore;
}

function resetDesktopStore(useDesktopStore: DesktopStore): void {
  useDesktopStore.setState({
    wins: [],
    focusId: null,
    zCounter: 0,
    unlocks: new Set<string>(),
    sessionPassword: null,
    launchpadOpen: false,
  });
}

describe("desktop store", () => {
  it("does not focus a missing window id", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().focus("missing");

    const state = useDesktopStore.getState();
    assert.equal(state.focusId, null);
    assert.equal(state.zCounter, 0);
    assert.deepEqual(state.wins, []);
  });

  it("focuses only successfully opened windows when opening many", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().openMany(["missing"]);
    let state = useDesktopStore.getState();
    assert.equal(state.focusId, null);
    assert.equal(state.zCounter, 0);
    assert.deepEqual(state.wins, []);

    useDesktopStore.getState().openMany(["about", "missing"]);
    state = useDesktopStore.getState();
    assert.equal(state.focusId, "about");
    assert.deepEqual(state.wins.map((win) => win.id), ["about"]);
  });

  it("offsets a newly opened window away from an occupied launch rect", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);
    useDesktopStore.setState({
      wins: [
        {
          id: "projects",
          x: 60,
          y: 90,
          w: 480,
          h: 620,
          z: 1,
          minimized: false,
          maximized: false,
        },
      ],
      focusId: "projects",
      zCounter: 1,
    });

    useDesktopStore.getState().open("about");

    const about = useDesktopStore.getState().wins.find((win) => win.id === "about");
    assert.equal(about?.x, 88);
    assert.equal(about?.y, 118);
  });

  it("can open a window behind the currently focused Ask window", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("ask");

    useDesktopStore.getState().open("about", { background: true });

    const state = useDesktopStore.getState();
    const ask = state.wins.find((win) => win.id === "ask");
    const about = state.wins.find((win) => win.id === "about");
    assert.equal(state.focusId, "ask");
    assert.equal(about?.minimized, false);
    assert.ok(about && ask && about.z < ask.z);
  });

  it("can arrange windows behind the currently focused Ask window", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("ask");

    useDesktopStore
      .getState()
      .openManyArranged(["about", "projects", "case"], { preserveFocus: true });

    const state = useDesktopStore.getState();
    const ask = state.wins.find((win) => win.id === "ask");
    const opened = state.wins.filter((win) =>
      ["about", "projects", "case"].includes(win.id),
    );
    assert.equal(state.focusId, "ask");
    assert.equal(opened.length, 3);
    assert.ok(opened.every((win) => ask && win.z < ask.z));
  });

  it("focuses the top remaining window after closing the focused window", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().openMany(["about", "projects"]);
    let state = useDesktopStore.getState();
    assert.equal(state.focusId, "projects");

    useDesktopStore.getState().close("projects");
    state = useDesktopStore.getState();
    assert.equal(state.focusId, "about");
    assert.deepEqual(state.wins.map((win) => win.id), ["about"]);
  });

  it("moves focus away from minimized windows", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().openMany(["about", "projects"]);
    let state = useDesktopStore.getState();
    assert.equal(state.focusId, "projects");

    useDesktopStore.getState().minimize("projects");
    state = useDesktopStore.getState();
    assert.equal(state.focusId, "about");
    assert.equal(state.wins.find((win) => win.id === "projects")?.minimized, true);

    useDesktopStore.getState().minimize("about");
    state = useDesktopStore.getState();
    assert.equal(state.focusId, null);
  });

  it("restores a minimized window when focusing it", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().openMany(["about", "projects"]);
    useDesktopStore.getState().minimize("projects");

    useDesktopStore.getState().focus("projects");

    const state = useDesktopStore.getState();
    assert.equal(state.focusId, "projects");
    assert.equal(state.wins.find((win) => win.id === "projects")?.minimized, false);
    assert.equal(
      Math.max(...state.wins.map((win) => win.z)),
      state.wins.find((win) => win.id === "projects")?.z,
    );
  });

  it("clears stale maximize state after manual geometry changes", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    useDesktopStore.getState().toggleMaximize("about", 1280, 800);
    useDesktopStore.getState().move("about", 120, 140);

    let win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.maximized, false);
    assert.equal(win?.prevRect, undefined);

    useDesktopStore.getState().toggleMaximize("about", 1280, 800);
    useDesktopStore.getState().setRect("about", 130, 150, 520, 360);

    win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.maximized, false);
    assert.equal(win?.prevRect, undefined);
  });

  it("preserves maximize state for system-driven maximized reflows", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    useDesktopStore.getState().toggleMaximize("about", 1280, 800);
    const prevRect = useDesktopStore
      .getState()
      .wins.find((w) => w.id === "about")?.prevRect;
    useDesktopStore
      .getState()
      .setRect("about", 12, 62, 996, 652, { preserveMaximized: true });

    const win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.maximized, true);
    assert.deepEqual(win?.prevRect, prevRect);
  });

  it("snaps a window to the left half and stashes the free rect", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    const free = useDesktopStore.getState().wins.find((w) => w.id === "about");

    useDesktopStore.getState().snap("about", "left", 1280, 800);

    const win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.snap, "left");
    assert.equal(win?.maximized, false);
    assert.equal(win?.x, 12); // MAX_INSETS.left
    assert.equal(win?.y, 62); // MAX_INSETS.top
    // Left half: (viewportW - left - right - gap) / 2 = (1280-12-12-12)/2.
    assert.equal(win?.w, 622);
    assert.deepEqual(win?.prevRect, {
      x: free?.x,
      y: free?.y,
      w: free?.w,
      h: free?.h,
    });
  });

  it("keeps the original free rect when re-snapping between halves", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    const free = useDesktopStore.getState().wins.find((w) => w.id === "about");

    useDesktopStore.getState().snap("about", "left", 1280, 800);
    useDesktopStore.getState().snap("about", "right", 1280, 800);

    const win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.snap, "right");
    // prevRect still points at the original free rect, not the left half.
    assert.deepEqual(win?.prevRect, {
      x: free?.x,
      y: free?.y,
      w: free?.w,
      h: free?.h,
    });
  });

  it("clears snap state when the window is dragged away", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    useDesktopStore.getState().snap("about", "right", 1280, 800);
    useDesktopStore.getState().move("about", 200, 200);

    const win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.snap, undefined);
    assert.equal(win?.maximized, false);
    assert.equal(win?.prevRect, undefined);
  });

  it("restores a half-snapped window via toggleMaximize", async () => {
    const useDesktopStore = await loadDesktopStore();
    resetDesktopStore(useDesktopStore);

    useDesktopStore.getState().open("about");
    const free = useDesktopStore.getState().wins.find((w) => w.id === "about");

    useDesktopStore.getState().snap("about", "left", 1280, 800);
    useDesktopStore.getState().toggleMaximize("about", 1280, 800);

    const win = useDesktopStore.getState().wins.find((w) => w.id === "about");
    assert.equal(win?.snap, undefined);
    assert.equal(win?.maximized, false);
    assert.equal(win?.x, free?.x);
    assert.equal(win?.w, free?.w);
    assert.equal(win?.prevRect, undefined);
  });
});
