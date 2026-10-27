import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { ONBOARDING_COPY, ONBOARDING_ES } from "./onboarding-translations";
import { getPublicCopyId, nativeDictionary } from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

const CELEBRATION = "client/src/components/SuccessCelebration.tsx";
const NOTICE = "client/src/components/VerificationPendingNotice.tsx";
const FRENCH_LETTERS = /[àâçéèêëîïôûù]/i;
const COPY_FIELDS = new Set(["headline", "subheadline", "features", "ctaText"]);

// What the verification notice receives from the server, in English, as it appears in
// server/routes/auth.ts and server/middleware/rate-limiter.ts.
const REQUIRED_SERVER_MESSAGES = [
  "Account created! Check your email for a verification link.",
  "Account created, but email delivery could not be confirmed. Check your inbox and spam folder before requesting another link.",
  "If that email is registered, a verification link has been sent.",
  "This email is already verified. You can log in.",
  "Verification email sent. Check your inbox and spam folder.",
  "We couldn't confirm email delivery. Check your inbox and spam folder before retrying.",
  "Email is required",
];
const OTHER_SERVER_MESSAGES = [
  "Account created. Verify your email before signing in.",
  "Account created, but the verification email could not be sent. Your account remains unverified. Try resending once email delivery is available.",
  "Artist account created. Verify your email before signing in.",
  "Artist account created, but the verification email could not be sent. Your account remains unverified. Try resending once email delivery is available.",
  "Please verify your email before logging in.",
  "Please verify your email before logging in. Check your inbox for the verification link.",
  "Your password is correct, but this account must verify its email before signing in.",
  "Your password is correct, but this account must verify its email before signing in. Check your inbox or request a new verification link.",
  "Too many password reset requests. Please try again in an hour.",
];

const dictionaries = {
  fr: nativeDictionary("fr"),
  en: nativeDictionary("en"),
  es: nativeDictionary("es"),
};
type Language = keyof typeof dictionaries;
const LANGUAGES: readonly Language[] = ["fr", "en", "es"];

function native(language: Language, text: string): string {
  const id = getPublicCopyId(text);
  assert.notEqual(id, undefined, `no catalogue entry for: ${text}`);
  return dictionaries[language][id!];
}

