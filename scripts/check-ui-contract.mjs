import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const checks = [
  {
    file: "src/app/not-found.tsx",
    pattern: /style=\{\{/,
    message: "not-found must use named CSS classes, not inline styles.",
  },
  {
    file: "src/app/global-error.tsx",
    pattern: /style=\{\{/,
    message: "global-error must use named CSS classes, not inline styles.",
  },
  {
    file: "src/app/layout.tsx",
    pattern: /#[0-9a-fA-F]{3,8}/,
    message: "layout metadata colors must come from shared theme constants.",
  },
  {
    file: "src/app/manifest.ts",
    pattern: /#[0-9a-fA-F]{3,8}/,
    message: "manifest colors must come from shared theme constants.",
  },
  {
    file: "src/components/widgets/WeatherWidget.tsx",
    pattern: /[☀☾☁⛅☂❄⚡]/,
    message: "weather widget must use CSS-tinted SVG icons, not emoji glyphs.",
  },
  {
    file: "src/components/widgets/SystemPulseWidget.tsx",
    pattern: /[⚡▶]/,
    message: "system pulse widget must use CSS-tinted SVG icons, not symbol glyphs.",
  },
  {
    file: "src/components/mobile/MobileIndexCard.tsx",
    pattern: /⚡/,
    message: "mobile index card must use CSS-tinted SVG icons, not emoji glyphs.",
  },
  {
    file: "src/app/styles/error-screen.css",
    pattern: /#[0-9a-fA-F]{3,8}|rgba\(/,
    message: "error screen colors must consume design tokens, not literal colors.",
  },
  {
    file: "src/app/styles/window.css",
    pattern: /#[0-9a-fA-F]{3,8}/,
    message: "window chrome colors must consume design tokens, not literal colors.",
  },
  {
    file: "src/app/styles/boot.css",
    pattern: /#[0-9a-fA-F]{3,8}/,
    message: "boot screen colors must consume design tokens, not literal colors.",
  },
  {
    file: "src/app/styles/controls.css",
    pattern: /#[0-9a-fA-F]{3,8}/,
    message: "control colors must consume design tokens, not literal colors.",
  },
  {
    file: "src/components/apps/ProjectsApp.tsx",
    pattern: /Selected builds/,
    message: "projects app display headings must come from shared UI copy.",
  },
  {
    file: "src/components/apps/ResumeApp.tsx",
    pattern: />\s*(Experience|Capabilities|Education)\s*</,
    message: "resume section labels must come from shared UI copy.",
  },
  {
    file: "src/components/apps/CaseStudyApp.tsx",
    pattern: />\s*(Architecture|Decisions|Stack|Considered|Picked)\s*</,
    message: "case study structural labels must come from shared UI copy.",
  },
  {
    file: "src/components/apps/ContactApp.tsx",
    pattern: /"Draft an email"|"Subject"|"Message"|"Open email"|"Send"|"Copy address"|"ready"|"AI workflow, portfolio chat, or collaboration"/,
    message: "contact form labels and actions must come from shared UI copy.",
  },
  {
    file: "src/components/apps/SnakeApp.tsx",
    pattern: /Score:|High:|Swipe to steer\.|Arrow keys or WASD\.|Eat the gold dot\.|Don&apos;t bite yourself\./,
    message: "snake app visible labels and hints must come from shared UI copy.",
  },
  {
    file: "src/components/apps/ClockApp.tsx",
    pattern:
      />\s*(Running|Paused|Ready|Stop|Start|Lap|Reset|Done|Clock|Stopwatch|Timer|MIN|SEC)\s*<|aria-label="(?:Decrease|Increase) \$\{/,
    message: "clock app visible labels and actions must come from shared UI copy.",
  },
  {
    file: "src/components/apps/ClockApp.tsx",
    pattern: /eslint-disable-next-line react-hooks\/exhaustive-deps/,
    message: "clock app timer effects must use explicit stable refs instead of hook dependency suppressions.",
  },
  {
    file: "src/components/widgets/WeatherWidget.tsx",
    pattern: />weather</,
    message: "weather widget label must come from the widget registry.",
  },
  {
    file: "src/components/widgets/SystemPulseWidget.tsx",
    pattern: />\s*(live|FPS|JS HEAP|CORES|NET|your cpu|kill all|idle|log)\s*<|processes \(\$\{|title="kill all processes"|\[—\] waiting…/,
    message: "system pulse labels and actions must come from the widget/copy registry.",
  },
  {
    file: "src/components/mobile/MobileIndexCard.tsx",
    // Area names resolve through APPS; only the literals belong to UI_COPY.
    pattern: />index<|>vectors<|>core<|vectors ·/,
    message: "mobile index labels must come from the widget/copy registry.",
  },
  {
    file: "src/components/mobile/MobileWeatherCard.tsx",
    pattern: />weather<|aria-label="Toggle Celsius and Fahrenheit"|>\s*(fetching…|unavailable)\s*</,
    message: "mobile weather label must come from the widget registry.",
  },
  {
    file: "src/components/widgets/WeatherWidget.tsx",
    pattern: />\s*(fetching…|unavailable|click to toggle °C \/ °F)\s*</,
    message: "weather states and helper copy must come from shared UI copy.",
  },
  {
    file: "src/components/Window.tsx",
    pattern: /"Close"|"Minimize"|"Maximize"|"Restore"|Close \$\{|Minimize \$\{|Maximize \$\{|Restore \$\{/,
    message: "window control labels must come from shared UI copy.",
  },
  {
    file: "src/components/Topbar.tsx",
    pattern: /building \$\{|open widgets|close widgets|>widgets</,
    message: "topbar labels must come from shared UI copy.",
  },
  {
    file: "src/components/Launchpad.tsx",
    pattern: /aria-label="Launchpad"|>\/launchpad<|`Open \$\{/,
    message: "launchpad labels must come from shared UI copy.",
  },
  {
    file: "src/components/mobile/MobileAppFrame.tsx",
    pattern: /Back to home|>home</,
    message: "mobile app frame labels must come from shared UI copy.",
  },
  {
    file: "src/components/mobile/MobileDock.tsx",
    pattern: /Primary apps|Open \$\{/,
    message: "mobile dock labels must come from shared UI copy.",
  },
];

const failures = [];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertCssRuleContains(file, selector, declarations) {
  const abs = resolve(root, file);
  const source = readFileSync(abs, "utf8");
  const match = source.match(
    new RegExp(`${escapeRegExp(selector)}\\s*\\{(?<body>[^}]*)\\}`),
  );

  if (!match?.groups?.body) {
    failures.push(`${relative(root, abs)}: ${selector} rule must exist.`);
    return;
  }

  const body = match.groups.body;
  for (const declaration of declarations) {
    const [property, value] = declaration.replace(/;$/, "").split(":");
    const hasDeclaration = body
      .split(";")
      .map((part) => part.trim())
      .some((part) => {
        const separatorIndex = part.indexOf(":");
        if (separatorIndex === -1) return false;
        const actualProperty = part.slice(0, separatorIndex).trim();
        const actualValue = part.slice(separatorIndex + 1).trim();
        return actualProperty === property.trim() && actualValue === value.trim();
      });

    if (!hasDeclaration) {
      failures.push(
        `${relative(root, abs)}: ${selector} must include ${declaration}`,
      );
    }
  }
}

function walkFiles(dir, predicate, acc = []) {
  for (const entry of readdirSync(dir)) {
    const abs = resolve(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkFiles(abs, predicate, acc);
    } else if (predicate(abs)) {
      acc.push(abs);
    }
  }
  return acc;
}

for (const check of checks) {
  const abs = resolve(root, check.file);
  const source = readFileSync(abs, "utf8");
  if (check.pattern.test(source)) {
    failures.push(`${relative(root, abs)}: ${check.message}`);
  }
}

// Document routes render outside the OS shell, but `body { overflow: hidden }`
// in tokens.css is global. Without its own scrollport, the bottom of a long
// /about or /resume is unreachable by any user or crawler-rendered viewport.
assertCssRuleContains("src/components/doc/doc.module.css", ".page", [
  "height: 100dvh;",
  "overflow-y: auto;",
]);

const literalColorPattern = /#[0-9a-fA-F]{3,8}|rgba\(/;
// `src/app` already contains `src/app/styles`, and colocated CSS Modules live
// beside their components — so these two roots cover every stylesheet in the
// app. Listing `src/app/styles` separately would walk it twice and report each
// violation there as a duplicate failure. These two paths cover the exported
// challenge shell.
const styleDirs = [
  resolve(root, "src/app"),
  resolve(root, "src/components"),
];
for (const styleRoot of styleDirs) {
  for (const abs of walkFiles(styleRoot, (file) => file.endsWith(".css"))) {
    if (abs.endsWith("tokens.css")) continue;
    const source = readFileSync(abs, "utf8");
    if (literalColorPattern.test(source)) {
      failures.push(
        `${relative(root, abs)}: CSS colors must come from src/app/styles/tokens.css.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("UI contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI contract check passed.");
