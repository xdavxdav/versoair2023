import { createElement, useEffect } from "react";

const BUY_BUTTON_SCRIPT = "https://js.stripe.com/v3/buy-button.js";

function loadBuyButtonScript() {
  if (document.querySelector(`script[src="${BUY_BUTTON_SCRIPT}"]`)) return;
  const script = document.createElement("script");
  script.src = BUY_BUTTON_SCRIPT;
  script.async = true;
  document.head.appendChild(script);
}

interface StripeBuyButtonProps {
  buyButtonId?: string;
  publishableKey?: string;
}

/**
 * Embeds a Stripe Dashboard "buy button". Renders nothing until both IDs are
 * configured (VITE_STRIPE_BUY_BUTTON_ID and VITE_STRIPE_PUBLISHABLE_KEY).
 */
export function StripeBuyButton({
  buyButtonId = import.meta.env.VITE_STRIPE_BUY_BUTTON_ID,
  publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
}: StripeBuyButtonProps) {
  const enabled = Boolean(buyButtonId && publishableKey);

  useEffect(() => {
    if (enabled) loadBuyButtonScript();
  }, [enabled]);

  if (!enabled) return null;

  return createElement("stripe-buy-button", {
    "buy-button-id": buyButtonId,
    "publishable-key": publishableKey,
  });
}
