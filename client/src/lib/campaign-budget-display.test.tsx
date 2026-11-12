import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdvertisingSection } from "../components/sections/AdvertisingSection";

const createCampaignPage = readFileSync(
  fileURLToPath(new URL("../pages/ad-campaigns.tsx", import.meta.url)),
  "utf8",
);
const campaignRoute = readFileSync(
  fileURLToPath(
    new URL("../../../server/routes/api-v1/admin/campaigns.ts", import.meta.url),
  ),
  "utf8",
);

test("campaign summary adds recorded budgets without inventing a monthly spend", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  client.setQueryData(["campaigns"], [
    { id: "one", name: "Repairs", businessId: 25, dailyBudget: "10", status: "draft" },
    { id: "two", name: "Saunas", businessId: 6, dailyBudget: "20", status: "active" },
  ]);
  try {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AdvertisingSection />
      </QueryClientProvider>,
    );
    assert.match(html, /Total Planned Amount/);
    assert.match(html, /30\.00/);
    assert.match(html, /Avg Planned Amount/);
    assert.match(html, /15\.00/);
    assert.doesNotMatch(html, /\$30\.00|\$900\.00|Daily Budget/);
    assert.match(html, /does not publish ads or charge a payment method/);
    assert.match(html, /not enforced daily spending limits/);
  } finally {
    client.clear();
  }
});

test("campaign creation starts in draft instead of implying delivery", () => {
  assert.match(createCampaignPage, /status:\s*"draft"/);
  assert.match(campaignRoute, /input\.status\s*\|\|\s*"draft"/);
});
