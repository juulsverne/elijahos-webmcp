import * as THREE from "three";
import {
  AUDIO_BAND_LERP,
  AUDIO_BREATH_GAIN_CORE,
  AUDIO_BREATH_GAIN_SHELL,
  AUDIO_BREATH_MAX_CORE,
  AUDIO_BREATH_MAX_SHELL,
  AUDIO_DECAY_PER_SECOND,
  AUDIO_MORPH_GAIN_CORE,
  AUDIO_MORPH_GAIN_SHELL,
  AUDIO_NOISE_SPEED_GAIN_CORE,
  AUDIO_NOISE_SPEED_GAIN_SHELL,
  BEAT_COOLDOWN_S,
  BEAT_HISTORY_LENGTH,
  BEAT_MIN_ENERGY,
  BEAT_THRESHOLD,
  KICK_BREATH_GAIN,
  KICK_DECAY_PER_SECOND,
  BREATH_MORPH_AMPLITUDE,
  BREATH_MORPH_CENTER,
  BREATH_NORMALIZATION,
  BREATH_PERIOD_PRIMARY,
  BREATH_PERIOD_SECONDARY,
  BREATH_SECONDARY_WEIGHT,
  BREATH_SHELL_PHASE_OFFSET,
  CORE_NOISE_BASE_SPEED,
  SHELL_NOISE_BASE_SPEED,
} from "./constants";
import { RIPPLE_COUNT, type SceneUniforms } from "./types";

export type AudioBands = { bass: number; mid: number; high: number };

function readCssColor(name: string): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color();

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value ? new THREE.Color(value) : new THREE.Color();
}

export class DragController {
  private rotX = 0;
  private rotY = 0;
  private velX = 0;
  private velY = 0;
  private active = false;
  private readonly ambientY = 0.00075;

  start() {
    this.active = true;
    this.velX = 0;
    this.velY = 0;
  }

  dragBy(dx: number, dy: number) {
    const sensitivity = 0.005;
    this.rotY += dx * sensitivity;
    this.rotX += dy * sensitivity;
    this.velY = dx * sensitivity;
    this.velX = dy * sensitivity;
  }

  stop() {
    this.active = false;
  }

  applyTo(group: THREE.Group) {
    if (!this.active) {
      this.rotY += this.velY + this.ambientY;
      this.rotX += this.velX;
      this.velX *= 0.94;
      this.velY *= 0.94;
      this.rotX *= 0.995;
    }

    group.rotation.y = this.rotY;
    group.rotation.x = this.rotX;
  }
}

export class ParticleSceneController {
  readonly drag = new DragController();
  /**
   * Single source of time for the scene. We use `THREE.Timer` instead of the
   * R3F-provided `THREE.Clock` for two reasons:
   *
   * 1. Multi-call consistency. Several `useFrame` callbacks read time per
   *    frame (the orb rotation, the core rotation, the shader uniform).
   *    `Clock.getElapsedTime()` advances state on every call, so reads within
   *    a single frame disagree by microseconds. `Timer.update()` is called
   *    once per frame and `getElapsed()` returns the same value to all
   *    consumers.
   * 2. Page Visibility. When the tab is hidden and the user comes back,
   *    `Clock` reports the full elapsed wall-clock — the noise displacement
   *    snaps and the rotation jumps. `Timer.connect(document)` zeros the
   *    delta while hidden, so the scene resumes smoothly.
   *
   * `connect(document)` / `disconnect()` are wired by `ParticleField`.
   */
  readonly timer = new THREE.Timer();
  /** Cursor into `uRipples` for the next FIFO write. */
  private rippleSlot = 0;

