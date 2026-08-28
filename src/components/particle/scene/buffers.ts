import * as THREE from "three";
import { BREATH_SCALE_AMPLITUDE } from "../constants";
import type { ParticleSceneController } from "../runtime";

export const RIPPLE_LIFE_SECONDS = 1.6;

export type BlobMode = "shell" | "core";

export type BlobBuffers = {
  basePositions: Float32Array;
  baseColors: Float32Array;
  lumpScales: Float32Array;
  edgePairs: Uint32Array;
  pointGeometry: THREE.BufferGeometry;
  lineGeometry: THREE.BufferGeometry;
  pointPositions: Float32Array;
  pointColors: Float32Array;
  linePositions: Float32Array;
  lineColors: Float32Array;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addEdge(edgeSet: Set<string>, edges: number[], a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const key = `${lo}:${hi}`;
  if (edgeSet.has(key)) return;
  edgeSet.add(key);
  edges.push(lo, hi);
}

function hashSigned(x: number, y: number, z: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function makeBaseColors(
  basePositions: Float32Array,
  mode: BlobMode,
  controller: ParticleSceneController,
) {
  const colors = new Float32Array(basePositions.length);
  const shellColor = controller.uniforms.uFg.value;
  const pink = controller.uniforms.uPink.value;
  const blue = controller.uniforms.uBlue.value;
  const violet = controller.uniforms.uViolet.value;

  for (let i = 0; i < basePositions.length / 3; i++) {
    const ix = i * 3;
    const x = basePositions[ix];
    const y = basePositions[ix + 1];
    const z = basePositions[ix + 2];

    let color = shellColor;
    if (mode === "core") {
      const hue = Math.sin(x * 0.5 + y * 0.3 + z * 0.2) * 0.5 + 0.5;
      color = violet.clone().multiplyScalar(0.55).lerp(
        pink.clone().lerp(blue, hue),
        0.75,
      );
    }

    colors[ix] = color.r;
    colors[ix + 1] = color.g;
    colors[ix + 2] = color.b;
  }

  return colors;
}

function makeLumpScales(basePositions: Float32Array, mode: BlobMode) {
  const count = basePositions.length / 3;
  const lumps = new Float32Array(count);
  const strength = mode === "shell" ? 0.145 : 0.115;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const x = basePositions[ix];
    const y = basePositions[ix + 1];
    const z = basePositions[ix + 2];
    const coarse = hashSigned(x * 0.45, y * 0.45, z * 0.45);
    const fine = hashSigned(x * 1.7 + 8.1, y * 1.7 - 3.4, z * 1.7 + 1.9);
    lumps[i] = (coarse * 0.75 + fine * 0.25) * strength;
  }

  return lumps;
}

export function createBlobBuffers(
  radius: number,
  detail: number,
  mode: BlobMode,
  controller: ParticleSceneController,
): BlobBuffers {
  const source = new THREE.IcosahedronGeometry(radius, detail);
  const positionAttribute = source.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const basePositions = new Float32Array(positionAttribute.array);
  const baseColors = makeBaseColors(basePositions, mode, controller);
  const lumpScales = makeLumpScales(basePositions, mode);
  const index = source.getIndex();
  const edgeSet = new Set<string>();
  const edges: number[] = [];

  if (index) {
    const triangles = index.array;
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i];
      const b = triangles[i + 1];
      const c = triangles[i + 2];
      addEdge(edgeSet, edges, a, b);
      addEdge(edgeSet, edges, b, c);
      addEdge(edgeSet, edges, c, a);
    }
  } else {
    for (let i = 0; i < positionAttribute.count; i += 3) {
      addEdge(edgeSet, edges, i, i + 1);
      addEdge(edgeSet, edges, i + 1, i + 2);
      addEdge(edgeSet, edges, i + 2, i);
    }
  }

  const edgePairs = new Uint32Array(edges);
  const pointPositions = new Float32Array(basePositions.length);
  const pointColors = new Float32Array(baseColors.length);
  const linePositions = new Float32Array(edgePairs.length * 3);
  const lineColors = new Float32Array(edgePairs.length * 3);
  const pointGeometry = new THREE.BufferGeometry();
  const lineGeometry = new THREE.BufferGeometry();
  const pointPositionAttribute = new THREE.BufferAttribute(pointPositions, 3);
  const pointColorAttribute = new THREE.BufferAttribute(pointColors, 3);
  const linePositionAttribute = new THREE.BufferAttribute(linePositions, 3);
  const lineColorAttribute = new THREE.BufferAttribute(lineColors, 3);

  pointPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  pointColorAttribute.setUsage(THREE.DynamicDrawUsage);
  linePositionAttribute.setUsage(THREE.DynamicDrawUsage);
  lineColorAttribute.setUsage(THREE.DynamicDrawUsage);
  pointGeometry.setAttribute("position", pointPositionAttribute);
  pointGeometry.setAttribute("color", pointColorAttribute);
  lineGeometry.setAttribute("position", linePositionAttribute);
  lineGeometry.setAttribute("color", lineColorAttribute);
  source.dispose();

  return {
    basePositions,
    baseColors,
    lumpScales,
    edgePairs,
    pointGeometry,
    lineGeometry,
    pointPositions,
    pointColors,
    linePositions,
    lineColors,
  };
}

