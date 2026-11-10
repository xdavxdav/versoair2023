import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { arenaErrorMessage } from "../../client/src/lib/arena-entry";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import arenaRouter from "./arena";

const CONTEST = 9;
const ARTIST_PROFILE = 77;
const artist = { id: 31, role: "user" };
const listener = { id: 32, role: "user" };

interface World {
  profile: Record<string, unknown> | null;
  contestStatus: "open" | "in_progress" | "completed";
  /** Artist profile ids already in round 1, in entry order. */
  entrants: number[];
  failWith?: Error;
}

const silverProfile = () => ({
  id: ARTIST_PROFILE,
  current_badge_tier: 3,
  lifetime_streams: 60000,
  stage_name: "Nova",
  division: "open",
  contest_participation_rate: "0",
  contests_entered: 0,
  contests_skipped: 0,
  contest_exempt_until: null,
  created_at: "2024-01-01T00:00:00.000Z",
});

let world: World;

beforeEach(() => {
  world = { profile: silverProfile(), contestStatus: "open", entrants: [] };
});

function scriptedDb() {
  return scriptPool((sql, params) => {
    if (world.failWith) throw world.failWith;

    if (sql.startsWith("SELECT ap.id, ab.id AS bracket_id")) {
      if (!world.profile) return { rows: [] };
      const index = world.entrants.indexOf(Number(world.profile.id));
      return {
        rows: [
          {
            id: world.profile.id,
            bracket_id: index >= 0 ? 500 + index : null,
            seed_position: index >= 0 ? index + 1 : null,
          },
        ],
      };
    }
    if (sql.includes("FROM artist_profiles WHERE user_id = $1")) {
      return { rows: world.profile ? [world.profile] : [] };
    }
    if (sql.startsWith("SELECT * FROM arena_contests WHERE id = $1")) {
      return {
        rows: world.contestStatus === "open" ? [{ id: CONTEST }] : [],
      };
    }
    if (sql.startsWith("SELECT id FROM arena_brackets WHERE contest_id")) {
      return {
        rows: world.entrants.includes(Number(params[1])) ? [{ id: 1 }] : [],
      };
    }
    if (sql.startsWith("SELECT COUNT(*) as total FROM arena_brackets")) {
      return { rows: [{ total: String(world.entrants.length) }] };
    }
    if (sql.startsWith("INSERT INTO arena_brackets")) {
      world.entrants.push(Number(params[1]));
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE arena_contests SET status = 'in_progress'")) {
      world.contestStatus = "in_progress";
      return { rows: [] };
    }
    return undefined;
  });
}

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(arenaRouter, fn, { path: "/api/arena" });

const enter = (origin: string, account = artist) =>
  call(origin, "POST", `/api/arena/${CONTEST}/enter`, {
    headers: signIn(account),
    body: {},
  });

const myEntry = (origin: string, account = artist) =>
  call(origin, "GET", `/api/arena/${CONTEST}/my-entry`, {
    headers: signIn(account),
  });

test("my-entry: a visitor is refused before anything is read", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(origin, "GET", `/api/arena/${CONTEST}/my-entry`);
    assert.equal(res.status, 401);
  });
  assert.equal(database.log.length, 0);
});

test("my-entry: a listener without an artist profile is told so", async () => {
  world.profile = null;
  scriptedDb();
  await serve(async (origin) => {
    const res = await myEntry(origin, listener);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      hasArtistProfile: false,
      entered: false,
      seedPosition: null,
    });
  });
});

test("my-entry: an artist who has not entered is not shown as entered", async () => {
  world.entrants = [1001, 1002];
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await myEntry(origin);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      hasArtistProfile: true,
      entered: false,
      seedPosition: null,
    });
  });

  const lookup = database.matching("SELECT ap.id, ab.id AS bracket_id")[0];
  assert.ok(lookup, "the entry lookup ran");
  assert.deepEqual(lookup.params, [artist.id, CONTEST]);
  assert.match(lookup.sql, /ap\.user_id = \$1 AND ap\.is_active = true/);
  assert.match(lookup.sql, /ab\.contest_id = \$2/);
});

test("my-entry: an artist who is in sees their seed", async () => {
  world.entrants = [1001, 1002, 1003, ARTIST_PROFILE];
  scriptedDb();
  await serve(async (origin) => {
    const res = await myEntry(origin);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      hasArtistProfile: true,
      entered: true,
      seedPosition: 4,
    });
  });
});

test("my-entry: malformed contest ids are a 404 before any lookup", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const headers = signIn(artist);
    for (const bad of ["abc", "0", "-1", "1.5", "99999999999"]) {
      const res = await call(origin, "GET", `/api/arena/${bad}/my-entry`, {
        headers,
      });
      assert.equal(res.status, 404, bad);
    }
  });
  assert.equal(database.matching("artist_profiles").length, 0);
});

