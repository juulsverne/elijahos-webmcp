"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OUTER_SHELL_RADIUS, RIPPLE_DRAG_THRESHOLD_PX } from "./constants";
import type { ParticleSceneController } from "./runtime";

type PointerState = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
};

export function InteractionLayer({
  controller,
}: {
  controller: ParticleSceneController;
}) {
  const { camera, gl } = useThree();
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const activeRef = useRef<PointerState | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const canvas = gl.domElement;

    const hitTest = (event: PointerEvent): THREE.Vector3 | null => {
      const hitMesh = hitMeshRef.current;
      if (!hitMesh) return null;

      const rect = canvas.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * -2 + 1,
      );

      hitMesh.updateWorldMatrix(true, false);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(hitMesh, false)[0];
      if (!hit) return null;

      const localHit = hit.point.clone();
      hitMesh.worldToLocal(localHit);
      return localHit;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const hit = hitTest(event);
      if (!hit) return;

      activeRef.current = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        dragging: false,
      };
      controller.setRipple(hit);
      event.preventDefault();

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {}
    };

    const onMove = (event: PointerEvent) => {
      const active = activeRef.current;
      if (!active) {
        canvas.classList.toggle("is-interactive", hitTest(event) !== null);
        return;
      }

      if (active.id !== event.pointerId) return;

      const dx = event.clientX - active.lastX;
      const dy = event.clientY - active.lastY;
      active.lastX = event.clientX;
      active.lastY = event.clientY;

      if (!active.dragging) {
        const moved = Math.hypot(
          event.clientX - active.startX,
          event.clientY - active.startY,
        );
        if (moved < RIPPLE_DRAG_THRESHOLD_PX) {
          event.preventDefault();
          return;
        }

        active.dragging = true;
        controller.drag.start();
        canvas.classList.add("is-dragging");
      }

      controller.drag.dragBy(dx, dy);
      event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      const active = activeRef.current;
      if (!active || active.id !== event.pointerId) return;

      activeRef.current = null;
      if (active.dragging) {
        controller.drag.stop();
        canvas.classList.remove("is-dragging");
      }
      canvas.classList.toggle("is-interactive", hitTest(event) !== null);
      event.preventDefault();

      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {}
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.classList.remove("is-interactive");
      canvas.classList.remove("is-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [camera, controller, gl, ndc, raycaster]);

  return (
    <mesh ref={hitMeshRef}>
      <sphereGeometry args={[OUTER_SHELL_RADIUS * 1.08, 32, 16]} />
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
        colorWrite={false}
      />
    </mesh>
  );
}
