import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CASE_STUDIES } from "@/lib/case-studies";

const source = readFileSync(
  join(process.cwd(), "src/app/projects/[id]/page.tsx"),
  "utf8",
);

describe("/projects/[id] static generation", () => {
  it("derives params from CASE_STUDIES, not ELIJAH.projects", () => {
    assert.match(source, /generateStaticParams/);
    assert.match(source, /CASE_STUDIES/);
    assert.doesNotMatch(source, /ELIJAH\.projects\.map/);
  });

  it("disables dynamicParams so unlisted ids 404", () => {
    // Next 16 defaults dynamicParams to true; without this, an unknown id is
    // generated on request instead of returning 404.
    assert.match(source, /export const dynamicParams = false/);
  });

  it("calls notFound() defensively after lookup", () => {
    assert.match(source, /notFound\(\)/);
  });

  it("awaits async params in both the page and generateMetadata", () => {
    assert.match(source, /params: Promise<\{ id: string \}>/);
    assert.match(source, /await params/);
    assert.match(source, /export async function generateMetadata/);
  });
});

describe("/projects/[id] output", () => {
  it("sets per-route canonical, OpenGraph, and Twitter data", () => {
    assert.match(source, /alternates:\s*\{\s*canonical:/);
    assert.match(source, /openGraph:\s*\{/);
    assert.match(source, /twitter:\s*\{/);
  });

  it("emits CreativeWork credited to the shared Person id", () => {
    assert.match(source, /"@type": "CreativeWork"/);
    assert.match(source, /author:\s*\{\s*"@id": PERSON_ID\s*\}/);
    assert.match(source, /creator:\s*\{\s*"@id": PERSON_ID\s*\}/);
    assert.match(source, /dateModified: ELIJAH\.updated\.projects/);
  });

  it("visibly renders the matching author and modification date", () => {
    assert.match(source, /UI_COPY\.docs\.byline\(ELIJAH\.name\)/);
    assert.match(source, /<time dateTime=\{ELIJAH\.updated\.projects\}>/);
  });

  it("links the page node back to the WebSite node, disambiguating it from the WebSite's own name", () => {
    assert.match(source, /isPartOf:\s*\{\s*"@id": WEBSITE_ID\s*\}/);
  });

  it("emits BreadcrumbList and renders visible crumbs", () => {
    assert.match(source, /"@type": "BreadcrumbList"/);
    assert.match(source, /crumbs=\{/);
  });
});

describe("CASE_STUDIES coverage", () => {
  it("has at least one entry so the route generates something", () => {
    assert.ok(Object.keys(CASE_STUDIES).length > 0);
  });
});

describe("/projects/[id] architecture section", () => {
  it("renders the architecture section between the sections block and the decisions section", () => {
    const sectionsIndex = source.indexOf("study.sections.map");
    const architectureHeadingIndex = source.indexOf(
      "UI_COPY.docs.sections.architecture",
    );
    const decisionsHeadingIndex = source.indexOf(
      "UI_COPY.docs.sections.decisions",
    );
    assert.notStrictEqual(sectionsIndex, -1, "sections block not found");
    assert.notStrictEqual(
      architectureHeadingIndex,
      -1,
      "architecture heading not found",
    );
    assert.notStrictEqual(
      decisionsHeadingIndex,
      -1,
      "decisions heading not found",
    );
    assert.ok(
      sectionsIndex < architectureHeadingIndex,
      "architecture section must be rendered after the generic sections block",
    );
    assert.ok(
      architectureHeadingIndex < decisionsHeadingIndex,
      "architecture section must be rendered before the decisions section",
    );
  });

  it("renders architecture intro/outro prose and each layer as a sub-heading with its nodes as a list", () => {
    // Intro paragraphs come from architecture.intro, not the sections array.
    assert.match(
      source,
      /study\.architecture\.intro\.map\(\(paragraph,\s*index\)\s*=>\s*\(\s*<p[^>]*>\{paragraph\}<\/p>/,
    );
    // Each layer renders as its own sub-heading (h3), not folded into the h2.
    assert.match(
      source,
      /study\.architecture\.layers\.map\(\(layer\)\s*=>\s*\(\s*<Fragment[^>]*>\s*<h3>\{layer\.heading\}<\/h3>/,
    );
    // Nodes render as a real list under the layer, keyed off node.id.
    assert.match(
      source,
      /<ul>\s*\{layer\.nodes\.map\(\(node\)\s*=>\s*\(\s*<li key=\{node\.id\}>\s*<strong>\{node\.label\}<\/strong>/,
    );
    // The node status pill's text equivalent is sourced from UI_COPY, not a
    // hardcoded "Status" literal in the .tsx (see AGENTS.md "No hardcoded UI").
    assert.match(
      source,
      /\$\{UI_COPY\.docs\.sections\.status\}: \$\{node\.status\}/,
    );
    // Outro prose is optional (only some case studies have it) but still wired.
    assert.match(
      source,
      /study\.architecture\.outro\?\.map\(\(paragraph,\s*index\)\s*=>\s*\(\s*<p[^>]*>\{paragraph\}<\/p>/,
    );
  });

  it("stays a server component and does not pull in the presentational ArchitectureDiagram", () => {
    // ArchitectureDiagram is a client component ("use client") that renders a
    // visual diagram; this route needs crawlable prose, and importing it would
    // force the route to become a client component.
    assert.doesNotMatch(source, /ArchitectureDiagram/);
    assert.doesNotMatch(source, /^"use client"/m);
  });

  it("elijahos case study has non-empty architecture content for the section to actually render", () => {
    const study = CASE_STUDIES.elijahos;
    assert.ok(study.architecture.intro.length > 0);
    assert.ok(study.architecture.layers.length > 0);
    for (const layer of study.architecture.layers) {
      assert.ok(
        layer.nodes.length > 0,
        `layer "${layer.id}" has no nodes to list`,
      );
    }
  });
});
