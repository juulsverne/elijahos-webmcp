"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ParticleSceneController } from "../runtime";
import {
  type BlobMode,
  createBlobBuffers,
  updateBlobBuffers,
} from "./buffers";

type BlobLayerProps = {
  controller: ParticleSceneController;
  detail: number;
  lineOpacity: number;
  mode: BlobMode;
  pointOpacity: number;
  pointSize: number;
  radius: number;
  rippleStrength: number;
  tangentStrength: number;
};

export function DeformingBlobLayer({
  controller,
  detail,
  lineOpacity,
  mode,
  pointOpacity,
  pointSize,
  radius,
  rippleStrength,
  tangentStrength,
}: BlobLayerProps) {
  const buffers = useMemo(
    () => createBlobBuffers(radius, detail, mode, controller),
    [controller, detail, mode, radius],
  );

  useEffect(
    () => () => {
      buffers.pointGeometry.dispose();
      buffers.lineGeometry.dispose();
    },
    [buffers],
  );

  useFrame(() => {
    updateBlobBuffers(
      buffers,
      controller,
      mode,
      radius,
      rippleStrength,
      tangentStrength,
    );
  });

  const blending =
    mode === "core" ? THREE.AdditiveBlending : THREE.NormalBlending;

  return (
    <>
      <lineSegments geometry={buffers.lineGeometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={lineOpacity}
          depthWrite={false}
          blending={blending}
        />
      </lineSegments>
      <points geometry={buffers.pointGeometry} frustumCulled={false}>
        <pointsMaterial
          vertexColors
          transparent
          opacity={pointOpacity}
          depthWrite={false}
          blending={blending}
          size={pointSize}
          sizeAttenuation
        />
      </points>
    </>
  );
}
