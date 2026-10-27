import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { GEO_ADMIN_COPY, GEO_ADMIN_ES } from "./geo-admin-translations";
import { fillTemplate, getPublicCopyId, nativeDictionary } from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

const GATE = "client/src/components/GeoAdminAuthGate.tsx";
const PAGE = "client/src/pages/geo-admin.tsx";
const BANNER = "client/src/components/GeoAdminMarketStatusBanner.tsx";
const SERVER_FILES = [
  "server/routes/auth.ts",
  "server/services/admin-gate-policy.ts",
  "server/middleware/rate-limiter.ts",
];
const FRENCH_LETTERS = /[àâçéèêëîïôûù]/i;
const BRANDS = ["Geo Admin", "GeoAdmin", "SuperAdmin", "Essential", "Verified", "Max", "Enterprise"];

// Server messages the gate can display, exactly as /auth/login, /auth/admin-gate,
// /auth/verify-login-otp and the rate limiter send them.
const FIXED_SERVER_MESSAGES = [
  "Invalid email address",
  "Password is required",
  "Multiple accounts were found for this email. Please choose one.",
  "Your account has been temporarily locked. Please try again in 15 minutes.",
  "Invalid email or password",
  "Please verify your email before logging in. Check your inbox for the verification link.",
  "Owner authenticator is not configured. Contact the deployment administrator.",
  "Unable to send the sign-in verification code. Please try again later.",
  "Enter your GeoAdmin access code.",
  "Too many attempts. Try again later.",
  "GeoAdmin access-code configuration conflict.",
  "Invalid credentials.",
  "Owner GeoAdmin sign-in is not configured.",
  "This GeoAdmin account must be verified before code sign-in.",
  "Missing code or token",
  "Verification session expired. Please sign in again.",
  "Invalid token",
  "Authenticator verification is unavailable. Sign in again.",
  "Incorrect or expired code",
  "That authenticator code was already used. Wait for a new code.",
];
// Server messages that carry a value; the server builds them with a template literal.
const SERVER_TEMPLATES = [
  "Account temporarily locked. Try again in {minutes} minute(s).",
  "This account uses {provider} sign-in. Please sign in with {provider} instead.",
];
// Texts the gate and the dashboard show that another module already owns.
const SHARED_TEXTS = [
  "Explore GeoAdmin plans",
  "Don't have an account?",
  "Sign In",
  "Email",
  "Password",
  "Forgot password?",
  "Create account",
  "or continue with",
  "Invalid email address",
  "Please verify your email before logging in. Check your inbox for the verification link.",
  "Welcome, Premium member!",
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

function tokens(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The title and description of every toast({...}) call in a component.
function toastTexts(relativePath: string): string[] {
  const file = ts.createSourceFile(relativePath, sourceOf(relativePath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "toast") {
      const [options] = node.arguments;
      if (options && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          if (ts.isPropertyAssignment(property) && ["title", "description"].includes(property.name.getText())) {
            found.push(property.initializer.getText());
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

// A regular expression constant declared at the top of the gate.
function gateRegExp(name: string): RegExp {
  const match = new RegExp(`const ${name} =\\s*(/.+/[a-z]*);`).exec(sourceOf(GATE));
  assert.ok(match, `${name} is missing from the gate`);
  const literal = match[1];
  const end = literal.lastIndexOf("/");
  return new RegExp(literal.slice(1, end), literal.slice(end + 1));
}

test("the GeoAdmin sign-in gate has a catalogue entry for every visible string", () => {
  assert.deepEqual(
    uncataloguedCopy(GATE, {
      calls: ["setError"],
      expressions: true,
      allow: new Set([
        "Geo Admin", // product name, never translated
        "Google", // identity-provider brand on the SSO buttons
        "Microsoft", // identity-provider brand on the SSO buttons
        "Apple", // identity-provider brand on the SSO buttons
        "AAA-000-AAA", // example of the staff access-code format
      ]),
    }),
    [],
  );
});

test("the GeoAdmin dashboard shell has a catalogue entry for every visible string", () => {
  assert.deepEqual(uncataloguedCopy(PAGE, { expressions: true }), []);
});

test("the GeoAdmin market banner has a catalogue entry for every visible string", () => {
  assert.deepEqual(uncataloguedCopy(BANNER, { expressions: true }), []);
});

test("toasts pass their title and description through translateText", () => {
  // The scanner does not read the fields of an options object.
  for (const [file, count] of [[GATE, 2], [PAGE, 6]] as const) {
    const texts = toastTexts(file);
    assert.equal(texts.length, count, `${file}: unexpected number of toast fields`);
    for (const text of texts) assert.match(text, /translateText\(/, `${file}: untranslated toast text: ${text}`);
  }
});

test("every GeoAdmin row is used by a component or is a server message", () => {
  const source = [GATE, PAGE, BANNER].map((file) => sourceOf(file).replace(/\s+/g, " ")).join(" ");
  const server = new Set([...FIXED_SERVER_MESSAGES, ...SERVER_TEMPLATES]);
  for (const [en] of GEO_ADMIN_COPY) {
    assert.ok(server.has(en) || source.includes(en), `no component uses this row any more: ${en}`);
  }
});

test("key GeoAdmin strings read natively in French, English and Spanish", () => {
  const expected: Record<string, Record<Language, string>> = {
    "Sign Out": { fr: "Se déconnecter", en: "Sign Out", es: "Cerrar sesión" },
    "Sign In & Access Dashboard": {
      fr: "Se connecter au tableau de bord",
      en: "Sign In & Access Dashboard",
      es: "Iniciar sesión en el panel",
    },
    "Invalid credentials. Please try again.": {
      fr: "Identifiants invalides. Veuillez réessayer.",
      en: "Invalid credentials. Please try again.",
      es: "Credenciales no válidas. Inténtalo de nuevo.",
    },
    "Invalid email or password": {
      fr: "Adresse e-mail ou mot de passe incorrect",
      en: "Invalid email or password",
      es: "Correo electrónico o contraseña incorrectos",
    },
    "Available markets: Canada, France, and Côte d’Ivoire. Final scope and terms are confirmed before purchase.": {
      fr: "Marchés disponibles : Canada, France et Côte d'Ivoire. Le périmètre final et les conditions sont confirmés avant l'achat.",
      en: "Available markets: Canada, France, and Côte d’Ivoire. Final scope and terms are confirmed before purchase.",
      es: "Mercados disponibles: Canadá, Francia y Costa de Marfil. El alcance final y las condiciones se confirman antes de la compra.",
    },
  };
  for (const [text, languages] of Object.entries(expected)) {
    for (const language of LANGUAGES) assert.equal(native(language, text), languages[language], `${language}: ${text}`);
    // The French wording is also a lookup key, for pages authored in French.
    assert.equal(getPublicCopyId(languages.fr), getPublicCopyId(text), `French text does not find its row: ${text}`);
  }
});

test("sentences with placeholders keep their token in every language and read naturally once filled", () => {
  const fill = (language: Language, template: string, values: Record<string, string | number>) =>
    fillTemplate(native(language, template), values);
  const lockout = "Account temporarily locked. Try again in {minutes} minute(s).";
  assert.equal(fill("fr", lockout, { minutes: 15 }), "Compte temporairement verrouillé. Réessayez dans 15 minute(s).");
  assert.equal(fill("en", lockout, { minutes: 15 }), "Account temporarily locked. Try again in 15 minute(s).");
  assert.equal(fill("es", lockout, { minutes: 15 }), "Cuenta bloqueada temporalmente. Inténtalo de nuevo en 15 minuto(s).");
  const provider = "This account uses {provider} sign-in. Please sign in with {provider} instead.";
  assert.equal(
    fill("fr", provider, { provider: "Google" }),
    "Ce compte utilise la connexion Google. Veuillez vous connecter avec Google à la place.",
  );
  assert.equal(
    fill("es", provider, { provider: "Google" }),
    "Esta cuenta usa el inicio de sesión de Google. Inicia sesión con Google en su lugar.",
  );
  const tier = "You're viewing Geo Admin as a {tier} subscriber.";
  assert.equal(fill("fr", tier, { tier: "Verified" }), "Vous consultez Geo Admin en tant qu'abonné Verified.");
  assert.equal(fill("es", tier, { tier: "Verified" }), "Estás viendo Geo Admin como suscriptor Verified.");
  const connected = "Connected as {role} — {name}";
  assert.equal(fill("fr", connected, { role: "Geo Admin", name: "Marie" }), "Connecté en tant que Geo Admin — Marie");
  assert.equal(fill("es", connected, { role: "Geo Admin", name: "Marie" }), "Conectado como Geo Admin — Marie");
  // The sentence is split on {tier} to put the plan name in bold, so each language needs exactly one.
  for (const language of LANGUAGES) assert.equal(native(language, tier).split("{tier}").length, 2, language);
  assert.equal(
    fill("fr", "COMING SOON IN {country}", { country: "BELGIQUE" }),
    "PROCHAINEMENT DISPONIBLE : BELGIQUE",
  );
  assert.equal(fill("es", "COMING SOON IN {country}", { country: "BÉLGICA" }), "PRÓXIMAMENTE EN BÉLGICA");
});

test("the texts shared with other modules are still catalogued and native", () => {
  for (const text of SHARED_TEXTS) {
    assert.equal(native("en", text), text);
    for (const language of ["fr", "es"] as const) {
      assert.notEqual(native(language, text), text, `${language}: not translated: ${text}`);
    }
  }
});

test("server messages shown by the gate read natively in French, English and Spanish", () => {
  for (const message of [...FIXED_SERVER_MESSAGES, ...SERVER_TEMPLATES]) {
    const texts = LANGUAGES.map((language) => native(language, message));
    assert.equal(native("en", message), message);
    assert.equal(new Set(texts).size, 3, `two languages share the same text for: ${message}`);
    assert.deepEqual(tokens(native("fr", message)), tokens(message), `French placeholders differ for: ${message}`);
    assert.deepEqual(tokens(native("es", message)), tokens(message), `Spanish placeholders differ for: ${message}`);
  }
});

test("the catalogued server messages still match the wording the server sends", () => {
  const server = SERVER_FILES.map(sourceOf).join("\n");
  for (const message of FIXED_SERVER_MESSAGES) {
    assert.ok(server.includes(message), `the server no longer sends (update the catalogue): ${message}`);
  }
  for (const template of SERVER_TEMPLATES) {
    const pattern = template.split(/\{\w+\}/).map(escapeRegExp).join("\\$\\{[^}]+\\}");
    assert.match(server, new RegExp(pattern), `the server no longer builds (update the catalogue): ${template}`);
  }
});

test("the gate recognises the two server messages that carry a value", () => {
  const lockout = gateRegExp("LOCKOUT_MESSAGE");
  assert.equal(lockout.exec("Account temporarily locked. Try again in 12 minute(s).")?.[1], "12");
  assert.equal(lockout.exec("Account temporarily locked. Try again in soon minute(s)."), null);
  const provider = gateRegExp("PROVIDER_MESSAGE");
  assert.equal(provider.exec("This account uses Google sign-in. Please sign in with Google instead.")?.[1], "Google");
  assert.equal(provider.exec("This account uses Google sign-in. Please sign in with Apple instead."), null);
});

test("GeoAdmin rows are fully translated and follow the French and Spanish house style", () => {
  assert.deepEqual(
    Object.keys(GEO_ADMIN_ES).sort(),
    GEO_ADMIN_COPY.map(([en]) => en).sort(),
    "the Spanish table and the French rows must cover the same English texts",
  );
  const english = new Set<string>();
  const french = new Set<string>();
  for (const [en, fr] of GEO_ADMIN_COPY) {
    const es = (GEO_ADMIN_ES as Record<string, string>)[en];
    assert.ok(!english.has(en), `duplicate English text: ${en}`);
    assert.ok(!french.has(fr), `duplicate French text: ${fr}`);
    english.add(en);
    french.add(fr);
    assert.doesNotMatch(en.replace(/Côte d’Ivoire/g, ""), FRENCH_LETTERS, `French letters in the English text: ${en}`);
    assert.notEqual(fr, en, `French is untranslated: ${en}`);
    assert.notEqual(es, en, `Spanish is untranslated: ${en}`);
    assert.notEqual(es, fr, `Spanish is still French: ${en}`);
    assert.deepEqual(tokens(fr), tokens(en), `French placeholders differ for: ${en}`);
    assert.deepEqual(tokens(es), tokens(en), `Spanish placeholders differ for: ${en}`);
    for (const text of [fr, es]) {
      assert.doesNotMatch(text, /[\u00a0\u202f\u2019]/, `non-breaking space or curly apostrophe in: ${text}`);
    }
    for (const brand of BRANDS) {
      if (en.includes(brand)) {
        assert.ok(fr.includes(brand), `French changes the brand ${brand}: ${en}`);
        assert.ok(es.includes(brand), `Spanish changes the brand ${brand}: ${en}`);
      }
    }
    assert.doesNotMatch(fr, /\S[!?:;]/, `French needs a space before this punctuation mark: ${fr}`);
    assert.doesNotMatch(fr, /courriel|\bemail\b|(?<!e-)\bmail\b/i, `French uses "e-mail", not another word for it: ${fr}`);
    if (es.includes("!")) assert.ok(es.includes("¡"), `Spanish exclamation needs an opening ¡: ${es}`);
    if (es.includes("?")) assert.ok(es.includes("¿"), `Spanish question needs an opening ¿: ${es}`);
  }
});

test("no other row shadows a GeoAdmin row in the catalogue", () => {
  for (const [en, fr] of GEO_ADMIN_COPY) {
    const es = (GEO_ADMIN_ES as Record<string, string>)[en];
    assert.equal(native("fr", en), fr, `French lookup of "${en}" lands on another row`);
    assert.equal(native("es", en), es, `Spanish lookup of "${en}" lands on another row`);
    assert.equal(getPublicCopyId(fr), getPublicCopyId(en), `the French text "${fr}" belongs to another row`);
  }
});
