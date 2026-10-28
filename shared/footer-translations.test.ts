import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { FOOTER_COLUMNS, FOOTER_SOCIAL_LINKS } from "./footer-links";
import { FOOTER_COPY, FOOTER_ES } from "./footer-translations";
import { isLocalPreviewOnlyPath } from "./page-readiness";
import {
  BUNDLED_LANGUAGES,
  getPublicCopyId,
  nativeDictionary,
  type BundledLanguage,
} from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

// Brand names and words that read the same in every bundled language.
const NOT_TRANSLATED = new Set([
  "VERSO AIR INC.", "LinkedIn", "X / Twitter", "Facebook", "Blog",
]);

// Footer rows whose French or Spanish wording is genuinely the same as English.
const SAME_AS_ENGLISH: Record<"fr" | "es", ReadonlySet<string>> = {
  fr: new Set(["Contact", "Marketplace", "FAQ", "Cookies"]),
  es: new Set(["Marketplace", "Cookies", "Legal"]),
};

const COMPONENTS = [
  "client/src/components/ui/footer.tsx",
  "client/src/components/ReportIssueNudge.tsx",
] as const;

function translate(lang: BundledLanguage, text: string): string {
  const id = getPublicCopyId(text);
  assert.notEqual(id, undefined, `"${text}" has no catalogue row`);
  return nativeDictionary(lang)[id as string];
}

// <NativeLabel text="..." /> hides its copy in a prop, which the generic scan skips.
function nativeLabelTexts(relativePath: string): string[] {
  const url = new URL(`../${relativePath}`, import.meta.url);
  const source = ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const texts: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "NativeLabel") {
      for (const attribute of node.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText() === "text" &&
          attribute.initializer &&
          ts.isStringLiteral(attribute.initializer)
        ) {
          texts.push(attribute.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return texts;
}

test("every footer string has a French and Spanish row that differs from English", () => {
  assert.equal(new Set(FOOTER_COPY.map(([en]) => en)).size, FOOTER_COPY.length);
  for (const [english, french] of FOOTER_COPY) {
    assert.equal(translate("en", english), english);
    assert.equal(translate("fr", english), french);
    assert.equal(translate("es", english), FOOTER_ES[english]);
    if (!SAME_AS_ENGLISH.fr.has(english)) {
      assert.notEqual(french, english, `${english} (fr)`);
    }
    if (!SAME_AS_ENGLISH.es.has(english)) {
      assert.notEqual(FOOTER_ES[english], english, `${english} (es)`);
    }
  }
  assert.deepEqual([...BUNDLED_LANGUAGES].sort(), ["en", "es", "fr"]);
});

test("the footer and the reminder render nothing that is missing from the catalogue", () => {
  for (const file of COMPONENTS) {
    assert.deepEqual(
      uncataloguedCopy(file, { allow: NOT_TRANSLATED }),
      [],
      file,
    );
    for (const text of nativeLabelTexts(file)) {
      assert.ok(
        getPublicCopyId(text) !== undefined || NOT_TRANSLATED.has(text),
        `${file}: "${text}" has no catalogue row`,
      );
    }
  }
  assert.deepEqual(
    uncataloguedCopy("shared/footer-links.ts", {
      dataConstants: ["FOOTER_COLUMNS", "FOOTER_SOCIAL_LINKS"],
      allow: NOT_TRANSLATED,
    }),
    [],
  );
});

test("the footer and the reminder use the catalogued wording", () => {
  const used = COMPONENTS.flatMap(nativeLabelTexts);
  for (const text of [
    "Incorporated in Ontario · Toronto, Canada",
    "Report an issue",
    "All rights reserved.",
    "Something not working? Report an issue",
    "(new tab)",
  ]) {
    assert.ok(used.includes(text), `"${text}" is no longer rendered`);
  }
  assert.equal(translate("fr", "Something not working? Report an issue"), "Un problème ? Signalez-le");
  assert.equal(translate("es", "Report an issue"), "Informar de un problema");
});

test("footer links lead only to open pages that exist in the app", () => {
  const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
  const internal = FOOTER_COLUMNS.flatMap(({ links }) => links.map(({ href }) => href));
  assert.ok(internal.length >= 10);
  for (const href of internal) {
    assert.equal(isLocalPreviewOnlyPath(href), false, `${href} is blocked in production`);
    assert.ok(app.includes(`path="${href}"`), `${href} has no route in App.tsx`);
  }
  assert.equal(new Set(internal).size, internal.length, "duplicate footer link");
});

test("social links are external and open safely", () => {
  assert.ok(FOOTER_SOCIAL_LINKS.length > 0);
  for (const { href } of FOOTER_SOCIAL_LINKS) {
    assert.match(href, /^https:\/\//);
  }
  const footer = readFileSync(
    new URL("../client/src/components/ui/footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(footer.includes('rel="noopener noreferrer"'));
  assert.ok(footer.includes('data-testid="footer-feedback-link"'));
  assert.ok(footer.includes("FEEDBACK_FORM_URL"));
});
