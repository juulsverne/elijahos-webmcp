"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { APPS, DOCK_ORDER, LAUNCHPAD_ICON } from "@/lib/apps";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { useDesktopStore } from "@/lib/desktop-store";
import { useWidgetStore } from "@/lib/widget-store";
import { applyMinimizeTarget } from "@/lib/minimize-anim";
import { closeWithAnimation } from "@/lib/window-anim";

const MENU_MARGIN = 8;
// Approximate submenu width, used only to decide which side to flip toward
// before the panel has rendered. The real width comes from CSS min-width.
const SUBMENU_WIDTH = 200;

type MenuPosition = {
  x: number;
  y: number;
};

function getWindowIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const windowEl = target.closest<HTMLElement>("[data-window-id]");
  return windowEl?.dataset.windowId ?? null;
}

type MenuItemProps = {
  icon: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
};

function MenuItem({
  icon,
  label,
  shortcut,
  disabled = false,
  onClick,
}: MenuItemProps) {
  return (
    <button
      type="button"
      className="desktop-menu-item"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="desktop-menu-icon">{icon}</span>
      <span className="desktop-menu-label">{label}</span>
      {shortcut && <span className="desktop-menu-shortcut">{shortcut}</span>}
    </button>
  );
}

// A hover/click-revealed nested panel. Renders inside the parent menu's DOM so
// the parent's outside-click handler still treats interaction here as "inside."
// Opens to the right by default, flipping left when it would overflow the
// viewport's right edge.
function SubMenu({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openNow = useCallback(() => {
    cancelClose();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const overflowsRight =
        rect.right + SUBMENU_WIDTH + MENU_MARGIN > window.innerWidth;
      setSide(overflowsRight ? "left" : "right");
    }
    setOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    // Small grace period so the cursor can cross the gap between the trigger
    // and the offset panel without the submenu collapsing under it.
    closeTimer.current = window.setTimeout(() => setOpen(false), 110);
  }, []);

  useEffect(() => cancelClose, []);

  return (
    <div
      ref={wrapRef}
      className="desktop-submenu-wrap"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="desktop-menu-item"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openNow}
      >
        <span className="desktop-menu-icon">{icon}</span>
        <span className="desktop-menu-label">{label}</span>
        <span className="desktop-menu-chevron" aria-hidden>
          ▸
        </span>
      </button>
      {open && (
        <div
          className={`desktop-menu desktop-submenu desktop-submenu--${side}`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DesktopContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [targetWindowId, setTargetWindowId] = useState<string | null>(null);

  const open = useDesktopStore((s) => s.open);
  const openManyArranged = useDesktopStore((s) => s.openManyArranged);
  const tileOpen = useDesktopStore((s) => s.tileOpen);
  const minimize = useDesktopStore((s) => s.minimize);
  const focus = useDesktopStore((s) => s.focus);

  const widgetsOpen = useWidgetStore((s) => s.isOpen);
  const toggleWidgets = useWidgetStore((s) => s.toggle);

  const copy = UI_COPY.chrome.desktopMenu;
  const wins = useDesktopStore.getState().wins;
  const visibleWins = wins.filter((win) => !win.minimized);
  const targetWin = targetWindowId
    ? wins.find((win) => win.id === targetWindowId)
    : null;
  const targetApp = targetWin ? APPS[targetWin.id] : null;

  // The app launches that live behind the "Open App ▸" submenu, in the order
  // they should appear. Icons come from APPS; labels from shared copy.
  const launchApps: { id: string; label: string }[] = [
    { id: "about", label: copy.apps.about },
    { id: "projects", label: copy.apps.projects },
    { id: "resume", label: copy.apps.resume },
    { id: "contact", label: copy.apps.contact },
    { id: "ask", label: copy.apps.ask(ELIJAH.firstName) },
    { id: "zsh", label: copy.apps.zsh },
  ];

  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lc-root");
    if (!root) return;

    const onContextMenu = (event: MouseEvent) => {
      if (!root.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();

      setTargetWindowId(getWindowIdFromTarget(event.target));
      setPosition({ x: event.clientX, y: event.clientY });
      setIsOpen(true);
    };

    root.addEventListener("contextmenu", onContextMenu);
    return () => root.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const onWindowChange = () => closeMenu();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("blur", onWindowChange);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("blur", onWindowChange);
    };
  }, [closeMenu, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - MENU_MARGIN;
    const maxY = window.innerHeight - rect.height - MENU_MARGIN;
    const nextX = Math.max(MENU_MARGIN, Math.min(position.x, maxX));
    const nextY = Math.max(MENU_MARGIN, Math.min(position.y, maxY));

    if (nextX !== position.x || nextY !== position.y) {
      setPosition({ x: nextX, y: nextY });
    }
  }, [isOpen, position]);

  const run = useCallback(
    (action: () => void) => () => {
      action();
      closeMenu();
    },
    [closeMenu],
  );

  const minimizeWithAnimation = useCallback(
    (winId: string) => {
      const win = useDesktopStore.getState().wins.find((item) => item.id === winId);
      if (!win || win.minimized) return;

      const winEl = document.querySelector<HTMLElement>(
        `[data-window-id="${win.id}"]`,
      );
      const dockBtn = document.querySelector<HTMLElement>(
        `[data-dock-id="${win.id}"]`,
      );

      if (winEl && dockBtn) {
        applyMinimizeTarget(winEl, dockBtn, win.x, win.y, win.w, win.h);
      }
      minimize(win.id);
    },
    [minimize],
  );

  const minimizeAllWithAnimation = useCallback(() => {
    useDesktopStore
      .getState()
      .wins
      .filter((win) => !win.minimized)
      .forEach((win) => minimizeWithAnimation(win.id));
  }, [minimizeWithAnimation]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="desktop-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label={copy.aria}
    >
      <div className="desktop-menu-title">{copy.title(ELIJAH.osName)}</div>

      {targetWin && targetApp && (
        <>
          <MenuItem
            icon={targetApp.icon}
            label={copy.bringToFront}
            shortcut="Enter"
            onClick={run(() => focus(targetWin.id))}
          />
          <MenuItem
            icon="-"
            label={copy.minimizeWindow}
            shortcut="Ctrl M"
            onClick={run(() => minimizeWithAnimation(targetWin.id))}
          />
          <MenuItem
            icon="x"
            label={copy.closeWindow}
            shortcut="Ctrl W"
            onClick={run(() => closeWithAnimation(targetWin.id))}
          />
          <div className="desktop-menu-separator" />
        </>
      )}

      <SubMenu icon={LAUNCHPAD_ICON} label={copy.openApp}>
        {launchApps.map(({ id, label }) => (
          <MenuItem
            key={id}
            icon={APPS[id].icon}
            label={label}
            onClick={run(() => open(id))}
          />
        ))}
      </SubMenu>
      <MenuItem
        icon={APPS.case.icon}
        label={copy.aboutThisOs(ELIJAH.osName)}
        onClick={run(() => open("case"))}
      />

      <div className="desktop-menu-separator" />

      <MenuItem
        icon="⊞"
        label={copy.tidyWindows}
        disabled={visibleWins.length < 2}
        onClick={run(tileOpen)}
      />
      <MenuItem
        icon="◧"
        label={widgetsOpen ? copy.hideWidgets : copy.showWidgets}
        onClick={run(toggleWidgets)}
      />

      <div className="desktop-menu-separator" />

      <MenuItem
        icon="[]"
        label={copy.openAllWindows}
        onClick={run(() => openManyArranged(DOCK_ORDER))}
      />
      <MenuItem
        icon="-"
        label={copy.minimizeAllWindows}
        shortcut="Ctrl Alt M"
        disabled={visibleWins.length === 0}
        onClick={run(minimizeAllWithAnimation)}
      />
      <MenuItem
        icon="x"
        label={copy.closeAllWindows}
        disabled={wins.length === 0}
        // Staggered so the pile-up reads as a sweep rather than a blink.
        onClick={run(() =>
          wins.forEach((win, i) => closeWithAnimation(win.id, i * 40)),
        )}
      />

      <div className="desktop-menu-separator" />

      <button
        type="button"
        className="desktop-menu-item desktop-menu-reboot"
        role="menuitem"
        onClick={run(() => window.location.reload())}
      >
        <span className="desktop-menu-icon">⟳</span>
        <span className="desktop-menu-label">{copy.reboot(ELIJAH.osName)}</span>
        <span className="desktop-menu-shortcut">Ctrl Alt R</span>
      </button>
    </div>
  );
}
