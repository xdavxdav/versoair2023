import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import {
  BUNDLED_LANGUAGES,
  fillTemplate,
  getPublicCopyId,
  nativeDictionary,
  type BundledLanguage,
} from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

// Identical in every bundled language, so they intentionally have no catalogue row.
const SAME_IN_EVERY_LANGUAGE = new Set([
  "Pop", "Hip-Hop", "R&B", "Rock", "Jazz", "Afrobeats", "Reggae", "Marketing",
]);

const WELCOME =
  "Welcome back, {name}. Select an eligible portal below, or apply to unlock new ones.";

const SERVER_MESSAGES = [
  ["server/routes/auth.ts", "An account with this email already exists"],
  ["server/routes/auth.ts", "Invalid email address"],
  ["server/routes/auth.ts", "Invalid email format"],
  ["server/routes/auth.ts", "Display name must be at least 2 characters"],
  ["server/routes/auth.ts", "Stage name is required"],
  [
    "server/middleware/rate-limiter.ts",
    "Too many accounts created from this IP. Please try again later.",
  ],
] as const;

function translate(lang: BundledLanguage, text: string): string {
  const id = getPublicCopyId(text);
  assert.notEqual(id, undefined, `"${text}" has no catalogue row`);
  return nativeDictionary(lang)[id as string];
}

function parseSource(relativePath: string): ts.SourceFile {
  const url = new URL(`../${relativePath}`, import.meta.url);
  return ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function arrayLength(source: ts.SourceFile, name: string): number {
  let length = -1;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      length = node.initializer.elements.length;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return length;
}

test("the apply page has native copy for everything it renders", () => {
  assert.deepEqual(
    uncataloguedCopy("client/src/pages/apply.tsx", {
      dataConstants: ["PORTALS", "MUSICAL_PORTALS", "GENRES", "SPECIALIZATIONS"],
      calls: ["setError"],
      expressions: true,
      allow: SAME_IN_EVERY_LANGUAGE,
    }),
    [],
  );
});

test("the unlock reasons shown to signed-in users have native copy", () => {
  assert.deepEqual(
    uncataloguedCopy("client/src/lib/portal-access.ts", {
      dataConstants: ["UNLOCK_REASONS"],
    }),
    [],
  );
});

test("account-creation errors from the server are still sent and have native copy", () => {
  for (const [file, message] of SERVER_MESSAGES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(message), `${file} no longer sends "${message}"`);
    assert.equal(translate("en", message), message);
    assert.notEqual(translate("fr", message), message, `${message} (fr)`);
    assert.notEqual(translate("es", message), message, `${message} (es)`);
  }
});

test("the signed-in welcome line keeps its {name} placeholder in every language", () => {
  for (const lang of BUNDLED_LANGUAGES) {
    assert.equal(
      translate(lang, WELCOME).split("{name}").length,
      2,
      `${lang} must contain {name} exactly once`,
    );
  }
  assert.ok(
    fillTemplate(translate("fr", WELCOME), { name: "Joël" }).startsWith(
      "Heureux de vous revoir, Joël.",
    ),
  );
});

test("the accessible-count badges cover every musical portal", () => {
  const musicalPortals = arrayLength(
    parseSource("client/src/pages/apply.tsx"),
    "MUSICAL_PORTALS",
  );
  assert.ok(musicalPortals > 0, "MUSICAL_PORTALS was not found in apply.tsx");
  for (let count = 1; count <= musicalPortals; count += 1) {
    assert.notEqual(
      getPublicCopyId(`${count} Accessible`),
      undefined,
      `add a "${count} Accessible" row`,
    );
  }
  assert.notEqual(
    getPublicCopyId(`${musicalPortals} Portals`),
    undefined,
    `add a "${musicalPortals} Portals" row`,
  );
});

test("the signed-in selector and form read as French and Spanish, not English", () => {
  assert.equal(translate("fr", "Choose Your Path"), "Choisissez votre voie");
  assert.equal(translate("fr", "Apply for Access"), "Demander l'accès");
  assert.equal(translate("fr", "Select genre"), "Choisissez un genre");
  assert.equal(translate("es", "Select genre"), "Elige un género");
  assert.equal(translate("fr", "Creating Account..."), "Création du compte...");
  assert.equal(translate("es", "Creating Account..."), "Creando cuenta...");
  assert.equal(translate("fr", "2 Accessible"), "2 accessibles");
  assert.equal(translate("fr", "1 Accessible"), "1 accessible");
});
