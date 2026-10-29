import assert from "node:assert/strict";
import test from "node:test";
import { getPartnershipSponsorCopy } from "./partnership-sponsor-content";

test("partnership is the current action and sponsor mentoring remains a future sample", () => {
  for (const language of ["en", "fr"] as const) {
    const copy = getPartnershipSponsorCopy(language);

    assert.ok(copy.partnershipCta.length > 0);
    assert.ok(copy.partnershipSubject.length > 0);
    assert.ok(copy.sponsorStatus.length > 0);
    assert.ok(copy.sponsorDisclaimer.length > 0);
    assert.equal(copy.mentoringExamples.length, 3);
  }
});

test("English sponsor copy does not imply a currently available program", () => {
  const copy = getPartnershipSponsorCopy("en");

  assert.match(copy.sponsorStatus, /not currently open/i);
  assert.match(copy.sponsorDisclaimer, /not a current .* program or sponsor offer/i);
  assert.match(copy.sponsorDisclaimer, /applications are open/i);
  assert.match(copy.partnershipSubject, /partnership/i);
});

test("French sponsor copy clearly identifies the sample as unavailable today", () => {
  const copy = getPartnershipSponsorCopy("fr");

  assert.match(copy.sponsorStatus, /pas ouvert actuellement/i);
  assert.match(copy.sponsorDisclaimer, /pas d’un programme ni d’une offre/i);
  assert.match(copy.sponsorDisclaimer, /n’est ouvert/i);
});
