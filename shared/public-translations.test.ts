import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { APPLY_COPY, APPLY_ES } from "./apply-translations";
import { CHROME_COPY, CHROME_ES } from "./chrome-translations";
import { GEO_ADMIN_COPY, GEO_ADMIN_ES } from "./geo-admin-translations";
import { ONBOARDING_COPY, ONBOARDING_ES } from "./onboarding-translations";
import { RECOVERY_COPY, RECOVERY_ES } from "./recovery-translations";
import { BUNDLED_LANGUAGES, fillTemplate, isBundledLanguage, getPublicCopyId, nativeDictionary, PUBLIC_COPY } from "./public-translations";
import { SPANISH_COPY } from "./spanish-translations";

test("legal page static copy has native FR/EN coverage, excluding brands and punctuation", () => {
  const fixed = new Set([
    "support@versoair.com", "Verso Air", '"Straight to the point"', "Stripe:",
    "Groq / Ollama:", "Google Analytics:", "Google Translate:", "Google Forms:",
    "When you select another language, the browser-based translation widget may send visible page text and language preferences to Google to provide translations.",
    "Browser-based page translation when you choose another language. Google may process page text, language preferences, and related browser information under its own privacy terms.",
    "Neon / PostgreSQL:", "Render:",
    "connect.sid", "Essential", "token", "verso_portal", "verso_theme", "_ga / _gid", "_gat",
    "verso_favorites", "verso_search_history", "verso_notification_prefs", "tanstack_query_cache",
    "Chrome:", "Firefox:", "Safari:", "Edge:", "GDPR",
  ]);
  for (const file of ["terms", "privacy", "cookies"]) {
    const path = new URL(`../client/src/pages/${file}.tsx`, import.meta.url);
    const source = ts.createSourceFile(String(path), readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const missing: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.text.replace(/\s+/g, " ").trim();
        if (text && /[a-z]/i.test(text) && !fixed.has(text) && getPublicCopyId(text) === undefined) {
          missing.push(text);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.deepEqual(missing, [], `${file} needs native copy for these strings`);
  }
});

test("every catalogue phrase has nonempty native translations and stable lookup in both languages", () => {
  for (const [en, fr] of PUBLIC_COPY) {
    assert.ok(en.trim());
    assert.ok(fr.trim());
    assert.notEqual(getPublicCopyId(en), undefined);
    assert.notEqual(getPublicCopyId(fr), undefined);
  }
});

test("every bundled language covers the whole current catalogue without ordinal drift or fallback", () => {
  for (const language of BUNDLED_LANGUAGES) {
    const dictionary = nativeDictionary(language);
    assert.equal(Object.keys(dictionary).length, PUBLIC_COPY.length);
    PUBLIC_COPY.forEach(([en, fr], index) => {
      const expected = language === "es" ? SPANISH_COPY[en] : language === "fr" ? fr : en;
      assert.equal(dictionary[String(index)], expected);
      assert.ok(dictionary[String(index)].trim(), `${language}: ${en}`);
    });
  }
  assert.equal(isBundledLanguage("es"), true);
  assert.equal(isBundledLanguage("de"), false);
  assert.equal(isBundledLanguage("../private"), false);
});

test("Spanish critical commercial and legal copy preserves no-payment and no-entitlement terms", () => {
  assert.equal(SPANISH_COPY["Custom quote"], "Presupuesto personalizado");
  assert.match(SPANISH_COPY["GeoAdmin pricing is provided for reference and inquiry only. No payment is taken and no plan is activated from the pricing page. Availability, deliverables, taxes, billing, renewal, cancellation, and any refund conditions must be confirmed in a written offer before you accept."],
    /No se cobra ningún pago ni se activa ningún plan/);
  assert.match(SPANISH_COPY["Premium is available by inquiry only. It uses the same platform scope as Essentiel and adds proposed content-preparation services, subject to written confirmation. It does not grant additional account permissions."],
    /No concede permisos adicionales/);
});

test("the homepage hero's launch copy is native in English and Spanish and no longer says it is preparing", () => {
  const badge = "Ontario, Canada • lancement en cours";
  const tagline =
    "VERSO AIR INC. lance sa plateforme numérique dédiée à la visibilité des entreprises et aux projets créatifs. Nous démarrons en Ontario, avec l’ambition de nous développer à l’échelle mondiale.";

  for (const text of [badge, tagline]) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    for (const language of ["en", "es"] as const) {
      const native = nativeDictionary(language)[id!];
      assert.notEqual(native, text, `not translated to ${language}: ${text}`);
      assert.match(native, /Ontario/, `${language} keeps the Ontario start: ${text}`);
      assert.doesNotMatch(native, /prepar/i, `${language} must not say it is preparing: ${text}`);
    }
  }

  const english = nativeDictionary("en");
  assert.match(english[getPublicCopyId(badge)!], /launching now/);
  assert.match(english[getPublicCopyId(tagline)!], /launching[\s\S]*Ontario[\s\S]*worldwide/);
  assert.match(nativeDictionary("es")[getPublicCopyId(tagline)!], /lanza[\s\S]*Ontario[\s\S]*mundial/);
});

test("the About page's launch copy is native in English and Spanish and no longer says it is preparing", () => {
  const launchCopy = [
    "Ce Que VERSO AIR Lance",
    "VERSO AIR INC. lance ses services numériques, en commençant par l’Ontario. Contactez-nous pour en savoir plus sur les prochaines étapes.",
    "La Plateforme d'Intelligence d'Affaires, de l'Ontario vers le monde",
  ];

  for (const text of launchCopy) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    for (const language of ["en", "es"] as const) {
      const native = nativeDictionary(language)[id!];
      assert.notEqual(native, text, `not translated to ${language}: ${text}`);
      assert.doesNotMatch(native, /prepar/i, `${language} must not say it is preparing: ${text}`);
    }
  }

  const english = nativeDictionary("en");
  const spanish = nativeDictionary("es");
  const cta = getPublicCopyId(launchCopy[1])!;
  assert.match(english[cta], /launching[\s\S]*Ontario/);
  assert.match(spanish[cta], /lanza[\s\S]*Ontario/);
  assert.match(english[getPublicCopyId(launchCopy[2])!], /Ontario to the world/);
  assert.match(spanish[getPublicCopyId(launchCopy[2])!], /Ontario al mundo/);
});

