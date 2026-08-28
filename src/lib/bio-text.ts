// Framework-free tokenizer for the bio-text markdown-lite dialect shared by
// the /about page and the AboutApp OS window. Two affordances, no nesting,
// no escapes:
//   **foo** → "em"  token — emphasis (accent-violet .bio-em in AboutApp)
//   ||foo|| → "tag" token — puzzle-tagged word (accent-gold .bio-puzzle in
//             AboutApp; on /about the word renders as plain text)
// Everything else is a "text" token, passed through unchanged.
//
// This is the single source of truth for the dialect's grammar. Consumers
// (AboutApp.tsx's own renderEmphasis today; /about's renderParagraph) decide
// how to render each token kind — this module only tokenizes.
//
// Unmatched / stray delimiters (a lone "**", an unpaired "||", "****" with
// nothing between the pairs, etc.) are not an error condition: the parser
// only recognizes complete, non-empty `**...**` / `||...||` pairs. A
// delimiter that never finds a matching close is left exactly where it was,
// as part of an ordinary "text" token — this function never throws. That
// means a literal "**" can't be escaped if it sits next to real emphasis,
// but that trade-off keeps hand-authored copy from ever crashing the page.
export type BioToken = { kind: "text" | "em" | "tag"; value: string };

// Alternation order doesn't matter for correctness (both branches require
// their own distinct delimiter), but em is listed first since it's the far
// more common affordance in the copy.
const TOKEN_PATTERN = /\*\*([^*]+)\*\*|\|\|([^|]+)\|\|/g;

export function parseBioText(input: string): BioToken[] {
  const tokens: BioToken[] = [];
  let lastIndex = 0;

  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: input.slice(lastIndex, match.index) });
    }
    const [, em, tag] = match;
    if (em !== undefined) {
      tokens.push({ kind: "em", value: em });
    } else if (tag !== undefined) {
      tokens.push({ kind: "tag", value: tag });
    }
    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({ kind: "text", value: input.slice(lastIndex) });
  }

  return tokens;
}
