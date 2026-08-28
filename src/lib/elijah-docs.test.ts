import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { PUBLIC_ROUTES, projectRoute } from "@/lib/public-routes";

describe("ELIJAH document fields", () => {
  it("leads the canonical profile with Elijah's current AI identity", () => {
    assert.match(
      ELIJAH.profileDescription,
      /^Elijah Leung is a Chicago-based AI Transformation Engineer/,
    );
    assert.match(ELIJAH.profileDescription, /prior experience includes FP&A/);
  });

  it("carries a location for the PostalAddress schema node", () => {
    assert.equal(typeof ELIJAH.location.locality, "string");
    assert.ok(ELIJAH.location.locality.length > 0);
    assert.equal(typeof ELIJAH.location.region, "string");
    assert.ok(ELIJAH.location.region.length > 0);
    assert.equal(typeof ELIJAH.location.country, "string");
    assert.ok(ELIJAH.location.country.length > 0);
  });

  it("carries hand-maintained ISO dates for sitemap lastModified", () => {
    for (const key of ["about", "projects", "resume"] as const) {
      assert.match(ELIJAH.updated[key], /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(
        !Number.isNaN(Date.parse(ELIJAH.updated[key])),
        `${key} must parse as a date`,
      );
    }
  });
});

describe("PUBLIC_ROUTES", () => {
  it("keeps crawlable URLs independent from cosmetic app titles", () => {
    assert.deepEqual(PUBLIC_ROUTES, {
      home: "/",
      about: "/about",
      projects: "/projects",
      resume: "/resume",
      llms: "/llms.txt",
    });
  });

  it("encodes case-study ids instead of interpolating unsafe path text", () => {
    assert.equal(projectRoute("case study"), "/projects/case%20study");
  });
});

describe("UI_COPY.docs", () => {
  it("builds name-bearing anchor text rather than bare labels", () => {
    assert.equal(UI_COPY.docs.aboutLink("Ada Lovelace"), "About Ada Lovelace");
    assert.equal(UI_COPY.docs.resumeLink("Ada Lovelace"), "Ada Lovelace résumé");
    assert.equal(
      UI_COPY.docs.projectsLink("Ada Lovelace"),
      "Projects by Ada Lovelace",
    );
  });

  it("builds the home link from the OS name rather than hardcoding it", () => {
    assert.equal(UI_COPY.docs.homeLink("TestOS"), "Back to TestOS");
  });

  it("supplies the document nav disclosure label", () => {
    // Terse visible label — the name-bearing text lives on the anchors inside
    // and on the hover title, not on the summary.
    assert.equal(UI_COPY.docs.navSummary, "docs");
    assert.equal(UI_COPY.docs.navTitle("Ada Lovelace"), "Ada Lovelace — Documents");
    assert.ok(UI_COPY.docs.navGlyph.length > 0);
    assert.ok(UI_COPY.docs.navAriaLabel.length > 0);
  });

  it("builds an explicit identity question for answer engines and readers", () => {
    assert.equal(UI_COPY.docs.identityHeading("Ada Lovelace"), "Who is Ada Lovelace?");
  });

  it("builds named recruiter-answer and evidence labels", () => {
    assert.equal(
      UI_COPY.docs.answersHeading("Ada Lovelace"),
      "Questions recruiters ask about Ada Lovelace",
    );
    assert.equal(
      UI_COPY.docs.answersAriaLabel("Ada Lovelace"),
      "Questions about Ada Lovelace",
    );
    assert.equal(UI_COPY.docs.contactLink("Ada Lovelace"), "Contact Ada Lovelace");
    assert.equal(
      UI_COPY.docs.projectEvidenceLink("Analytical Engine", "Ada Lovelace"),
      "Analytical Engine by Ada Lovelace — case study",
    );
  });

  it("builds a named authorship label for proof-rich documents", () => {
    assert.equal(UI_COPY.docs.byline("Ada Lovelace"), "By Ada Lovelace");
    assert.equal(UI_COPY.docs.updatedLabel, "Updated");
  });
});
