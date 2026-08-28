import * as THREE from "three";

/**
 * Max number of concurrent click-ripples on the orb. The shader iterates a
 * fixed-size array, and `ParticleSceneController.setRipple` writes into the
 * next slot FIFO so a fifth click overwrites the oldest mid-fade.
 *
 * Keep this in sync with the `RIPPLE_COUNT` literal in `shaders.ts`.
 */
export const RIPPLE_COUNT = 4;

export type SceneUniforms = {
  uTime: { value: number };
  /** Noise displacement strength for the inner core, modulated each frame by the breath. */
  uMorphStrengthCore: { value: number };
  /** Noise displacement strength for the outer shell, phase-offset behind the core. */
  uMorphStrengthShell: { value: number };
  /**
   * Fixed-size pool of active ripples. For each entry: xyz = clicked surface
   * direction in world space, w = start time; w < 0 marks the slot inactive.
   */
  uRipples: { value: THREE.Vector4[] };
  uPink: { value: THREE.Color };
  uBlue: { value: THREE.Color };
  uViolet: { value: THREE.Color };
  uFg: { value: THREE.Color };
};
