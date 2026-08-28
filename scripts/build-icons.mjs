// Generates the PWA / apple-touch / favicon PNGs from the ElijahOS brand mark.
//
// Boot-orb mark: a conic accent ring, dark inner disk, and centered OS glyph.
// Output lands in public/ and is referenced by src/app/manifest.ts and the
// icons metadata in src/app/layout.tsx.
//
// Re-run after a brand/glyph change: `npm run build:icons`.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "..", "public");
mkdirSync(publicDir, { recursive: true });

// Brand constants mirror src/lib/theme.ts. Kept literal here so this build
// script stays free of app/runtime imports (it runs under plain node).
const PINK = "#ff6dc9";
const BLUE = "#7bdcff";
const GOLD = "#ffd166";
const INK = "#050308";
const FG = "#f8f2ff";
const GLYPH = "e";

function svg(size) {
  // Glyph occupies the inner ~56% so Android's maskable mask (which can trim
  // ~10% off every edge when rendering a circle/squircle) never clips it.
  const ringInset = Math.round(size * 0.08);
  const innerInset = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="inner" cx="36%" cy="28%" r="78%">
      <stop offset="0" stop-color="#2a1730"/>
      <stop offset="1" stop-color="${INK}"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${INK}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - ringInset}" fill="${PINK}"/>
  <path d="M ${size / 2} ${ringInset}
    A ${size / 2 - ringInset} ${size / 2 - ringInset} 0 0 1 ${size - ringInset} ${size / 2}
    A ${size / 2 - ringInset} ${size / 2 - ringInset} 0 0 1 ${size / 2} ${size - ringInset}
    A ${size / 2 - ringInset} ${size / 2 - ringInset} 0 0 1 ${ringInset} ${size / 2}
    A ${size / 2 - ringInset} ${size / 2 - ringInset} 0 0 1 ${size / 2} ${ringInset}"
    fill="none" stroke="${BLUE}" stroke-width="${Math.max(2, Math.round(size * 0.08))}" stroke-linecap="round" opacity="0.82"/>
  <path d="M ${size - ringInset} ${size / 2}
    A ${size / 2 - ringInset} ${size / 2 - ringInset} 0 0 1 ${size / 2} ${size - ringInset}"
    fill="none" stroke="${GOLD}" stroke-width="${Math.max(2, Math.round(size * 0.08))}" stroke-linecap="round" opacity="0.9"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - innerInset}" fill="url(#inner)" stroke="rgba(255,255,255,0.28)" stroke-width="${Math.max(1, Math.round(size * 0.012))}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="500" font-size="${fontSize}"
    fill="${FG}">${GLYPH}</text>
</svg>`;
}

async function pngBuf(size) {
  return sharp(Buffer.from(svg(size))).png().toBuffer();
}

async function emit(size, name) {
  const buf = await pngBuf(size);
  writeFileSync(resolve(publicDir, name), buf);
  console.log(`  ${name.padEnd(16)} ${size}x${size}  ${buf.length} bytes`);
}

// Assemble a multi-resolution .ico that embeds PNG-compressed images (the
// Vista+ ICO variant every current browser supports). sharp has no .ico
// encoder, so we build the container by hand: 6-byte ICONDIR header, then one
// 16-byte ICONDIRENTRY per image, then the PNG payloads.
function icoFromPngs(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  const dir = Buffer.alloc(images.length * 16);
  let offset = 6 + images.length * 16;
  images.forEach(({ size, buf }, i) => {
    const e = dir.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 == 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8); // payload size
    e.writeUInt32LE(offset, 12); // payload offset
    offset += buf.length;
  });

  return Buffer.concat([header, dir, ...images.map((im) => im.buf)]);
}

console.log("Building ElijahOS icons -> public/");
await emit(192, "icon-192.png");
await emit(512, "icon-512.png");
await emit(180, "apple-icon.png");

// Branded browser-tab favicon (replaces the stock create-next-app default).
const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, buf: await pngBuf(size) })),
);
const icoPath = resolve(here, "..", "src", "app", "favicon.ico");
writeFileSync(icoPath, icoFromPngs(icoImages));
console.log(`  favicon.ico      16/32/48  -> src/app/`);
console.log("Done.");