test("my-entry: a database failure is a generic 500", async () => {
  world.failWith = new Error("connect ECONNREFUSED secret-db-host:5432");
  scriptedDb();
  const originalError = console.error;
  console.error = () => {};
  try {
    await serve(async (origin) => {
      const res = await myEntry(origin);
      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
      assert.doesNotMatch(res.text, /secret-db-host/);
    });
  } finally {
    console.error = originalError;
  }
});

test("enter: the artist joins at the next seed and the card then shows them in", async () => {
  world.entrants = [1001, 1002, 1003];
  const database = scriptedDb();
  await serve(async (origin) => {
    const before = await myEntry(origin);
    assert.equal(before.body.entered, false);

    const res = await enter(origin);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.seedPosition, 4);
    assert.equal(res.body.slotsRemaining, 12);
    assert.equal(res.body.contestStarted, false);
    assert.equal(res.body.message, "Entered arena as seed #4!");

    const after = await myEntry(origin);
    assert.deepEqual(after.body, {
      success: true,
      hasArtistProfile: true,
      entered: true,
      seedPosition: 4,
    });
  });

  const inserts = database.matching("INSERT INTO arena_brackets");
  assert.equal(inserts.length, 1);
  assert.deepEqual(inserts[0].params, [CONTEST, ARTIST_PROFILE, 4]);
  assert.equal(database.matching("SET status = 'in_progress'").length, 0);
});

test("enter: pressing the button twice enters once and the second says so", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    assert.equal((await enter(origin)).status, 200);
    const again = await enter(origin);
    assert.equal(again.status, 409);
    assert.equal(again.body.error, "Already entered this contest");
  });
  assert.equal(database.matching("INSERT INTO arena_brackets").length, 1);
});

test("enter: the 16th artist fills the contest and starts it", async () => {
  world.entrants = Array.from({ length: 15 }, (_, index) => 1000 + index);
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await enter(origin);
    assert.equal(res.status, 200);
    assert.equal(res.body.seedPosition, 16);
    assert.equal(res.body.slotsRemaining, 0);
    assert.equal(res.body.contestStarted, true);
  });
  assert.equal(world.contestStatus, "in_progress");
  assert.equal(database.matching("SET status = 'in_progress'").length, 1);
});

test("enter: a full contest turns the 17th artist away", async () => {
  world.entrants = Array.from({ length: 16 }, (_, index) => 1000 + index);
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await enter(origin);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "Contest is full (16/16 artists)");
  });
  assert.equal(database.matching("INSERT INTO arena_brackets").length, 0);
});

test("enter: only an artist with the required badge gets in", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    world.profile = { ...silverProfile(), current_badge_tier: 1 };
    const initiate = await enter(origin);
    assert.equal(initiate.status, 403);
    assert.equal(
      initiate.body.error,
      "Silver badge or higher required (tier 3+). Your tier: 1 (initiate)",
    );

    world.profile = null;
    const noProfile = await enter(origin, listener);
    assert.equal(noProfile.status, 403);
    assert.equal(
      noProfile.body.error,
      "Active artist profile required to enter the arena",
    );
  });
  assert.equal(database.matching("INSERT INTO arena_brackets").length, 0);
});

test("enter: a contest that is no longer open takes no entries", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    for (const status of ["in_progress", "completed"] as const) {
      world.contestStatus = status;
      const res = await enter(origin);
      assert.equal(res.status, 400, status);
      assert.equal(res.body.error, "Contest not found or registration closed");
    }
  });
  assert.equal(database.matching("INSERT INTO arena_brackets").length, 0);
});

test("enter: every failure the button can hit reads as a plain sentence", async () => {
  // The page shows arenaErrorMessage(body) under the button. Sign-in failures
  // answer { error: { code, message } } while arena handlers answer
  // { error: "text" }, so both shapes have to come out as text.
  scriptedDb();
  const originalError = console.error;
  console.error = () => {};
  try {
    await serve(async (origin) => {
      const visitor = await call(
        origin,
        "POST",
        `/api/arena/${CONTEST}/enter`,
        {
          body: {},
        },
      );
      assert.equal(visitor.status, 401);
      // Sign-in failures carry an object, so the server's own words must still come through.
      assert.equal(typeof visitor.body.error, "object");
      assert.ok(visitor.body.error.message);
      assert.equal(arenaErrorMessage(visitor.body), visitor.body.error.message);

      world.profile = { ...silverProfile(), current_badge_tier: 2 };
      const low = await enter(origin);
      assert.match(arenaErrorMessage(low.body), /^Silver badge or higher/);

      world.profile = silverProfile();
      world.failWith = new Error("boom");
      const broken = await enter(origin);
      assert.equal(broken.status, 500);
      assert.equal(arenaErrorMessage(broken.body), "Failed to enter contest");
    });
  } finally {
    console.error = originalError;
  }
});
