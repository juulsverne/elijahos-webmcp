"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioAnalyserStore, type AudioBands } from "@/lib/audio-analyser";
import type { ParticleSceneController } from "../runtime";

export function TimeUpdater({
  controller,
}: {
  controller: ParticleSceneController;
}) {
  // Reused per-frame band buffer so the audio sample path never allocates.
  const bandsBuf = useMemo<AudioBands>(
    () => ({ bass: 0, mid: 0, high: 0 }),
    [],
  );
  useFrame((_, dt) => {
    controller.timer.update();
    const t = controller.timer.getElapsed();
    controller.setTime(t);
    controller.setBreath(t);

    // Non-reactive read — `getState()` does not subscribe, so this never
    // triggers a React render. When the analyser is attached and the
    // music element is playing, feed live FFT bands into the controller;
    // otherwise let it decay back to silent.
    const audio = useAudioAnalyserStore.getState();
    if (audio.sampleBands(bandsBuf)) {
      controller.setAudio(bandsBuf, dt, t);
    } else {
      controller.setAudio(null, dt, t);
    }
  }, -1);
  return null;
}

export function DragRig({
  children,
  controller,
}: {
  children: ReactNode;
  controller: ParticleSceneController;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    controller.drag.applyTo(groupRef.current);
  });

  return <group ref={groupRef}>{children}</group>;
}

export function ParallaxRig({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const max = 0.045;
    const tx = -target.current.y * max;
    const ty = target.current.x * max;
    groupRef.current.rotation.x += (tx - groupRef.current.rotation.x) * 0.025;
    groupRef.current.rotation.y += (ty - groupRef.current.rotation.y) * 0.025;
  });

  return <group ref={groupRef}>{children}</group>;
}
