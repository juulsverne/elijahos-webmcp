"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ParticleScene } from "@/components/particle/scene";
import { ParticleSceneController } from "@/components/particle/runtime";
import { emit } from "@/lib/system-events";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Feature-detect a usable WebGL context. On locked-down corporate machines,
// GPU-blocklisted browsers, or some Linux setups, the context is null — without
// this check fiber throws on Canvas creation and (caught by the ErrorBoundary
// wrapping this component) the hero just vanishes. We'd rather not even mount.
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function ParticleField() {
  const reducedMotion = useReducedMotion();
  // Evaluated once on mount. This component is dynamically imported with
  // ssr:false, so window is always present here.
  const [webglOk] = useState(() =>
    typeof window === "undefined" ? false : supportsWebGL(),
  );
  const controller = useMemo(() => new ParticleSceneController(), []);

  // Skip the 60fps loop entirely when the visitor prefers reduced motion or
  // the GPU can't run it. The static .lc-bg / .lc-iridescent / .lc-grain
  // layers behind this already render a complete background.
  const enabled = webglOk && !reducedMotion;

  // Wire the controller's THREE.Timer to the Page Visibility API. When the
  // tab is hidden, Timer.update() returns a zero delta — without this, the
  // user comes back from a long backgrounded tab and the noise-displaced
  // sphere snaps to whatever wall-clock said it should be.
  useEffect(() => {
    if (!enabled) return;
    controller.timer.connect(document);
    emit("BOOT", "particle field init");
    return () => {
      controller.timer.dispose();
    };
  }, [controller, enabled]);

  if (!enabled) return null;

  return (
    <Canvas
      className="particle-canvas"
      camera={{ position: [0, 0, 12], fov: 50 }}
      // antialias off: MSAA buys little on an additive point cloud and costs
      // fill rate. powerPreference "default" so laptops don't force the
      // discrete GPU (fan spin / battery drain) for a background effect.
      gl={{ alpha: true, antialias: false, powerPreference: "default" }}
      dpr={[1, 1.5]}
    >
      <ParticleScene controller={controller} />
    </Canvas>
  );
}
