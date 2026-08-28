"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDesktopStore } from "@/lib/desktop-store";
import { APPS } from "@/lib/apps";
import { Window } from "./Window";
import { APP_COMPONENTS } from "./apps/registry";

function WindowEntry({ id }: { id: string }) {
  const win = useDesktopStore((s) => s.wins.find((w) => w.id === id));
  const app = APPS[id];
  const Body = APP_COMPONENTS[id];
  const body = useMemo(() => (Body ? <Body /> : null), [Body]);

  if (!win || !app || !Body) return null;

  return (
    <Window win={win} app={app}>
      {body}
    </Window>
  );
}

export function WindowHost() {
  const windowIds = useDesktopStore(useShallow((s) => s.wins.map((w) => w.id)));
  const snapHint = useDesktopStore((s) => s.snapHint);

  // Don't filter minimized windows — they stay mounted so the minimize
  // animation can play out and then sit invisible. The Window component
  // applies an `is-minimized` class that hides it via transform + opacity.
  return (
    <>
      {windowIds.map((id) => (
        <WindowEntry key={id} id={id} />
      ))}
      {snapHint && (
        <div
          className="snap-preview"
          aria-hidden="true"
          style={{
            left: snapHint.rect.x,
            top: snapHint.rect.y,
            width: snapHint.rect.w,
            height: snapHint.rect.h,
          }}
        />
      )}
    </>
  );
}
