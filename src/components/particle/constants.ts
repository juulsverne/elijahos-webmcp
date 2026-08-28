export const SCENE_SCALE = 0.62;
export const HIT_RADIUS = 5.5 * SCENE_SCALE;
export const RIPPLE_DRAG_THRESHOLD_PX = 14;

export const OUTER_SHELL_RADIUS = 5;
export const OUTER_SHELL_DETAIL = 6;

export const CORE_RADIUS = 2.1;
export const CORE_BLOB_DETAIL = 4;

// --- Breath ---------------------------------------------------------------
// All knobs for the orb's breathing motion live here. The waveform is two
// layered sines: a primary period drives the dominant rhythm and a slower
// secondary period prevents perfect repetition. NORMALIZATION = 1 +
// SECONDARY_WEIGHT, the worst-case sum of both sines, so the normalized
// breath stays in [-1, +1] no matter how the two phases align.

export const BREATH_PERIOD_PRIMARY = 16.0;
export const BREATH_PERIOD_SECONDARY = 44.0;
export const BREATH_SECONDARY_WEIGHT = 0.30;
export const BREATH_NORMALIZATION = 1 + BREATH_SECONDARY_WEIGHT;
export const BREATH_SHELL_PHASE_OFFSET = 0.60;
export const BREATH_SCALE_AMPLITUDE = 0.022;
export const BREATH_MORPH_CENTER = 0.60;
// Global morph swing is intentionally tiny — the dominant non-uniform
// surface motion is the per-vertex spatial breath on each dynamic graph
// layer, not this uniform-driven global rhythm.
export const BREATH_MORPH_AMPLITUDE = 0.04;

// --- Audio reactivity ----------------------------------------------------
// FFT size and smoothing for the AnalyserNode. fftSize=256 → 128 bins, each
// covering ~172 Hz at 44.1 kHz — plenty for three coarse bands.
export const AUDIO_FFT_SIZE = 256;
export const AUDIO_SMOOTHING = 0.6;

// Band splits over the 128 frequency bins. Bins are inclusive-low,
// exclusive-high. With ~172 Hz per bin: bass < ~516 Hz, mid up to ~4 kHz,
// rest is high.
export const AUDIO_BAND_BASS_END = 3;
export const AUDIO_BAND_MID_END = 24;

// Per-frame low-pass smoothing for incoming bands. Higher = snappier.
export const AUDIO_BAND_LERP = 0.30;
// When audio stops, audio fields decay toward 0 with this rate (per second).
// e.g. 4.0 → ~98% gone after 1s.
export const AUDIO_DECAY_PER_SECOND = 4.0;

// Visual gains. Tune by ear.
//
// Audio reactivity is intentionally minimal in color: ripples (driven by
// beat detection below) carry most of the feel, plus a breath pulse so
// the orb subtly inflates with the music. No continuous color or
// opacity modulation — those were too distracting.
export const AUDIO_BREATH_GAIN_CORE = 0.08;
export const AUDIO_BREATH_GAIN_SHELL = 0.09;
export const AUDIO_MORPH_GAIN_CORE = 0.14;
export const AUDIO_MORPH_GAIN_SHELL = 0.18;

// Hard ceilings on the audio-driven breath multiplier so the orb cannot
// grow past a known maximum scale on extreme bass / mid hits. Geometry
// scale is `(1 + sineBreath) * (1 + audioBreath)`, so a cap of 0.10 means
// the audio component alone never adds more than 10% to the radius —
// well inside the viewport's safe zone above the topbar and below the
// dock.
export const AUDIO_BREATH_MAX_CORE = 0.07;
export const AUDIO_BREATH_MAX_SHELL = 0.07;

// Base advance rates for the surface-noise phase. Replaces the
// previously inline `time * 0.55` / `time * 0.34` constants. When audio
// is silent these are the steady idle motion speeds.
export const SHELL_NOISE_BASE_SPEED = 0.55;
export const CORE_NOISE_BASE_SPEED = 0.34;
// Mids accelerate the core's surface phase, making it visibly track the
// melody. Shell stays at base speed — its kick reaction comes from the
// discrete kick-pulse below, not from chaotic noise acceleration.
export const AUDIO_NOISE_SPEED_GAIN_SHELL = 0.0;
export const AUDIO_NOISE_SPEED_GAIN_CORE = 0.8;

// Kick pulse: each detected beat sets `kickPulseShell` to 1.0 and it
// decays exponentially so the shell visibly punches outward on every
// kick drum, on top of the smoothly tracked sustained bass. This is the
// transient that makes the orb "follow the beat" instead of just humming
// with the bass envelope.
export const KICK_BREATH_GAIN = 0.055;
export const KICK_DECAY_PER_SECOND = 8.0;

// Beat detector on the bass band: rolling history length (~1s @ 60fps),
// energy multiplier over the running mean to count as a beat, a hard floor
// so silence does not fire, and a cooldown so a fast kick pattern does not
// spam ripples. These are intentionally sensitive — ripples on the outer
// shell are the main music-reactive signal.
export const BEAT_HISTORY_LENGTH = 43;
export const BEAT_THRESHOLD = 1.22;
export const BEAT_MIN_ENERGY = 0.10;
export const BEAT_COOLDOWN_S = 0.13;
