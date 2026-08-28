// Dynamically generated OpenGraph / Twitter card (1200×630).
//
// Next's file convention: this is auto-wired into og:image and twitter:image
// for the whole site. Generated from ELIJAH so the card never drifts from the
// portfolio copy. Palette mirrors tokens.css through shared server constants
// because ImageResponse can't read CSS custom properties.
//
// Design ("terminal boot"): a frozen frame of ElijahOS mid-boot — terminal
// log + boot progress bar on the left, Instrument Serif italic wordmark,
// tagline and meta row on the right — implying a live, interactive product.
// The bar fill reuses the boot screen's pink → blue → gold progress gradient
// (.boot-progress-fill).

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ELIJAH } from "@/lib/elijah";
import { THEME_COLORS } from "@/lib/theme";

export const alt = `${ELIJAH.osName} — ${ELIJAH.name}, ${ELIJAH.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
const SITE_HOST = new URL(ELIJAH.siteUrl).hostname;

// Alpha-suffixed variants of the theme tokens (satori takes 8-digit hex).
// The card's dimmed text/track shades are fg1 at fractional opacity, not
// separate design tokens — so they're derived here instead of hardcoded.
const FG_55 = `${THEME_COLORS.fg1}8c`; // dim log/meta text
const FG_30 = `${THEME_COLORS.fg1}4d`; // meta-row separator dot
const FG_10 = `${THEME_COLORS.fg1}1a`; // progress-bar track
const PINK_GLOW = `${THEME_COLORS.accentPink}80`; // bar-fill glow
const VIOLET_GLOW = `${THEME_COLORS.accentViolet}59`; // wordmark halo

const RESULT_COLOR = {
  fg: THEME_COLORS.fg1,
  ok: THEME_COLORS.trafficMaximize,
} as const;

export default async function OpengraphImage() {
  // Fonts bundled under web/assets so the card renders without a runtime
  // fetch. process.cwd() is the Next project dir (web/). Instrument Serif
  // italic is the site's brand typeface (topbar/boot-screen wordmark);
  // JetBrains Mono carries the terminal log, tagline and meta row.
  // (Satori needs static instances — variable fonts crash it.)
  const assets = join(process.cwd(), "assets");
  const [instrumentSerifItalic, jetbrainsMono] = await Promise.all([
    readFile(join(assets, "InstrumentSerif-Italic.ttf")),
    readFile(join(assets, "JetBrainsMono-Regular.ttf")),
  ]);

  const { bootLog, tagline, bootCaption, bootProgress } = ELIJAH.ogCard;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: `radial-gradient(120% 140% at 50% 118%, ${THEME_COLORS.bgWarm} 0%, ${THEME_COLORS.bgMid} 52%, ${THEME_COLORS.bgDeep} 100%)`,
          fontFamily: "JetBrains Mono",
        }}
      >
        {/* Left column — boot log + progress bar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingLeft: "84px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "18px",
              lineHeight: 2.15,
              color: FG_55,
            }}
          >
            {bootLog.map((line) => (
              <div
                key={line.prompt}
                style={{ display: "flex", alignItems: "center", gap: "11px" }}
              >
                <div style={{ display: "flex" }}>{line.prompt}</div>
                {line.tone === "cursor" ? (
                  // Block cursor drawn as a rect instead of the ▮ glyph so it
                  // renders identically regardless of font glyph coverage.
                  <div
                    style={{
                      width: "11px",
                      height: "20px",
                      background: THEME_COLORS.accentGold,
                    }}
                  />
                ) : (
                  <div style={{ display: "flex", color: RESULT_COLOR[line.tone] }}>
                    {line.result}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Boot progress bar — pink → blue → gold, frozen mid-fill */}
          <div
            style={{
              marginTop: "36px",
              width: "440px",
              height: "9px",
              borderRadius: "999px",
              background: FG_10,
              overflow: "hidden",
              position: "relative",
              display: "flex",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${bootProgress}%`,
                borderRadius: "999px",
                background: `linear-gradient(90deg, ${THEME_COLORS.accentPink} 0%, ${THEME_COLORS.accentBlue} 55%, ${THEME_COLORS.accentGold} 100%)`,
                boxShadow: `0 0 24px ${PINK_GLOW}`,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "13px",
              fontSize: "15px",
              color: THEME_COLORS.fg3,
            }}
          >
            {`${bootCaption} · ${bootProgress}%`}
          </div>
        </div>

        {/* Right column — wordmark + tagline + meta row */}
        <div
          style={{
            flex: 1.2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: "84px",
            position: "relative",
          }}
        >
          {/* Violet halo behind the wordmark. Satori has no text-shadow, so
              the glow is a radial-gradient blob painted before (under) the
              text in document order. */}
          <div
            style={{
              position: "absolute",
              top: "-140px",
              left: "-60px",
              width: "600px",
              height: "400px",
              background: `radial-gradient(circle, ${VIOLET_GLOW} 0%, transparent 65%)`,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: "118px",
              lineHeight: 1,
              letterSpacing: "-2px",
              color: THEME_COLORS.fg1,
            }}
          >
            {ELIJAH.osName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "20px",
              fontSize: "19px",
              letterSpacing: "2px",
              color: THEME_COLORS.accentGold,
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "30px",
              fontSize: "17px",
            }}
          >
            <div style={{ display: "flex", color: THEME_COLORS.accentBlue }}>
              {ELIJAH.role}
            </div>
            <div style={{ display: "flex", color: FG_30 }}>·</div>
            <div style={{ display: "flex", color: FG_55 }}>{SITE_HOST}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: instrumentSerifItalic, style: "italic", weight: 400 },
        { name: "JetBrains Mono", data: jetbrainsMono, style: "normal", weight: 400 },
      ],
    },
  );
}