function sourceOf(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// The copy literals of PORTAL_MESSAGES, with the portal and field they belong to.
function portalStrings(): Array<{ portal: string; field: string; text: string }> {
  const file = ts.createSourceFile(CELEBRATION, sourceOf(CELEBRATION), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Array<{ portal: string; field: string; text: string }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "PORTAL_MESSAGES" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const portal of node.initializer.properties) {
        if (!ts.isPropertyAssignment(portal) || !ts.isObjectLiteralExpression(portal.initializer)) continue;
        for (const field of portal.initializer.properties) {
          if (!ts.isPropertyAssignment(field) || !COPY_FIELDS.has(field.name.getText())) continue;
          const values = ts.isArrayLiteralExpression(field.initializer) ? field.initializer.elements : [field.initializer];
          for (const value of values) {
            if (ts.isStringLiteral(value)) {
              found.push({ portal: portal.name.getText(), field: field.name.getText(), text: value.text });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

test("the success celebration has a catalogue entry for every visible string", () => {
  assert.deepEqual(uncataloguedCopy(CELEBRATION, { dataConstants: ["PORTAL_MESSAGES"], expressions: true }), []);
});

test("the verification notice has a catalogue entry for every visible string", () => {
  assert.deepEqual(uncataloguedCopy(NOTICE, { calls: ["setStatusMessage"], expressions: true }), []);
});

test("the notice's default label and error fallbacks are catalogued and still used by the component", () => {
  // The scanner does not read default parameters or new Error(...) arguments.
  const source = sourceOf(NOTICE);
  for (const text of [
    "Continue to sign in after verifying",
    "Could not request a verification email.",
    "Could not request a verification email. Please try again.",
  ]) {
    assert.ok(source.includes(JSON.stringify(text)), `the component no longer contains: ${text}`);
    for (const language of ["fr", "es"] as const) {
      assert.notEqual(native(language, text), text, `${language}: not translated: ${text}`);
    }
  }
});

test("every celebration headline is native in French, English and Spanish", () => {
  const headlines = portalStrings().filter(({ field }) => field === "headline");
  assert.deepEqual(
    headlines.map(({ portal }) => portal).sort(),
    ["artist", "business", "community", "contractor", "general", "subscriber"],
  );
  for (const { text } of headlines) {
    const [fr, en, es] = LANGUAGES.map((language) => native(language, text));
    assert.equal(en, text, `the English headline must be the source text: ${text}`);
    assert.notEqual(fr, text, `French headline is still English: ${text}`);
    assert.notEqual(es, text, `Spanish headline is still English: ${text}`);
    assert.notEqual(es, fr, `Spanish headline is still French: ${text}`);
  }
});

test("celebration copy is English in the source and translates into French and Spanish", () => {
  const strings = portalStrings();
  const portals = new Set(strings.map(({ portal }) => portal));
  assert.equal(portals.size, 6);
  for (const portal of portals) {
    const fields = new Set(strings.filter((entry) => entry.portal === portal).map(({ field }) => field));
    assert.deepEqual([...fields].sort(), [...COPY_FIELDS].sort(), `${portal}: missing copy fields`);
  }
  for (const { portal, text } of strings) {
    assert.doesNotMatch(text, FRENCH_LETTERS, `${portal}: the source text is not English: ${text}`);
    assert.notEqual(native("fr", text), text, `${portal}: no French for: ${text}`);
    assert.notEqual(native("es", text), text, `${portal}: no Spanish for: ${text}`);
  }
});

test("the greeting and the countdown keep a single placeholder in every language", () => {
  const compose = (language: Language, template: string, token: string, value: string) => {
    const parts = native(language, template).split(token);
    assert.equal(parts.length, 2, `${language}: "${template}" needs exactly one ${token}`);
    return parts.join(value);
  };
  assert.equal(compose("fr", "Hello, {name}!", "{name}", "Marie"), "Bonjour, Marie !");
  assert.equal(compose("en", "Hello, {name}!", "{name}", "Marie"), "Hello, Marie!");
  assert.equal(compose("es", "Hello, {name}!", "{name}", "Marie"), "¡Hola, Marie!");
  assert.equal(compose("fr", "Redirecting automatically in {time}", "{time}", "8s"), "Redirection automatique dans 8s");
  assert.equal(compose("en", "Redirecting automatically in {time}", "{time}", "8s"), "Redirecting automatically in 8s");
  assert.equal(compose("es", "Redirecting automatically in {time}", "{time}", "8s"), "Redirección automática en 8s");
});

test("server messages shown by the verification notice read natively in French, English and Spanish", () => {
  assert.equal(REQUIRED_SERVER_MESSAGES.length, 7);
  for (const message of [...REQUIRED_SERVER_MESSAGES, ...OTHER_SERVER_MESSAGES]) {
    const texts = LANGUAGES.map((language) => native(language, message));
    texts.forEach((text) => assert.ok(text.trim(), `empty translation for: ${message}`));
    assert.equal(new Set(texts).size, 3, `two languages share the same text for: ${message}`);
    assert.equal(native("en", message), message);
  }
});

test("the catalogued server messages still match the wording the server sends", () => {
  const server = ["server/routes/auth.ts", "server/middleware/rate-limiter.ts"].map(sourceOf).join("\n");
  for (const message of [...REQUIRED_SERVER_MESSAGES, ...OTHER_SERVER_MESSAGES]) {
    assert.ok(server.includes(message), `the server no longer sends (update the catalogue): ${message}`);
  }
});

test("onboarding rows are fully translated and follow the French and Spanish house style", () => {
  const english = new Set<string>();
  const french = new Set<string>();
  for (const [en, fr] of ONBOARDING_COPY) {
    const es = ONBOARDING_ES[en];
    assert.ok(!english.has(en), `duplicate English text: ${en}`);
    assert.ok(!french.has(fr), `duplicate French text: ${fr}`);
    english.add(en);
    french.add(fr);
    assert.doesNotMatch(en, FRENCH_LETTERS, `French letters in the English text: ${en}`);
    assert.notEqual(fr, en, `French is untranslated: ${en}`);
    assert.notEqual(es, en, `Spanish is untranslated: ${en}`);
    for (const text of [fr, es]) {
      assert.doesNotMatch(text, /[\u00a0\u202f\u2019]/, `non-breaking space or curly apostrophe in: ${text}`);
    }
    assert.doesNotMatch(fr, /\S[!?:;]/, `French needs a space before this punctuation mark: ${fr}`);
    assert.doesNotMatch(fr, /\.\s*!/, `stray ".!" in: ${fr}`);
    if (es.includes("!")) assert.ok(es.includes("¡"), `Spanish exclamation needs an opening ¡: ${es}`);
    if (es.includes("?")) assert.ok(es.includes("¿"), `Spanish question needs an opening ¿: ${es}`);
  }
});
