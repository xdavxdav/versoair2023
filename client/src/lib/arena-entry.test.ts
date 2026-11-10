import assert from "node:assert/strict";
import test from "node:test";
import {
  arenaEntryPanel,
  arenaErrorMessage,
  parseArenaMyEntry,
  type ArenaMyEntry,
} from "./arena-entry";

const artistNotIn: ArenaMyEntry = {
  hasArtistProfile: true,
  entered: false,
  seedPosition: null,
};
const artistIn: ArenaMyEntry = {
  hasArtistProfile: true,
  entered: true,
  seedPosition: 4,
};
const listener: ArenaMyEntry = {
  hasArtistProfile: false,
  entered: false,
  seedPosition: null,
};

const panel = (
  contestStatus: string | undefined,
  signedIn: boolean,
  myEntry: ArenaMyEntry | null | undefined,
  loading = false,
) => arenaEntryPanel({ contestStatus, signedIn, myEntry, loading });

test("only a contest that is open for registration shows the entry card", () => {
  for (const status of [
    "in_progress",
    "completed",
    "cancelled",
    "",
    undefined,
  ]) {
    assert.equal(panel(status, true, artistNotIn), "hidden", String(status));
    assert.equal(panel(status, false, null), "hidden", String(status));
  }
  assert.equal(panel("open", true, artistNotIn), "can-enter");
});

test("a visitor is asked to sign in, even while nothing has loaded", () => {
  assert.equal(panel("open", false, null), "sign-in");
  assert.equal(panel("open", false, undefined, true), "sign-in");
});

test("a signed-in user waits for the lookup instead of seeing a wrong state", () => {
  assert.equal(panel("open", true, undefined, true), "loading");
});

test("an artist who is not in yet can enter; one who is in sees the seed", () => {
  assert.equal(panel("open", true, artistNotIn), "can-enter");
  assert.equal(panel("open", true, artistIn), "entered");
});

test("a listener without an artist profile is sent to create one", () => {
  assert.equal(panel("open", true, listener), "needs-artist-profile");
});

test("when the lookup failed the button still shows and the server decides", () => {
  assert.equal(panel("open", true, null), "can-enter");
  assert.equal(panel("open", true, undefined), "can-enter");
});

test("the entry response is read strictly", () => {
  assert.deepEqual(
    parseArenaMyEntry({
      success: true,
      hasArtistProfile: true,
      entered: true,
      seedPosition: 4,
    }),
    artistIn,
  );
  assert.deepEqual(parseArenaMyEntry({ success: true }), listener);
  assert.deepEqual(
    parseArenaMyEntry({
      success: true,
      hasArtistProfile: "yes",
      entered: "true",
      seedPosition: "4",
    }),
    listener,
  );
  for (const bad of [null, undefined, {}, { success: false }, "ok", 1, []]) {
    assert.equal(parseArenaMyEntry(bad), null, JSON.stringify(bad));
  }
});

test("an arena handler's plain-text error is shown as written", () => {
  assert.equal(
    arenaErrorMessage({
      success: false,
      error:
        "Silver badge or higher required (tier 3+). Your tier: 1 (initiate)",
    }),
    "Silver badge or higher required (tier 3+). Your tier: 1 (initiate)",
  );
});

test("a sign-in failure's error object becomes its message, never an object", () => {
  const message = arenaErrorMessage({
    success: false,
    error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
  });
  assert.equal(message, "Invalid or expired token");
  assert.equal(typeof message, "string");
});

test("anything else falls back to a readable sentence", () => {
  const fallback = "Something went wrong. Please try again.";
  for (const body of [
    null,
    undefined,
    "boom",
    42,
    [],
    {},
    { error: "" },
    { error: "   " },
    { error: null },
    { error: 5 },
    { error: {} },
    { error: { message: "" } },
    { error: { message: 7 } },
  ]) {
    assert.equal(arenaErrorMessage(body), fallback, JSON.stringify(body));
  }
  assert.equal(arenaErrorMessage({}, "Custom"), "Custom");
});
