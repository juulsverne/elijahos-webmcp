import { EVIDENCE_DISCLOSURE, searchEvidence } from "@/lib/evidence";
import { ELIJAH } from "@/lib/elijah";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import type { AskContext, AskSource } from "./types";

const PROFILE_QUERY =
  /\b(who is elijah|about elijah|elijah'?s background|profile|what does elijah do|introduce elijah)\b/i;
const CONTACT_QUERY = /\b(contact|email|linkedin|github|reach|message|hire)\b/i;
const GREETING_QUERY =
  /^\s*(?:hi|hello|hey|yo|good (?:morning|afternoon|evening))[!?.\s]*$/i;
const PRIVATE_INSTRUCTION_QUERY =
  /\b(?:reveal|show|print|dump|repeat|ignore|override)\b[\s\S]*\b(?:system prompt|developer message|hidden prompt|private instructions?|internal instructions?)\b/i;

function profileSource(): AskSource {
  return {
    id: "profile:summary",
    kind: "profile",
    title: "Profile summary",
    claim: ELIJAH.profileDescription,
    canonicalPath: PUBLIC_ROUTES.about,
    sourceLabel: "src/lib/elijah.ts — profile",
    contributionScope:
      "Candidate-authored summary of Elijah's current role and public positioning.",
    provenance: {
      type: "candidate-authored",
      label: "Published profile on /about",
      updated: ELIJAH.updated.about,
    },
    limitations: [
      "Candidate-authored; not independently verified.",
      "This is a concise public profile, not a complete employment record.",
    ],
    matchedTerms: [],
  };
}

function contactSource(): AskSource {
  const email = `${ELIJAH.contact.emailUser}@${ELIJAH.contact.emailDomain}`;
  return {
    id: "contact:public",
    kind: "contact",
    title: "Public contact details",
    claim: `Email: ${email}. GitHub: ${ELIJAH.contact.github}. LinkedIn: ${ELIJAH.contact.linkedin}.`,
    canonicalPath: "/?app=contact",
    sourceLabel: "src/lib/elijah.ts — contact",
    contributionScope: "Public contact paths published by the candidate.",
    provenance: {
      type: "candidate-authored",
      label: "Published contact details",
      updated: ELIJAH.updated.about,
    },
    limitations: ["Contact details are candidate-published and not a hiring commitment."],
    matchedTerms: [],
  };
}

export function buildAskContext(query: string): AskContext {
  const result = searchEvidence(query, 4);
  const sources: AskSource[] = [profileSource()];

  if (CONTACT_QUERY.test(query)) sources.push(contactSource());

  for (const match of result.matches) {
    if (sources.length >= 5) break;
    sources.push({
      id: match.record.id,
      kind: match.record.kind,
      title: match.record.title,
      claim: match.record.claim,
      canonicalPath: match.record.source.canonicalPath,
      sourceLabel: match.record.source.label,
      contributionScope: match.record.contributionScope,
      provenance: match.record.provenance,
      limitations: [...match.record.limitations],
      matchedTerms: [...match.matchedTerms],
    });
  }

  return {
    sources,
    matchedTerms: [...result.matchedTerms],
    unmatchedTerms: [...result.unmatchedTerms],
    hasDocumentedMatch:
      result.matches.length > 0 ||
      PROFILE_QUERY.test(query) ||
      CONTACT_QUERY.test(query),
  };
}

export function deterministicAskAnswer(
  query: string,
  context: AskContext,
): string | null {
  if (PRIVATE_INSTRUCTION_QUERY.test(query)) {
    return "I can't reveal private instructions. I can show you the public evidence and limitations behind answers about Elijah instead.";
  }

  if (GREETING_QUERY.test(query)) {
    return "Hi. I'm Ask Elijah, the site-owned guide to Elijah's public work. Ask about his projects, experience, current focus, or how to contact him.";
  }

  if (!context.hasDocumentedMatch) {
    return `That topic is not documented in ElijahOS's public evidence. That is a coverage gap, not a judgment about Elijah. The Contact app is the best place to ask him directly. ${EVIDENCE_DISCLOSURE[2]}`;
  }

  return null;
}
