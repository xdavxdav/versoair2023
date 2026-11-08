import assert from "node:assert/strict";
import test from "node:test";

import { SESSION_COPY, getSessionCopy, type SessionCopy } from "./listening-session-copy";

const { en, fr } = SESSION_COPY;

// A function entry needs a sample call so a new one cannot slip in untested.
const SAMPLE_CALLS: { [K in keyof SessionCopy]?: unknown[] } = {
  hostedBy: ["Luq"],
  trackCount: [7],
  startsIn: ["12:05"],
  breakThenNext: ["Blue Hour"],
  tracklistMeta: [7, "42 min"],
  signedBadgeLabel: ["S"],
  chatTooLong: [2000],
};

// Brand terms that are the same word in both languages.
const SAME_IN_BOTH: ReadonlySet<string> = new Set(["sectionReplays"]);

const keys = (copy: SessionCopy) => Object.keys(copy).sort();

test("English and French define exactly the same keys", () => {
  assert.deepEqual(keys(fr), keys(en));
});

test("each key has the same kind of value in both languages", () => {
  for (const key of keys(en)) {
    assert.equal(
      typeof fr[key as keyof SessionCopy],
      typeof en[key as keyof SessionCopy],
      key,
    );
  }
});

test("every function entry has a sample call in this test", () => {
  for (const key of keys(en)) {
    if (typeof en[key as keyof SessionCopy] === "function") {
      assert.ok(SAMPLE_CALLS[key as keyof SessionCopy], `add a sample call for ${key}`);
    }
  }
});

const rendered = (copy: SessionCopy): Array<[string, string]> =>
  keys(copy).map((key) => {
    const value = copy[key as keyof SessionCopy];
    if (typeof value === "function") {
      const args = SAMPLE_CALLS[key as keyof SessionCopy] ?? [];
      return [key, (value as (...input: unknown[]) => string)(...args)];
    }
    return [key, value];
  });

test("no entry is empty, and none carries a placeholder or a stray token", () => {
  for (const copy of [en, fr]) {
    for (const [key, text] of rendered(copy)) {
      assert.ok(text.trim().length > 0, `${key} is empty`);
      assert.equal(text, text.trim(), `${key} has stray whitespace`);
      assert.doesNotMatch(text, /\{\{|\}\}|\[\[|\]\]|undefined|null|NaN|\$\{/, key);
    }
  }
});

test("a function entry puts its arguments into the sentence, in both languages", () => {
  for (const copy of [en, fr]) {
    for (const [key, args] of Object.entries(SAMPLE_CALLS)) {
      const text = (copy[key as keyof SessionCopy] as (...input: unknown[]) => string)(...args);
      for (const arg of args as unknown[]) assert.ok(text.includes(String(arg)), `${key}: ${text}`);
    }
  }
});

test("French is actually translated, apart from brand words", () => {
  const english = new Map(rendered(en));
  for (const [key, text] of rendered(fr)) {
    if (SAME_IN_BOTH.has(key)) continue;
    assert.notEqual(text, english.get(key), `${key} is still English`);
  }
});

test("counts use the singular for one, and French treats zero as singular", () => {
  assert.equal(en.trackCount(1), "1 track");
  assert.equal(en.trackCount(0), "0 tracks");
  assert.equal(en.trackCount(7), "7 tracks");
  assert.equal(fr.trackCount(1), "1 titre");
  assert.equal(fr.trackCount(0), "0 titre");
  assert.equal(fr.trackCount(7), "7 titres");
  assert.equal(en.tracklistMeta(1, "3:05"), "1 track · 3:05");
  assert.equal(fr.tracklistMeta(2, "3 min"), "2 titres · 3 min");
});

test("the copy is looked up by language", () => {
  assert.equal(getSessionCopy("fr"), fr);
  assert.equal(getSessionCopy("en"), en);
});

test("the live copy never promises live voice in this release", () => {
  for (const [, text] of [...rendered(en), ...rendered(fr)]) {
    assert.doesNotMatch(text, /\bmic\b|microphone|micro\b|voice|voix/i);
  }
});