export function updateBlobBuffers(
  buffers: BlobBuffers,
  controller: ParticleSceneController,
  mode: BlobMode,
  radius: number,
  rippleStrength: number,
  tangentStrength: number,
) {
  const time = controller.timer.getElapsed();
  const sineBreath =
    mode === "shell"
      ? controller.breathShell(time)
      : controller.breathCore(time);
  const audioBreath =
    mode === "shell"
      ? controller.audioBreathShell
      : controller.audioBreathCore;
  // Sine breath holds the idle baseline. Audio breath is layered on as a
  // multiplicative bump so a bass kick subtly inflates the orb without
  // erasing the organic rhythm underneath.
  const breath = (1 + BREATH_SCALE_AMPLITUDE * sineBreath) * (1 + audioBreath);
  const ripples = controller.uniforms.uRipples.value;
  const {
    baseColors,
    basePositions,
    edgePairs,
    lineColors,
    lineGeometry,
    linePositions,
    lumpScales,
    pointColors,
    pointGeometry,
    pointPositions,
  } = buffers;

  for (let i = 0; i < basePositions.length / 3; i++) {
    const ix = i * 3;
    const bx = basePositions[ix];
    const by = basePositions[ix + 1];
    const bz = basePositions[ix + 2];
    const invLength = 1 / Math.hypot(bx, by, bz);
    const dirX = bx * invLength;
    const dirY = by * invLength;
    const dirZ = bz * invLength;
    const motionTime =
      mode === "shell"
        ? controller.surfacePhaseShell
        : controller.surfacePhaseCore;
    const noise =
      (Math.sin(dirX * 3.4 + motionTime * 1.25)
        + Math.cos(dirY * 3.1 - motionTime * 1.05)
        + Math.sin((dirZ + dirX) * 4.0 + motionTime * 0.85))
      * radius
      * (mode === "shell" ? 0.070 : 0.090);
    const lump =
      lumpScales[i]
      * radius
      * (1 + 0.18 * Math.sin(motionTime * 0.65 + dirX * 2.1 - dirY * 1.4));

    let offsetX = dirX * (noise + lump);
    let offsetY = dirY * (noise + lump);
    let offsetZ = dirZ * (noise + lump);
    let energy = 0;

    for (let r = 0; r < ripples.length; r++) {
      const ripple = ripples[r];
      const age = time - ripple.w;
      if (ripple.w < 0 || age < 0 || age > RIPPLE_LIFE_SECONDS) continue;

      const originLength = Math.hypot(ripple.x, ripple.y, ripple.z) || 1;
      const ox = ripple.x / originLength;
      const oy = ripple.y / originLength;
      const oz = ripple.z / originLength;
      const dot = clamp(dirX * ox + dirY * oy + dirZ * oz, -1, 1);
      const angle = Math.acos(dot);
      const age01 = age / RIPPLE_LIFE_SECONDS;
      const front = age01 * Math.PI * 1.05;
      const travel = angle - front;
      const fade = Math.pow(1 - age01, 1.25);
      const sigma = 0.30 + 0.10 * (1 - age01);
      const crest = Math.exp(-(travel * travel) / (sigma * sigma));
      const troughAt = travel + sigma * 1.7;
      const trough = Math.exp(
        -(troughAt * troughAt) / ((sigma * 1.35) * (sigma * 1.35)),
      );
      const impact = Math.exp(-(angle * angle) / 0.10) * Math.exp(-age * 3.2);
      const wave = ((crest - trough * 0.62) * fade) + impact * 0.85;
      const tangentXRaw = dirX - ox * dot;
      const tangentYRaw = dirY - oy * dot;
      const tangentZRaw = dirZ - oz * dot;
      const tangentLength =
        Math.hypot(tangentXRaw, tangentYRaw, tangentZRaw) || 1;
      const tangentX = tangentXRaw / tangentLength;
      const tangentY = tangentYRaw / tangentLength;
      const tangentZ = tangentZRaw / tangentLength;
      const radial = wave * rippleStrength;
      const tangent = wave * tangentStrength;

      offsetX += dirX * radial + tangentX * tangent;
      offsetY += dirY * radial + tangentY * tangent;
      offsetZ += dirZ * radial + tangentZ * tangent;
      energy += Math.abs(wave);
    }

    const brightness =
      1 + Math.min(energy, 2.2) * (mode === "shell" ? 0.80 : 0.62);
    pointPositions[ix] = (bx + offsetX) * breath;
    pointPositions[ix + 1] = (by + offsetY) * breath;
    pointPositions[ix + 2] = (bz + offsetZ) * breath;
    pointColors[ix] = Math.min(1, baseColors[ix] * brightness);
    pointColors[ix + 1] = Math.min(1, baseColors[ix + 1] * brightness);
    pointColors[ix + 2] = Math.min(1, baseColors[ix + 2] * brightness);
  }

  for (let i = 0; i < edgePairs.length; i++) {
    const sourceIndex = edgePairs[i] * 3;
    const targetIndex = i * 3;
    linePositions[targetIndex] = pointPositions[sourceIndex];
    linePositions[targetIndex + 1] = pointPositions[sourceIndex + 1];
    linePositions[targetIndex + 2] = pointPositions[sourceIndex + 2];
    lineColors[targetIndex] = pointColors[sourceIndex];
    lineColors[targetIndex + 1] = pointColors[sourceIndex + 1];
    lineColors[targetIndex + 2] = pointColors[sourceIndex + 2];
  }

  pointGeometry.attributes.position.needsUpdate = true;
  pointGeometry.attributes.color.needsUpdate = true;
  lineGeometry.attributes.position.needsUpdate = true;
  lineGeometry.attributes.color.needsUpdate = true;
}