test("the About page's primary French copy has native English translations", () => {
  const english = nativeDictionary("en");
  const aboutCopy = [
    "Plateforme d'Intelligence Multi-Sectorielle",
    "Écosystème d'Intelligence d'Affaires",
    "VERSO AIR INC. lance sa plateforme numérique dédiée à la visibilité des entreprises et aux projets créatifs. Nous démarrons en Ontario, avec l’ambition de nous développer à l’échelle mondiale.",
    "Parcourir les Entreprises",
    "Commerce & Détail",
    "Annuaire complet d'entreprises & moteur de recherche multi-secteur",
    "Secteurs de la Plateforme",
    "Fonctionnalités prévues",
    "Prêt à Explorer ?",
  ];

  for (const text of aboutCopy) {
    const id = getPublicCopyId(text);
    assert.notEqual(id, undefined, `missing catalogue entry for: ${text}`);
    assert.notEqual(english[id!], text, `not translated to English: ${text}`);
  }
});

const AUTHORED_MODULES: Array<{
  name: string;
  rows: ReadonlyArray<readonly [string, string]>;
  es: Record<string, string>;
}> = [
  { name: "chrome", rows: CHROME_COPY, es: CHROME_ES },
  { name: "apply", rows: APPLY_COPY, es: APPLY_ES },
  { name: "onboarding", rows: ONBOARDING_COPY, es: ONBOARDING_ES },
  { name: "geo-admin", rows: GEO_ADMIN_COPY, es: GEO_ADMIN_ES },
  { name: "recovery", rows: RECOVERY_COPY, es: RECOVERY_ES },
];

test("authored interface modules own their lookups and keep placeholders intact in every language", () => {
  const tokens = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
  for (const { name, rows, es } of AUTHORED_MODULES) {
    for (const [en, fr] of rows) {
      const index = PUBLIC_COPY.findIndex(([candidate]) => candidate === en);
      assert.notEqual(index, -1, `${name}: not in the catalogue: ${en}`);
      assert.equal(getPublicCopyId(en), String(index), `${name}: English lookup is shadowed by another row: ${en}`);
      // A French wording shared with an older row (e.g. "Annuler") keeps resolving to the older row.
      const frRow = PUBLIC_COPY[Number(getPublicCopyId(fr))];
      assert.ok(frRow && (frRow[0] === fr || frRow[1] === fr), `${name}: French wording is not resolvable: ${fr}`);
      assert.equal(tokens(fr), tokens(en), `${name}: French placeholders differ: ${en}`);
      assert.ok(es[en]?.trim(), `${name}: missing Spanish: ${en}`);
      assert.equal(tokens(es[en]), tokens(en), `${name}: Spanish placeholders differ: ${en}`);
    }
  }
});

test("fillTemplate fills known placeholders and leaves unknown ones visible", () => {
  assert.equal(fillTemplate("Select country: {name}", { name: "Belgique" }), "Select country: Belgique");
  assert.equal(fillTemplate("{count} countries", { count: 35 }), "35 countries");
  assert.equal(fillTemplate("{count} countries", {}), "{count} countries");
});

test("picker and notice copy reads naturally in each bundled language", () => {
  const dictionaries = Object.fromEntries(BUNDLED_LANGUAGES.map(l => [l, nativeDictionary(l)]));
  const text = (language: (typeof BUNDLED_LANGUAGES)[number], source: string) =>
    dictionaries[language][getPublicCopyId(source)!];
  assert.equal(text("fr", "Select country: {name}"), "Choisir le pays : {name}");
  assert.equal(text("en", "Choisir le pays : {name}"), "Select country: {name}");
  assert.match(text("es", "Google Translate could not load. Check your connection and try again."), /Traductor de Google/);
  assert.match(text("fr", "Google Translate could not load. Check your connection and try again."), /Google Traduction/);
  assert.equal(text("fr", "Business Intelligence Platform"), "Plateforme d'intelligence d'affaires");
});
