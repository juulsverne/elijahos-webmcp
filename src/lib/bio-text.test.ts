import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ELIJAH } from "@/lib/elijah";
import { parseBioText, type BioToken } from "@/lib/bio-text";

describe("parseBioText", () => {
  it("returns plain text untouched when there are no delimiters", () => {
    assert.deepEqual(parseBioText("hello world"), [
      { kind: "text", value: "hello world" },
    ]);
  });

  it("parses a single **em** span with no surrounding text", () => {
    assert.deepEqual(parseBioText("**foo**"), [{ kind: "em", value: "foo" }]);
  });

  it("parses a single **em** span embedded in surrounding text", () => {
    assert.deepEqual(parseBioText("pre **foo** post"), [
      { kind: "text", value: "pre " },
      { kind: "em", value: "foo" },
      { kind: "text", value: " post" },
    ]);
  });

  it("parses a single ||tag|| span with no surrounding text", () => {
    assert.deepEqual(parseBioText("||Wobbles||"), [
      { kind: "tag", value: "Wobbles" },
    ]);
  });

  it("parses a single ||tag|| span embedded in surrounding text", () => {
    assert.deepEqual(parseBioText("my cat, ||Wobbles||."), [
      { kind: "text", value: "my cat, " },
      { kind: "tag", value: "Wobbles" },
      { kind: "text", value: "." },
    ]);
  });

  it("parses both affordances mixed in one string, in either order", () => {
    assert.deepEqual(parseBioText("a **b** c ||d|| e"), [
      { kind: "text", value: "a " },
      { kind: "em", value: "b" },
      { kind: "text", value: " c " },
      { kind: "tag", value: "d" },
      { kind: "text", value: " e" },
    ]);

    assert.deepEqual(parseBioText("||d|| then **b**"), [
      { kind: "tag", value: "d" },
      { kind: "text", value: " then " },
      { kind: "em", value: "b" },
    ]);
  });

  it("parses adjacent markers with no text token between them", () => {
    assert.deepEqual(parseBioText("**a**||b||"), [
      { kind: "em", value: "a" },
      { kind: "tag", value: "b" },
    ]);
  });

  it("treats a stray unmatched delimiter as plain text, delimiter included", () => {
    // No closing `**`, so nothing to pair with — the whole string, asterisks
    // and all, is a single text token rather than a crash or a dropped `**`.
    assert.deepEqual(parseBioText("a ** b"), [{ kind: "text", value: "a ** b" }]);
  });

  it("treats an unpaired || the same way", () => {
    assert.deepEqual(parseBioText("a || b"), [{ kind: "text", value: "a || b" }]);
  });

  it("treats an empty pair (no content between delimiters) as stray text", () => {
    // `[^*]+` / `[^|]+` require at least one interior character, so `****`
    // and `||||` never match — they pass through as literal text.
    assert.deepEqual(parseBioText("****"), [{ kind: "text", value: "****" }]);
    assert.deepEqual(parseBioText("||||"), [{ kind: "text", value: "||||" }]);
  });

  it("returns an empty array for empty input", () => {
    assert.deepEqual(parseBioText(""), []);
  });

  it("never emits a delimiter character inside an em or tag token's value", () => {
    const tokens = parseBioText(
      "**em one** plain ||tag one|| more **em two** and ||tag two|| done",
    );
    for (const token of tokens) {
      if (token.kind === "em" || token.kind === "tag") {
        assert.ok(!token.value.includes("*"), `em/tag value leaked *: ${token.value}`);
        assert.ok(!token.value.includes("|"), `em/tag value leaked |: ${token.value}`);
      }
    }
  });
});

describe("parseBioText against ELIJAH.longBio (data integrity)", () => {
  // This is the regression test for the bug where /about's own paragraph
  // renderer only understood **em** and silently printed literal `||...||`
  // for the puzzle-tag affordance. If a third affordance is ever added to
  // the copy (some new `~~foo~~` flavor, say) without teaching parseBioText
  // about it, the delimiter characters land in a "text" token's value and
  // this test fails — exactly the failure mode that shipped originally.
  const allTokens: { block: number; paragraph: number; token: BioToken }[] = [];

  for (const [blockIndex, block] of ELIJAH.longBio.entries()) {
    const paragraphs = block.body.split(/\n\n+/);
    for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
      for (const token of parseBioText(paragraph)) {
        allTokens.push({ block: blockIndex, paragraph: paragraphIndex, token });
      }
    }
  }

  it("tokenizes every longBio paragraph without error", () => {
    assert.ok(allTokens.length > 0, "expected longBio to produce tokens");
  });

  it("never leaves doubled-punctuation delimiter characters in any token's value", () => {
    // Regression net for unparsed affordances. Real longBio copy never contains
    // unmatched delimiters, so **em** and ||tag|| always get consumed by the
    // tokenizer. A future affordance built from doubled punctuation (e.g.,
    // ~~strikethrough~~, __underline__, %%highlight%%) that isn't recognized
    // by parseBioText would leave literal delimiters inside "text" tokens.
    // This regex catches any repeated character from the punctuation set:
    // * | ~ _ % ^ & # — all plausible double markers. Single-char affordances
    // like @mention@ or !important! would NOT be caught here; this checks only
    // for doubled-punctuation patterns, not all possible future delimiters.
    const doubledPunctuationPattern = /([*|~_%^&#])\1/;
    for (const { block, paragraph, token } of allTokens) {
      assert.ok(
        !doubledPunctuationPattern.test(token.value),
        `block ${block} paragraph ${paragraph} (${token.kind}) contains doubled punctuation: ${JSON.stringify(token.value)}`,
      );
    }
  });

  it("recognizes the known ||tag|| use (the cat) as a tag token, not stray text", () => {
    const tagTokens = allTokens.filter((entry) => entry.token.kind === "tag");
    assert.ok(
      tagTokens.some((entry) => entry.token.value === "Wobbles"),
      "expected ||Wobbles|| to parse as a tag token somewhere in longBio",
    );
  });

  it("catches unrecognized ~~tildes~~ as doubled-punctuation (proof the net has teeth)", () => {
    // Construct synthetic input: parseBioText doesn't recognize ~~foo~~,
    // so it emits as a text token with tildes included. The regex catches it.
    const doubledPunctuationPattern = /([*|~_%^&#])\1/;
    const syntheticTokens = parseBioText("some text ~~strikethrough~~ more text");
    let found = false;
    for (const token of syntheticTokens) {
      if (doubledPunctuationPattern.test(token.value)) {
        found = true;
        break;
      }
    }
    assert.ok(
      found,
      "expected ~~strikethrough~~ to be caught by the doubled-punctuation regex",
    );
  });
});
