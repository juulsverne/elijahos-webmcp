// /llms.txt — supplementary plain-text summary for LLM agents.
//
// Deliberately framed as experimental: llms.txt is a community proposal, not a
// crawler standard, and none of OpenAI, Anthropic, Google, or Perplexity
// documents consuming it. It is cheap to serve and nothing else depends on it.
//
// The dot in the segment name is fine — the vendored Next docs use
// `app/rss.xml/route.ts` as the same pattern. `force-static` is required
// because route handlers are not cached by default.

import { ELIJAH } from "@/lib/elijah";
import { CASE_STUDIES } from "@/lib/case-studies";
import { absoluteUrl } from "@/lib/site-url";
import {
  PUBLIC_ROUTES,
  aboutAnswerRoute,
  projectRoute,
} from "@/lib/public-routes";

export const dynamic = "force-static";

function body(): string {
  const lines: string[] = [
    `# ${ELIJAH.name}`,
    "",
    // `metadataDescription` already opens with the role, so prefixing
    // `ELIJAH.role` here stuttered ("AI Transformation Engineer. AI
    // Transformation Engineer designing…"). This blockquote is the line an
    // assistant is most likely to quote verbatim — it has to read cleanly.
    `> ${ELIJAH.metadataDescription}`,
    "",
    `Based in ${ELIJAH.location.locality}, ${ELIJAH.location.region}.`,
    "",
    "## Documents",
    "",
    `- [About ${ELIJAH.name}](${absoluteUrl(PUBLIC_ROUTES.about)}): background, focus areas, and how he works.`,
    `- [Projects](${absoluteUrl(PUBLIC_ROUTES.projects)}): what he has built and is building.`,
    `- [Résumé](${absoluteUrl(PUBLIC_ROUTES.resume)}): experience and education.`,
    "",
    "## Common recruiter questions",
    "",
    ...ELIJAH.publicAnswers.map(
      (answer) =>
        `- [${answer.question}](${absoluteUrl(aboutAnswerRoute(answer.id))}): ${answer.answer}`,
    ),
    "",
    "## Focus areas",
    "",
    ...ELIJAH.pillars.map((pillar) => `- ${pillar.k}: ${pillar.v}`),
    "",
    "## Projects",
    "",
    ...ELIJAH.projects.map((project) => {
      const detail = CASE_STUDIES[project.id]
        ? ` Case study: ${absoluteUrl(projectRoute(project.id))}`
        : "";
      return `- ${project.name} (${project.year}): ${project.desc}${detail}`;
    }),
    "",
    "## Elsewhere",
    "",
    `- GitHub: https://${ELIJAH.contact.github}`,
    `- LinkedIn: https://${ELIJAH.contact.linkedin}`,
    "",
  ];
  return lines.join("\n");
}

export async function GET(): Promise<Response> {
  return new Response(body(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
