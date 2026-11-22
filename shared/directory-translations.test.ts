import assert from "node:assert/strict";
import { test } from "node:test";
import { DIRECTORY_COPY } from "./directory-translations";
import {
  fillTemplate,
  getPublicCopyId,
  nativeDictionary,
} from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

test("the directory page has a catalogue entry for every visible string", () => {
  assert.deepEqual(
    uncataloguedCopy("client/src/pages/businesses-directory.tsx", {
      dataConstants: ["categories"],
      expressions: true,
      // Brand name (translate="no") and the browser-tab title.
      allow: new Set(["Verso Air", "Businesses Directory | VersoAir"]),
    }),
    [],
  );
});

test("directory rows are native in every language and keep their placeholders", () => {
  const dictionaries = {
    en: nativeDictionary("en"),
    fr: nativeDictionary("fr"),
    es: nativeDictionary("es"),
  };
  for (const [en] of DIRECTORY_COPY) {
    const id = getPublicCopyId(en);
    assert.ok(id, `${en} is catalogued`);
    const tokens = (en.match(/\{\w+\}/g) ?? []).sort();
    for (const [lang, dictionary] of Object.entries(dictionaries)) {
      const text = dictionary[id];
      assert.ok(text, `${lang}: ${en}`);
      assert.deepEqual((text.match(/\{\w+\}/g) ?? []).sort(), tokens, `${lang}: ${en}`);
      if (en.includes("|")) assert.equal(text.split("|").length, 2, `${lang}: ${en}`);
    }
  }
});

test("the continent heading and French category cards read natively in English", () => {
  const en = nativeDictionary("en");
  const heading = (text: string) => en[getPublicCopyId(text)!];
  assert.equal(heading("European Business|Directory"), "European Business|Directory");
  assert.equal(heading("Communication & Publicité"), "Communication & Advertising");
  assert.equal(
    fillTemplate(en[getPublicCopyId("Page {page} of {pages}")!], { page: 2, pages: 5 }),
    "Page 2 of 5",
  );
});
