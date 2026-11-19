import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CheckoutReturnPhase } from "@/hooks/use-checkout-return";
import CheckoutReturnNotice, { type PurchaseKind } from "./CheckoutReturnNotice";

function render(
  phase: CheckoutReturnPhase,
  purchase: PurchaseKind = "plan",
  planName?: string,
): string {
  return renderToStaticMarkup(
    <CheckoutReturnNotice
      phase={phase}
      purchase={purchase}
      planName={planName}
      onCheckAgain={() => undefined}
      onDismiss={() => undefined}
    />,
  );
}

test("a visitor who did not just return from checkout sees nothing", () => {
  assert.equal(render("idle"), "");
});

test("while confirming, the buyer is told the payment is being checked", () => {
  const html = render("confirming");
  assert.match(html, /role="status"/);
  assert.match(html, /Confirming your payment/);
  assert.doesNotMatch(html, /Close/);
});

test("a slow confirmation says not to pay again and offers a retry and support", () => {
  const html = render("delayed");
  assert.match(html, /role="alert"/);
  assert.match(html, /please do not pay again/);
  assert.match(html, /Check again/);
  assert.match(html, /href="mailto:support@versoair\.com"/);
  assert.match(html, />Contact Support</);
});

test("a confirmed payment says what was bought", () => {
  assert.match(render("confirmed", "community"), /Welcome to the community/);
  assert.match(
    render("confirmed", "activity"),
    /You are on the list for this activity/,
  );
  assert.match(
    render("confirmed", "plan", "Pro Vérifié"),
    /Your Pro Vérifié plan is now active/,
  );
  assert.match(render("confirmed", "plan"), /Payment received\. Thank you!/);
  assert.match(render("confirmed", "plan"), />Close</);
});

test("a cancelled checkout says nothing was charged", () => {
  const html = render("cancelled", "activity");
  assert.match(html, /Checkout was cancelled\. You have not been charged\./);
  assert.doesNotMatch(html, /Payment received/);
});
