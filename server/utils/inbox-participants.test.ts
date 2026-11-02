import assert from "node:assert/strict";
import test from "node:test";

import {
  mirrorRecipientUserId,
  participantIsUser,
  sameKindOfParticipant,
} from "./inbox-participants";

test("a business-network thread never resolves to a user", () => {
  assert.equal(participantIsUser("business_network"), false);
  // A business id such as 7 must not be mistaken for the account that has user id 7.
  assert.equal(
    mirrorRecipientUserId({ type: "business_network", participantId: "7" }, 3),
    null,
  );
});

test("direct threads still mirror into the other user's inbox", () => {
  for (const type of ["marketplace", "music_artist", "direct", "support"]) {
    assert.equal(participantIsUser(type), true, type);
  }
  assert.equal(
    mirrorRecipientUserId({ type: "marketplace", participantId: "12" }, 3),
    12,
  );
  assert.equal(
    mirrorRecipientUserId({ type: "music_artist", participantId: 12 }, 3),
    12,
  );
});

test("ids that are not a real other user are never mirrored", () => {
  for (const participantId of ["support", "", "0", "-4", "1.5", "abc", null, undefined]) {
    assert.equal(
      mirrorRecipientUserId({ type: "marketplace", participantId }, 3),
      null,
      String(participantId),
    );
  }
  assert.equal(
    mirrorRecipientUserId({ type: "marketplace", participantId: "3" }, 3),
    null,
    "a thread with yourself has nobody to mirror to",
  );
  assert.equal(
    mirrorRecipientUserId({ type: null, participantId: "5" }, 3),
    5,
    "an untyped thread keeps the previous behaviour",
  );
});

test("a thread is only reused for the same kind of participant", () => {
  // User 7 and business 7 are different things even though the numbers match.
  assert.equal(sameKindOfParticipant("business_network", "direct"), false);
  assert.equal(sameKindOfParticipant("marketplace", "business_network"), false);
  assert.equal(sameKindOfParticipant("business_network", "business_network"), true);
  assert.equal(sameKindOfParticipant("direct", "marketplace"), true);
  assert.equal(sameKindOfParticipant(undefined, "music_artist"), true);
});
