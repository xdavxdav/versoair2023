import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { CHECKOUT_COPY, CHECKOUT_ES } from "./checkout-translations";
import {
  fillTemplate,
  getPublicCopyId,
  nativeDictionary,
  type BundledLanguage,
} from "./public-translations";
import { uncataloguedCopy } from "./test-support/copy-coverage";

// Rendered by the checkout buttons, the return notice and the event page.
const CHECKOUT_FILES = [
  "client/src/components/CheckoutReturnNotice.tsx",
  "client/src/components/OfferCheckoutButton.tsx",
  "client/src/components/PlanCheckoutButton.tsx",
  "client/src/pages/event-detail.tsx",
] as const;

// Pages that only use a few catalogued strings among much other English copy.
const OFFER_LABEL_PAGES = [
  "client/src/pages/community.tsx",
  "client/src/pages/event-detail.tsx",
] as const;

// Messages the payment and RSVP routes send, which the buttons show translated.
const SERVER_MESSAGES = [
  ["server/routes/events.ts", "A ticket is required to join this activity"],
  [
    "server/routes/events.ts",
    "This ticket was paid for. Contact support to cancel it and request a refund.",
  ],
  ["server/routes/events.ts", "Event not found"],
  ["server/routes/api-v1/payments.ts", "You already have a ticket for this activity."],
  ["server/routes/api-v1/payments.ts", "You are already registered for this activity."],
  ["server/routes/api-v1/payments.ts", "This activity has already taken place."],
  ["server/routes/api-v1/payments.ts", "You are already a community member."],
  [
    "server/middleware/rate-limiter.ts",
    "Too many attempts. Please wait a few minutes and try again.",
  ],
] as const;

function translate(lang: BundledLanguage, text: string): string {
  const id = getPublicCopyId(text);
  assert.notEqual(id, undefined, `"${text}" has no catalogue row`);
  return nativeDictionary(lang)[id as string];
}

function parse(relativePath: string): ts.SourceFile {
  const url = new URL(`../${relativePath}`, import.meta.url);
  return ts.createSourceFile(
    url.pathname,
    readFileSync(url, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

// <OfferCheckoutButton label="..." /> and tr("...") hide copy from the generic scan.
function literalsOf(relativePath: string, kind: "offer-label" | "tr-call"): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      kind === "offer-label" &&
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText() === "OfferCheckoutButton"
    ) {
      for (const attribute of node.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText() === "label" &&
          attribute.initializer &&
          ts.isStringLiteral(attribute.initializer)
        ) {
          found.push(attribute.initializer.text);
        }
      }
    }
    if (
      kind === "tr-call" &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "tr" &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(relativePath));
  return found;
}

test("every checkout string has a French and Spanish wording that differs from English", () => {
  assert.ok(CHECKOUT_COPY.length > 30);
  assert.equal(
    new Set(CHECKOUT_COPY.map(([en]) => en)).size,
    CHECKOUT_COPY.length,
    "duplicate English row",
  );
  for (const [english, french] of CHECKOUT_COPY) {
    assert.equal(translate("en", english), english);
    assert.equal(translate("fr", english), french);
    assert.equal(translate("es", english), CHECKOUT_ES[english]);
    assert.notEqual(french, english, `${english} (fr)`);
    assert.notEqual(CHECKOUT_ES[english], english, `${english} (es)`);
  }
});

test("the checkout components render nothing that is missing from the catalogue", () => {
  for (const file of CHECKOUT_FILES) {
    assert.deepEqual(
      uncataloguedCopy(file, {
        calls: ["setError", "setRsvpError", "setLoadError"],
        expressions: true,
        // The mailto link text, and the currency symbol beside the offer price.
        allow: new Set(["support@versoair.com", "— CA$"]),
      }),
      [],
      file,
    );
  }
});

test("the buy and join labels and the member badge are catalogued", () => {
  const labels = OFFER_LABEL_PAGES.flatMap((file) => literalsOf(file, "offer-label"));
  assert.ok(labels.includes("Buy ticket"), "the event page no longer sells tickets");
  assert.ok(labels.includes("Join the community"), "the community page no longer sells membership");
  const trCalls = literalsOf("client/src/pages/community.tsx", "tr-call");
  assert.ok(trCalls.includes("Community Member"));
  for (const text of [...labels, ...trCalls]) {
    assert.notEqual(getPublicCopyId(text), undefined, `"${text}" has no catalogue row`);
    assert.notEqual(translate("fr", text), text, `${text} (fr)`);
    assert.notEqual(translate("es", text), text, `${text} (es)`);
  }
});

test("the billing-cycle toggle on the pricing page is catalogued", () => {
  const source = readFileSync(
    new URL("../client/src/pages/pricing.tsx", import.meta.url),
    "utf8",
  );
  for (const text of ["Monthly", "Annual", "Billing cycle"]) {
    assert.ok(source.includes(`"${text}"`), `pricing.tsx no longer shows "${text}"`);
    assert.notEqual(translate("fr", text), text, `${text} (fr)`);
    assert.notEqual(translate("es", text), text, `${text} (es)`);
  }
});

test("server messages are still sent and have French and Spanish copy", () => {
  for (const [file, message] of SERVER_MESSAGES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(message), `${file} no longer sends "${message}"`);
    assert.equal(translate("en", message), message);
    assert.notEqual(translate("fr", message), message, `${message} (fr)`);
    assert.notEqual(translate("es", message), message, `${message} (es)`);
  }
});

test("prices and counts are filled into the translated button and event copy", () => {
  assert.equal(
    fillTemplate(translate("fr", "Pay {price}/yr"), { price: "CA$187" }),
    "Payer CA$187/an",
  );
  assert.equal(
    fillTemplate(translate("es", "Pay {price}/mo"), { price: "CA$43" }),
    "Pagar CA$43/mes",
  );
  assert.equal(
    fillTemplate(translate("fr", "{count} people going"), { count: 12 }),
    "12 personnes y vont",
  );
  assert.equal(
    fillTemplate(translate("fr", "Payment received. Your {plan} plan is now active."), {
      plan: "Pro Max",
    }),
    "Paiement reçu. Votre offre Pro Max est maintenant active.",
  );
});
