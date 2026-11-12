import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeEmailHtml,
  getBusinessClaimEvidence,
  hasStrongBusinessClaimEvidence,
} from "./business-claim";

test("claim evidence matches a listed work email case-insensitively", () => {
  const evidence = getBusinessClaimEvidence(
    { email: "hello@shop.example", phone: "416-555-0100" },
    { workEmail: "HELLO@SHOP.EXAMPLE" },
  );
  assert.equal(evidence.emailMatchesListed, true);
  assert.equal(hasStrongBusinessClaimEvidence(evidence), true);
});

test("claim evidence matches website domains without accepting suffix attacks", () => {
  const matching = getBusinessClaimEvidence(
    { website: "https://www.shop.example/about" },
    { workEmail: "owner@team.shop.example" },
  );
  const hostile = getBusinessClaimEvidence(
    { website: "shop.example" },
    { workEmail: "owner@shop.example.evil" },
  );
  assert.equal(matching.emailDomainMatchesWebsite, true);
  assert.equal(hostile.emailDomainMatchesWebsite, false);
});

test("claim evidence normalizes phone formatting and rejects short digit matches", () => {
  const matching = getBusinessClaimEvidence(
    { phone: "+1 (416) 555-0100" },
    { workPhone: "1-416-555-0100" },
  );
  const short = getBusinessClaimEvidence(
    { phone: "123" },
    { workPhone: "123" },
  );
  assert.equal(matching.phoneMatchesListed, true);
  assert.equal(short.phoneMatchesListed, false);
});

test("invalid websites do not create email-domain evidence", () => {
  const evidence = getBusinessClaimEvidence(
    { website: "https:///" },
    { workEmail: "owner@example.com" },
  );
  assert.equal(evidence.emailDomainMatchesWebsite, false);
  assert.equal(hasStrongBusinessClaimEvidence(evidence), false);
});

test("email HTML values are escaped", () => {
  assert.equal(escapeEmailHtml(`<b title="x">&'`), "&lt;b title=&quot;x&quot;&gt;&amp;&#39;");
});
