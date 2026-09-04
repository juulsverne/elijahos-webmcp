export type AskRole = "user" | "assistant";

export type AskChatMessage = {
  role: AskRole;
  content: string;
};

export type AskSource = {
  id: string;
  kind: string;
  title: string;
  claim: string;
  canonicalPath: string;
  sourceLabel: string;
  contributionScope: string;
  provenance: {
    type: "candidate-authored";
    label: string;
    updated: string;
  };
  limitations: string[];
  matchedTerms: string[];
};

export type AskContext = {
  sources: AskSource[];
  matchedTerms: string[];
  unmatchedTerms: string[];
  hasDocumentedMatch: boolean;
};

export type AskStreamEvent =
  | {
      type: "sources";
      sources: AskSource[];
      unmatchedTerms: string[];
    }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