  // --- Audio reactivity state -------------------------------------------
  // Smoothed band magnitudes in [0, 1]. Updated each frame in `setAudio`
  // and read by the scene to modulate geometry, materials, and uniforms.
  audioBass = 0;
  audioMid = 0;
  audioHigh = 0;
  // Derived breath multipliers. Applied multiplicatively on top of the
  // sine breath in `updateBlobBuffers`, so a bass kick visibly inflates
  // the shell and a mid surge expands the core.
  audioBreathCore = 0;
  audioBreathShell = 0;
  // Surface-noise phase accumulators. Replace the previously inline
  // `time * baseSpeed` motion clocks. They advance every frame at the
  // base speed plus a mid-driven boost on the core, so its surface
  // visibly tracks the melody.
  surfacePhaseShell = 0;
  surfacePhaseCore = 0;
  // Transient kick pulse, in [0, 1]. Set to 1 on each detected beat,
  // decays exponentially per frame. Read by the breath calc so each
  // kick drum visibly punches the shell outward on top of the smoothed
  // bass envelope.
  kickPulseShell = 0;
  // Beat detector state: rolling history of bass energies, write cursor,
  // and the last fire time so we can debounce ripples.
  private bassHistory = new Float32Array(BEAT_HISTORY_LENGTH);
  private bassHistoryIndex = 0;
  private lastBeatTime = -Infinity;

  readonly uniforms: SceneUniforms = {
    uTime: { value: 0 },
    uMorphStrengthCore: { value: BREATH_MORPH_CENTER },
    uMorphStrengthShell: { value: BREATH_MORPH_CENTER },
    uRipples: {
      value: Array.from(
        { length: RIPPLE_COUNT },
        () => new THREE.Vector4(0, 0, 0, -1),
      ),
    },
    uPink: { value: readCssColor("--accent-pink") },
    uBlue: { value: readCssColor("--accent-blue") },
    uViolet: { value: readCssColor("--accent-violet") },
    uFg: { value: readCssColor("--fg-1") },
  };

  setTime(time: number) {
    this.uniforms.uTime.value = time;
  }

  /**
   * Layered-sine breath in normalized range [-1, +1]. The primary period sets
   * the dominant rhythm and a slower secondary period (weighted by
   * BREATH_SECONDARY_WEIGHT) prevents perfect cyclic repetition — the
   * combined phase takes ~58s to return to the same value, which reads to
   * the eye as "alive but irregular." Pure function of `t`.
   */
  breath(t: number): number {
    const TAU = Math.PI * 2;
    const primary = Math.sin((TAU * t) / BREATH_PERIOD_PRIMARY);
    const secondary = Math.sin((TAU * t) / BREATH_PERIOD_SECONDARY);
    return (primary + BREATH_SECONDARY_WEIGHT * secondary) / BREATH_NORMALIZATION;
  }

  /** Core leads the breath. */
  breathCore(t: number): number {
    return this.breath(t);
  }

  /** Outer shell trails the core by BREATH_SHELL_PHASE_OFFSET seconds. */
  breathShell(t: number): number {
    return this.breath(t - BREATH_SHELL_PHASE_OFFSET);
  }

  /**
   * Compute both breath values and write them into the morph-strength
   * uniforms. Must run before any shader reads the uniforms in the same
   * frame; `TimeUpdater` calls this at useFrame priority -1 alongside
   * `setTime`.
   */
  setBreath(t: number) {
    this.uniforms.uMorphStrengthCore.value =
      BREATH_MORPH_CENTER + BREATH_MORPH_AMPLITUDE * this.breathCore(t);
    this.uniforms.uMorphStrengthShell.value =
      BREATH_MORPH_CENTER + BREATH_MORPH_AMPLITUDE * this.breathShell(t);
  }

