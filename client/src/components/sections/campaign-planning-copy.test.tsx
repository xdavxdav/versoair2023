import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvertisingSection } from "./AdvertisingSection";

const campaignPage = readFileSync(
  fileURLToPath(new URL("../../pages/ad-campaigns.tsx", import.meta.url)),
  "utf8",
);
const countryDashboard = readFileSync(
  fileURLToPath(new URL("../countries-dashboard.tsx", import.meta.url)),
  "utf8",
);

test("GeoAdmin advertising renders planned values without implying currency or daily caps", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  client.setQueryData(["campaigns"], [
    { id: "one", name: "Repairs", businessId: 25, dailyBudget: "10", status: "draft" },
    { id: "two", name: "Saunas", businessId: 6, dailyBudget: "20", status: "draft" },
  ]);

  try {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AdvertisingSection />
      </QueryClientProvider>,
    );

    assert.match(markup, /Planned Amount \(currency unspecified\)/);
    assert.match(markup, /Total Planned Amount/);
    assert.match(markup, /30\.00/);
    assert.doesNotMatch(markup, /\$30\.00|\$900\.00|Daily Budget/);
    assert.match(markup, /does not publish ads or charge a payment method/);
    assert.match(markup, /not enforced daily spending limits/);
  } finally {
    client.clear();
  }
});

test("the campaign page labels amounts as currency-unspecified planning values and creates drafts", () => {
  assert.match(campaignPage, /Planned Amount \(currency unspecified\)/);
  assert.match(campaignPage, /status:\s*"draft"/);
  assert.doesNotMatch(campaignPage, /Budget \(USD\)|\$\{parseFloat\(campaign\.budget\)/);
  assert.match(campaignPage, /does not publish ads or charge a payment method/);
  assert.match(campaignPage, /not enforced daily spending limits/);
});

test("the country dashboard doesn't present the planned amount as USD per day", () => {
  assert.match(countryDashboard, /Planned amount \(currency unspecified\)/);
  assert.match(countryDashboard, /no stored currency or\s*daily cap/);
  assert.doesNotMatch(countryDashboard, /\$\{ad\.daily_budget\}\/day/);
});
