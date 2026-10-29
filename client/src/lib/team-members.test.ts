import assert from "node:assert/strict";
import test from "node:test";
import { getTeamMember, TEAM_MEMBERS } from "./team-members";

test("team member cards resolve to the supplied LinkedIn profiles", () => {
  const expectedProfiles = new Map([
    [
      "boussou-elvis-jonathan",
      "https://www.linkedin.com/in/jonathan-elvis-boussou-9762a3b3/",
    ],
    [
      "joel-vanga",
      "https://www.linkedin.com/in/joel-vanga-5b755b185/",
    ],
    ["kacou-phaully", "https://www.linkedin.com/in/kacou-phaully/"],
    [
      "guillaume-henry-ackah",
      "https://www.linkedin.com/in/amon-guillaume-henri-ackah-b259501b7/",
    ],
  ]);

  assert.equal(TEAM_MEMBERS.length, expectedProfiles.size);
  for (const [id, linkedin] of expectedProfiles) {
    assert.equal(getTeamMember(id)?.linkedin, linkedin);
  }
});

test("unknown team member ids do not resolve to a LinkedIn destination", () => {
  assert.equal(getTeamMember("unknown-person"), undefined);
  assert.equal(getTeamMember(null), undefined);
});