  /**
   * Feed in (or clear) live FFT band magnitudes. Called every frame from
   * `TimeUpdater` after `setBreath`, so any morph-uniform writes here
   * layer on top of the existing organic breath.
   *
   * When `bands` is null (paused / no audio attached), all audio fields
   * decay exponentially toward zero so the orb glides back to its idle
   * sine breath without snapping.
   */
  setAudio(bands: AudioBands | null, dt: number, time: number) {
    if (bands === null) {
      const decay = Math.exp(-dt * AUDIO_DECAY_PER_SECOND);
      this.audioBass *= decay;
      this.audioMid *= decay;
      this.audioHigh *= decay;
      this.audioBreathCore *= decay;
      this.audioBreathShell *= decay;
      this.kickPulseShell *= Math.exp(-dt * KICK_DECAY_PER_SECOND);
      // Keep surface motion advancing at the idle base rate so the orb
      // never freezes when audio is paused.
      this.surfacePhaseShell += dt * SHELL_NOISE_BASE_SPEED;
      this.surfacePhaseCore += dt * CORE_NOISE_BASE_SPEED;
      return;
    }

    // Decay the kick pulse first so a beat fired this frame stays at
    // full strength; otherwise we'd attenuate it the same frame it's
    // emitted.
    this.kickPulseShell *= Math.exp(-dt * KICK_DECAY_PER_SECOND);

    // Low-pass filter the incoming bands so a single noisy frame does not
    // jolt the visuals.
    this.audioBass += (bands.bass - this.audioBass) * AUDIO_BAND_LERP;
    this.audioMid += (bands.mid - this.audioMid) * AUDIO_BAND_LERP;
    this.audioHigh += (bands.high - this.audioHigh) * AUDIO_BAND_LERP;

    // Bass speeds up the shell's surface motion; mids speed up the core's.
    // The phase accumulators advance monotonically — never jumping — so
    // the existing sin/cos noise pattern animates visibly faster on heavy
    // bass without any discontinuity when audio starts or stops.
    this.surfacePhaseShell +=
      dt
      * (SHELL_NOISE_BASE_SPEED + this.audioBass * AUDIO_NOISE_SPEED_GAIN_SHELL);
    this.surfacePhaseCore +=
      dt
      * (CORE_NOISE_BASE_SPEED + this.audioMid * AUDIO_NOISE_SPEED_GAIN_CORE);

    // Mids drive the inner core breath; bass plus the transient kick
    // pulse drive the outer shell. The kick term lets every kick drum
    // punch the shell visibly even when the smoothed bass envelope is
    // already saturated. Hard-cap each so a loud transient cannot push
    // the geometry past a known maximum scale (keeps the orb clear of
    // the topbar and dock).
    this.audioBreathCore = Math.min(
      this.audioMid * AUDIO_BREATH_GAIN_CORE,
      AUDIO_BREATH_MAX_CORE,
    );
    this.audioBreathShell = Math.min(
      this.audioBass * AUDIO_BREATH_GAIN_SHELL
        + this.kickPulseShell * KICK_BREATH_GAIN,
      AUDIO_BREATH_MAX_SHELL,
    );

    // Layer audio morph on top of the sine breath morph already written
    // by `setBreath`.
    this.uniforms.uMorphStrengthCore.value +=
      this.audioMid * AUDIO_MORPH_GAIN_CORE;
    this.uniforms.uMorphStrengthShell.value +=
      this.audioBass * AUDIO_MORPH_GAIN_SHELL;

    // Beat detection: compare current bass to a rolling-window mean.
    this.bassHistory[this.bassHistoryIndex] = bands.bass;
    this.bassHistoryIndex =
      (this.bassHistoryIndex + 1) % this.bassHistory.length;
    let mean = 0;
    for (let i = 0; i < this.bassHistory.length; i++) {
      mean += this.bassHistory[i];
    }
    mean /= this.bassHistory.length;

    const sinceBeat = time - this.lastBeatTime;
    if (
      bands.bass > BEAT_MIN_ENERGY &&
      bands.bass > mean * BEAT_THRESHOLD &&
      sinceBeat > BEAT_COOLDOWN_S
    ) {
      this.lastBeatTime = time;
      // Punch the shell outward — symmetric pulse driven from the
      // breath calc, no directional ripple. Beat-triggered ripples were
      // making the shell read as "moving around" rather than pulsing.
      // Click-driven ripples (via the InteractionLayer) still work.
      this.kickPulseShell = 1.0;
    }
  }

  setRippleDirection(direction: THREE.Vector3) {
    const normalized =
      direction.lengthSq() > 0
        ? direction.clone().normalize()
        : new THREE.Vector3(0, 0, 1);

    this.uniforms.uRipples.value[this.rippleSlot].set(
      normalized.x,
      normalized.y,
      normalized.z,
      this.uniforms.uTime.value,
    );
    this.rippleSlot = (this.rippleSlot + 1) % RIPPLE_COUNT;
  }

  setRipple(hit: THREE.Vector3) {
    this.setRippleDirection(hit);
  }
}
