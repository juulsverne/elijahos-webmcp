import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGELOG, type ChangeKind } from "./changelog";
import { APPS } from "./apps";

const VALID_KINDS: ChangeKind[] = [
  "added",
  "improved",
  "fixed",
  "deprecated",
  "removed",
];

test("entries are sorted strictly newest-first by date", () => {
  for (let i = 1; i < CHANGELOG.length; i++) {
    const above = CHANGELOG[i - 1].date;
    const below = CHANGELOG[i].date;
    // ISO date strings compare correctly lexicographically.
    assert.ok(
      above >= below,
      `entry "${CHANGELOG[i].id}" (${below}) is newer than the entry above it (${above})`,
    );
  }
});

test("entry ids are unique", () => {
  const ids = CHANGELOG.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate changelog entry id");
});

test("every change kind is valid", () => {
  for (const entry of CHANGELOG) {
    for (const change of entry.changes) {
      assert.ok(
        VALID_KINDS.includes(change.kind),
        `invalid kind "${change.kind}" in entry "${entry.id}"`,
      );
    }
  }
});

test("every deep-link appId resolves to a real app", () => {
  for (const entry of CHANGELOG) {
    for (const change of entry.changes) {
      if (change.appId !== undefined) {
        assert.ok(
          APPS[change.appId],
          `unknown appId "${change.appId}" in entry "${entry.id}"`,
        );
      }
    }
  }
});

test("every entry has a title and at least one change", () => {
  for (const entry of CHANGELOG) {
    assert.ok(entry.title.trim().length > 0, `empty title in "${entry.id}"`);
    assert.ok(entry.changes.length > 0, `no changes in "${entry.id}"`);
  }
});
