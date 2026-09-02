"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/icons";
import { useAudioAnalyserStore } from "@/lib/audio-analyser";
import { ELIJAH, type Track } from "@/lib/elijah";
import { emit } from "@/lib/system-events";
import { UI_COPY } from "@/lib/ui-copy";
import { WIDGETS } from "@/lib/widgets";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Track data stores the bare name plus an `unreleased` flag; this widget has
// always shown the status inline, so it re-appends the suffix here. (The
// mobile player renders the same flag as a separate kicker line instead.)
function displayTitle(track?: Track): string | undefined {
  if (!track) return undefined;
  return track.unreleased
    ? UI_COPY.widgets.music.titleSuffix(track.title)
    : track.title;
}

export function MusicWidget({ active = true }: { active?: boolean }) {
  void active;
  const tracks = ELIJAH.music.tracks;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = tracks[index];

  // Wire audio element events.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onDur = () => setDuration(a.duration);
    const onEnd = () => {
      // Auto-advance to next track, looping at the end.
      setIndex((i) => (i + 1) % tracks.length);
    };
    const onError = () => {
      // Bad / missing file → emit and skip.
      emit("WARN", `music: failed to load ${displayTitle(current) ?? "track"}`);
      setPlaying(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onError);
    };
  }, [tracks.length, current]);

  // When the track or play-state changes, sync the audio element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => {
        emit("WARN", "music: playback blocked");
        setPlaying(false);
      });
    } else {
      a.pause();
    }
  }, [playing, index]);

  // Lazy-attach the Web Audio analyser inside a user gesture. Idempotent —
  // safe to call from every play/next/prev click. iOS Safari needs the
  // AudioContext to be created or resumed synchronously inside the click.
  function ensureAnalyserAttached() {
    const a = audioRef.current;
    if (!a) return;
    const store = useAudioAnalyserStore.getState();
    store.attach(a);
    store.resume();
  }

  function togglePlay() {
    ensureAnalyserAttached();
    setPlaying((p) => !p);
  }
  function next() {
    ensureAnalyserAttached();
    setIndex((i) => (i + 1) % tracks.length);
    setPlaying(true);
  }
  function prev() {
    ensureAnalyserAttached();
    setIndex((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  }
  function seekTo(nextTime: number) {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = Math.max(0, Math.min(duration, nextTime));
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * duration);
  }

  function seekWithKeyboard(e: KeyboardEvent<HTMLDivElement>) {
    if (!duration) return;

    if (e.key === "Home") {
      e.preventDefault();
      seekTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekTo(duration);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo(time - 5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo(time + 5);
    }
  }

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div
      className="widget-card music-widget"
      data-playing={playing ? "" : undefined}
    >
      <div className="widget-card-head">
        <span className="widget-head-label">
          <MusicNoteIcon className="widget-head-icon" />
          <span>
            {playing ? WIDGETS.music.title : UI_COPY.widgets.musicPaused}
          </span>
        </span>
        <span className="live-dot">{ELIJAH.music.artist}</span>
      </div>

      <div
        className="music-title"
        key={index}
        title={displayTitle(current) ?? ""}
      >
        {displayTitle(current) ?? "—"}
      </div>
      <div className="music-artist-row">
        {/* Decorative equalizer — mirrors the mobile player's rule: bars only
            dance while audio is actually playing. */}
        <span className="music-eq" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        <span className="music-artist">{ELIJAH.music.artist}</span>
      </div>

      <div
        className="music-progress"
        onClick={seek}
        onKeyDown={seekWithKeyboard}
        role="slider"
        aria-label={UI_COPY.widgets.playback.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        tabIndex={0}
      >
        <div className="music-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="music-times">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="music-controls">
        <button
          className="music-btn"
          onClick={prev}
          aria-label={UI_COPY.widgets.playback.previousTrack}
        >
          <SkipBackIcon className="music-btn-icon" />
        </button>
        <button
          className="music-btn is-play"
          onClick={togglePlay}
          aria-label={
            playing
              ? UI_COPY.widgets.playback.pause
              : UI_COPY.widgets.playback.play
          }
        >
          {playing ? (
            <PauseIcon className="music-btn-icon" />
          ) : (
            <PlayIcon className="music-btn-icon" />
          )}
        </button>
        <button
          className="music-btn"
          onClick={next}
          aria-label={UI_COPY.widgets.playback.nextTrack}
        >
          <SkipForwardIcon className="music-btn-icon" />
        </button>
      </div>

      <a className="music-spotify" href={ELIJAH.music.spotifyArtistUrl} target="_blank" rel="noopener noreferrer">
        {UI_COPY.widgets.playback.listenOnSpotify}
      </a>

      <audio ref={audioRef} src={current?.file} preload="metadata" />
    </div>
  );
}
