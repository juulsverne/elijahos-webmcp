import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/page.tsx"),
  "utf8",
);
describe("home page wallpaper", () => {
  it("keeps the wallpaper clear of the professional profile overlay", () => {
    assert.doesNotMatch(pageSource, /^["']use client["'];/m);
    assert.match(pageSource, /ElijahOS \/>/);
    assert.doesNotMatch(pageSource, /ProfessionalSnapshot|professional-snapshot/);
  });
});

const navSource = readFileSync(
  join(process.cwd(), "src/components/doc/DocNav.tsx"),
  "utf8",
);
const navCss = readFileSync(
  join(process.cwd(), "src/components/doc/doc-nav.module.css"),
  "utf8",
);

describe("homepage document nav", () => {
  it("mounts DocNav from page.tsx as a server component, alongside the OS shell", () => {
    assert.match(
      pageSource,
      /import \{ DocNav \} from "@\/components\/doc\/DocNav";/,
    );
    assert.match(pageSource, /<ElijahOS \/>/);
    assert.match(pageSource, /<DocNav\s*\/>/);
    assert.doesNotMatch(pageSource, /"use client"/);
  });

  it("uses a native, keyboard-operable details/summary disclosure", () => {
    assert.match(navSource, /<details className=\{s\.nav\}>/);
    assert.match(navSource, /<summary className=\{s\.summary\}/);
    assert.doesNotMatch(navSource, /"use client"/);
  });

  it("wraps a labeled nav with real anchors to every document route, in document order", () => {
    const navBlock = navSource.match(/<nav[\s\S]*?<\/nav>/)?.[0];
    assert.ok(navBlock, "expected a <nav> block inside DocNav");
    assert.match(navBlock, /aria-label=\{UI_COPY\.docs\.navAriaLabel\}/);

    // \r?\n throughout: the working tree is CRLF on Windows checkouts, and a
    // bare \n lookahead silently fails there while still passing in CI.
    const linkBlock = navSource.match(
      /function DocumentLinks\(\)[\s\S]*?(?=\r?\n}\r?\n\r?\nexport function DocNav)/,
    )?.[0];
    assert.ok(linkBlock, "expected the shared DocumentLinks component");

    // Order matters for a crawler reading anchor text top-to-bottom: about,
    // then projects, then resume. A regex that only checks each token exists
    // anywhere in the file would pass even if the links were shuffled,
    // duplicated, or moved outside the <nav>.
    const hrefOrder = [
      ...linkBlock.matchAll(/<Link href=\{PUBLIC_ROUTES\.(\w+)\}>/g),
    ].map((m) => m[1]);
    assert.deepEqual(hrefOrder, ["about", "projects", "resume"]);
  });

  it("labels each anchor with name-bearing text from UI_COPY, not a generic label", () => {
    assert.match(
      navSource,
      /<Link href=\{PUBLIC_ROUTES\.about\}>\s*\{UI_COPY\.docs\.aboutLink\(ELIJAH\.name\)\}\s*<\/Link>/,
    );
    assert.match(
      navSource,
      /<Link href=\{PUBLIC_ROUTES\.projects\}>\s*\{UI_COPY\.docs\.projectsLink\(ELIJAH\.name\)\}\s*<\/Link>/,
    );
    assert.match(
      navSource,
      /<Link href=\{PUBLIC_ROUTES\.resume\}>\s*\{UI_COPY\.docs\.resumeLink\(ELIJAH\.name\)\}\s*<\/Link>/,
    );
  });

  it("pins the disclosure inside the viewport above the dock, using only design tokens", () => {
    const navRule = navCss.match(/\.nav\s*\{([^}]*)\}/)?.[1];
    assert.ok(navRule, "expected a .nav rule in doc-nav.module.css");
    assert.match(navRule, /position:\s*fixed;/);
    assert.match(navRule, /z-index:\s*var\(--z-doc-nav\);/);
    assert.doesNotMatch(navCss, /#[0-9a-fA-F]{3,8}|rgba\(/);
  });

  it("provides an above-boot document nav when scripting is disabled", () => {
    assert.match(navSource, /<noscript>/);
    const noScriptRule = navCss.match(/\.noScriptNav\s*\{([^}]*)\}/)?.[1];
    assert.ok(noScriptRule, "expected a .noScriptNav rule");
    assert.match(noScriptRule, /z-index:\s*var\(--z-doc-nav-noscript\);/);
  });

  it("heads the no-script panel with the full name, not the chip's terse label", () => {
    // The panel stands alone with no topbar around it, so "docs" would be a
    // heading about nothing.
    assert.match(
      navSource,
      /<strong>\{UI_COPY\.docs\.navTitle\(ELIJAH\.name\)\}<\/strong>/,
    );
  });

  it("seats the chip in the topbar band from the shared geometry tokens", () => {
    const navRule = navCss.match(/\.nav\s*\{([^}]*)\}/)?.[1];
    assert.ok(navRule);
    // Derived from the bar's own geometry rather than a copied pixel value, so
    // moving or resizing the topbar carries the chip with it.
    assert.match(navRule, /--topbar-offset/);
    assert.match(navRule, /--topbar-h/);
    assert.match(navRule, /--topbar-pad-x/);
  });

  it("scopes the dropdown chrome to the disclosure, leaving the no-script list in flow", () => {
    // Both render the same <DocumentLinks />. If the absolute positioning sat
    // on the bare .list rule it would yank the no-script panel's links out of
    // flow and collapse the panel to its heading.
    const bareList = navCss.match(/\n\.list\s*\{([^}]*)\}/)?.[1];
    assert.ok(bareList, "expected a bare .list rule");
    assert.doesNotMatch(bareList, /position:\s*absolute/);
    const dropdown = navCss.match(/\.nav \.list\s*\{([^}]*)\}/)?.[1];
    assert.ok(dropdown, "expected a .nav .list rule carrying the dropdown chrome");
    assert.match(dropdown, /position:\s*absolute;/);
  });

  it("reserves room in the topbar so the bar's own content can't sit under the chip", () => {
    // The chip is a fixed overlay — it has to be, because .topbar is
    // dynamic(ssr:false) and its subtree never reaches the initial HTML. The
    // bar therefore gives up --docnav-slot from its right padding instead of
    // laying the chip out in its flex row.
    const topbarCss = readFileSync(
      join(process.cwd(), "src/app/styles/topbar.css"),
      "utf8",
    );
    const topbarRule = topbarCss.match(/\.topbar\s*\{([^}]*)\}/)?.[1];
    assert.ok(topbarRule, "expected a .topbar rule in topbar.css");
    assert.match(topbarRule, /padding:[^;]*var\(--docnav-slot\)/);
  });
});
