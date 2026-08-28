// Audio analyser singleton.
//
// Wraps the music widget's <audio> element with a Web Audio analyser so the
// particle scene can read live FFT magnitudes per frame. The analyser is
// lazily created on the first user play (iOS Safari requires AudioContext
// creation/resume inside a user gesture).
//
// Hot-path callers (the r3f frame loop) read this with `getState()`, never
// via a hook subscription, so per-frame FFT reads do not trigger React
// renders. `sampleBands` writes into a caller-owned object to keep the path
// allocation-free.

import { create } from "zustand";
import {
  AUDIO_BAND_BASS_END,
  AUDIO_BAND_MID_END,
  AUDIO_FFT_SIZE,
  AUDIO_SMOOTHING,
} from "@/components/particle/constants";

export type AudioBands = { bass: number; mid: number; high: number };

type AudioAnalyserState = {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaElementAudioSourceNode | null;
  audioEl: HTMLAudioElement | null;
  freqBuf: Uint8Array<ArrayBuffer> | null;
  attached: boolean;

  attach: (audioEl: HTMLAudioElement) => void;
  resume: () => void;
  sampleBands: (out: AudioBands) => boolean;
};

export const useAudioAnalyserStore = create<AudioAnalyserState>((set, get) => ({
  context: null,
  analyser: null,
  source: null,
  audioEl: null,
  freqBuf: null,
  attached: false,

  attach(audioEl) {
    if (get().attached) return;
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) return;

    let context: AudioContext;
    let source: MediaElementAudioSourceNode;
    try {
      context = new Ctor();
      // createMediaElementSource throws if the element is already wired
      // to another graph. Bail safely if so.
      source = context.createMediaElementSource(audioEl);
    } catch {
      return;
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = AUDIO_FFT_SIZE;
    analyser.smoothingTimeConstant = AUDIO_SMOOTHING;
    source.connect(analyser);
    // Must connect to destination or the audio goes silent — the analyser
    // is now in the path, the element no longer routes directly to output.
    analyser.connect(context.destination);

    set({
      context,
      analyser,
      source,
      audioEl,
      attached: true,
      freqBuf: new Uint8Array(analyser.frequencyBinCount),
    });
  },

  resume() {
    const ctx = get().context;
    if (ctx && ctx.state === "suspended") void ctx.resume();
  },

  sampleBands(out) {
    const { analyser, freqBuf, audioEl } = get();
    if (!analyser || !freqBuf || !audioEl || audioEl.paused) return false;

    analyser.getByteFrequencyData(freqBuf);

    const bins = freqBuf.length;
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    for (let i = 0; i < bins; i++) {
      const v = freqBuf[i];
      if (i < AUDIO_BAND_BASS_END) bassSum += v;
      else if (i < AUDIO_BAND_MID_END) midSum += v;
      else highSum += v;
    }

    const bassCount = AUDIO_BAND_BASS_END;
    const midCount = AUDIO_BAND_MID_END - AUDIO_BAND_BASS_END;
    const highCount = bins - AUDIO_BAND_MID_END;

    out.bass = bassCount > 0 ? bassSum / bassCount / 255 : 0;
    out.mid = midCount > 0 ? midSum / midCount / 255 : 0;
    out.high = highCount > 0 ? highSum / highCount / 255 : 0;
    return true;
  },
}));
