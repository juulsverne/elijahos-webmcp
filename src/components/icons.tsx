import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconSvg({ children, className = "ui-icon", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MusicNoteIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path
        d="M9 18.5A2.5 2.5 0 1 1 7.7 16.3V6.8l9-1.8v9.3a2.5 2.5 0 1 1-1.5-2.3V8.2l-6 1.2v9.1Z"
        fill="currentColor"
      />
    </IconSvg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M7 2v11h3v9l7-12h-4l4-8z" fill="currentColor" />
    </IconSvg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M8 5.8v12.4L18.2 12 8 5.8Z" fill="currentColor" />
    </IconSvg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" fill="currentColor" />
    </IconSvg>
  );
}

export function SkipBackIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M6 5h2v14H6V5Zm3 7 9-6v12l-9-6Z" fill="currentColor" />
    </IconSvg>
  );
}

export function SkipForwardIcon(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M16 5h2v14h-2V5ZM6 6l9 6-9 6V6Z" fill="currentColor" />
    </IconSvg>
  );
}

export type WeatherIconKind =
  | "sun"
  | "moon"
  | "cloud"
  | "fog"
  | "rain"
  | "snow"
  | "storm"
  | "unknown";

export function codeToWeatherIconKind(
  code?: number,
  isDay = true,
): WeatherIconKind {
  if (code == null) return "unknown";
  if (code === 0) return isDay ? "sun" : "moon";
  if (code <= 3) return isDay ? "sun" : "cloud";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 86) return "rain";
  if (code >= 95) return "storm";
  return "unknown";
}

export function WeatherIcon({
  kind,
  ...props
}: IconProps & { kind: WeatherIconKind }) {
  if (kind === "sun") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <path
          d="M16 2v5M16 25v5M2 16h5M25 16h5M6.1 6.1l3.5 3.5M22.4 22.4l3.5 3.5M25.9 6.1l-3.5 3.5M9.6 22.4l-3.5 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </IconSvg>
    );
  }

  if (kind === "moon") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <path
          d="M22.6 24.5A11.2 11.2 0 0 1 16.5 3a10.6 10.6 0 1 0 6.1 21.5Z"
          fill="currentColor"
        />
      </IconSvg>
    );
  }

  if (kind === "fog") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <path
          d="M8 13.5h13.5a4 4 0 0 0-.7-7.9A6.2 6.2 0 0 0 9 8.4 3.2 3.2 0 0 0 8 13.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M6 19h20M8 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </IconSvg>
    );
  }

  if (kind === "rain") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <path
          d="M8 14.5h13.5a4 4 0 0 0-.7-7.9A6.2 6.2 0 0 0 9 9.4 3.2 3.2 0 0 0 8 14.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M11 20l-2 4M17 20l-2 4M23 20l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </IconSvg>
    );
  }

  if (kind === "snow") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <path
          d="M16 6v20M7.3 11l17.4 10M24.7 11 7.3 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </IconSvg>
    );
  }

  if (kind === "storm") {
    return (
      <IconSvg viewBox="0 0 32 32" {...props}>
        <path
          d="M8 14.5h13.5a4 4 0 0 0-.7-7.9A6.2 6.2 0 0 0 9 9.4 3.2 3.2 0 0 0 8 14.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M17 17 12 26h5l-2 5 6-10h-5l1-4Z" fill="currentColor" />
      </IconSvg>
    );
  }

  return (
    <IconSvg viewBox="0 0 32 32" {...props}>
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    </IconSvg>
  );
}
