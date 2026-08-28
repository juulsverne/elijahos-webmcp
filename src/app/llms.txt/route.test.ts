import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET, dynamic } from "@/app/llms.txt/route";
import { ELIJAH } from "@/lib/elijah";
import { CASE_STUDIES } from "@/lib/case-studies";
import { absoluteUrl } from "@/lib/site-url";
import {
  PUBLIC_ROUTES,
  aboutAnswerRoute,
  projectRoute,
} from "@/lib/public-routes";

describe("/llms.txt", () => {
  it("is force-static, since route handlers are uncached by default", () => {
    assert.equal(dynamic, "force-static");
  });

  it("serves plain text with an explicit charset", async () => {
    const response = await GET();
    assert.equal(
      response.headers.get("content-type"),
      "text/plain; charset=utf-8",
    );
  });

  it("follows the llms.txt H1 + summary + H2-links shape", async () => {
    const body = await (await GET()).text();
    const lines = body.split("\n");

    assert.equal(lines[0], `# ${ELIJAH.name}`);
    assert.equal(lines[1], "");
    assert.equal(
      lines[2],
      // No `ELIJAH.role` prefix: metadataDescription already opens with the
      // role, and prefixing it stuttered in the one line most likely to be
      // quoted verbatim by an assistant.
      `> ${ELIJAH.metadataDescription}`,
      "the summary blockquote must state role + metadata description verbatim",
    );

    // H2 sections appear, in this order, each followed by a blank line.
    const headings = lines.filter((line) => line.startsWith("## "));
    assert.deepEqual(headings, [
      "## Documents",
      "## Common recruiter questions",
      "## Focus areas",
      "## Projects",
      "## Elsewhere",
    ]);
  });

  it("links every recruiter question to its visible /about fragment and repeats the canonical answer", async () => {
    const body = await (await GET()).text();
    for (const answer of ELIJAH.publicAnswers) {
      assert.ok(
        body.includes(
          `- [${answer.question}](${absoluteUrl(aboutAnswerRoute(answer.id))}): ${answer.answer}`,
        ),
        `missing public answer ${answer.id}`,
      );
    }
  });

  it("states the location under the summary", async () => {
    const body = await (await GET()).text();
    assert.match(
      body,
      new RegExp(
        `Based in ${ELIJAH.location.locality}, ${ELIJAH.location.region}\\.`,
      ),
    );
  });

  it("lists every document route as an absolute URL with real link text", async () => {
    const body = await (await GET()).text();
    assert.ok(
      body.includes(`- [About ${ELIJAH.name}](${absoluteUrl(PUBLIC_ROUTES.about)})`),
      "About link missing or malformed",
    );
    assert.ok(
      body.includes(`- [Projects](${absoluteUrl(PUBLIC_ROUTES.projects)})`),
      "Projects link missing or malformed",
    );
    assert.ok(
      body.includes(`- [Résumé](${absoluteUrl(PUBLIC_ROUTES.resume)})`),
      "Résumé link missing or malformed",
    );
  });

  it("lists every pillar with its real value, not just the label", async () => {
    const body = await (await GET()).text();
    for (const pillar of ELIJAH.pillars) {
      assert.ok(
        body.includes(`- ${pillar.k}: ${pillar.v}`),
        `missing pillar line for ${pillar.k}`,
      );
    }
  });

  it("lists every project with its real year and description", async () => {
    const body = await (await GET()).text();
    for (const project of ELIJAH.projects) {
      assert.ok(
        body.includes(`- ${project.name} (${project.year}): ${project.desc}`),
        `missing project line for ${project.name}`,
      );
    }
  });

  it("appends a case-study link only to projects that actually have one", async () => {
    const body = await (await GET()).text();
    const lines = body.split("\n");

    for (const project of ELIJAH.projects) {
      const line = lines.find((l) => l.startsWith(`- ${project.name} (`));
      assert.ok(line, `no line found for project ${project.name}`);
      const caseStudy = CASE_STUDIES[project.id];
      if (caseStudy) {
        assert.ok(
          line!.endsWith(` Case study: ${absoluteUrl(projectRoute(project.id))}`),
          `expected ${project.name} to end with its case-study URL`,
        );
      } else {
        assert.ok(
          !line!.includes("Case study:"),
          `${project.name} has no case study and should not claim one`,
        );
      }
    }
    // Guard the guard: at least one project must actually carry a case study,
    // or the branch above never runs.
    assert.ok(
      ELIJAH.projects.some((p) => CASE_STUDIES[p.id]),
      "no project in ELIJAH.projects has a matching case study — the positive branch is untested",
    );
  });

  it("lists real elsewhere links, not placeholder text", async () => {
    const body = await (await GET()).text();
    assert.ok(body.includes(`- GitHub: https://${ELIJAH.contact.github}`));
    assert.ok(body.includes(`- LinkedIn: https://${ELIJAH.contact.linkedin}`));
  });
});
