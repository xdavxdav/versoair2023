import assert from "node:assert/strict";
import test from "node:test";
import {
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import purgatoireRouter from "./purgatoire";

// Track 1 is waiting for review with its audio stored in the database;
// track 2 has no audio at all.
const AUDIO = Buffer.from(Array.from({ length: 100 }, (_, i) => 255 - i));

function scriptedPurgatoireDb(role: string) {
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT role FROM users WHERE id = $1")) {
      return { rows: [{ role }] };
    }
    if (sql.includes("octet_length(audio_data)")) {
      if (params[0] === 1) {
        return { rows: [{ mime_type: "audio/mpeg", audio_size: AUDIO.length }] };
      }
      return { rows: params[0] === 2 ? [{ mime_type: null, audio_size: null }] : [] };
    }
    if (sql.startsWith("SELECT substring(audio_data from $2 for $3)")) {
      const [, from, length] = params as number[];
      return { rows: [{ chunk: AUDIO.subarray(from - 1, from - 1 + length) }] };
    }
    if (sql.startsWith("SELECT audio_data FROM music_tracks WHERE id = $1")) {
      return { rows: [{ audio_data: AUDIO }] };
    }
    return undefined;
  });
}

async function audition(origin: string, path: string, headers: Record<string, string>) {
  const response = await fetch(`${origin}${path}`, {
    headers,
    signal: AbortSignal.timeout(3000),
  });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

const admin = { id: 1, role: "admin" };

test("auditioning a track needs an admin session and touches no audio before that", async () => {
  const db = scriptedPurgatoireDb("user");
  await withRouter(purgatoireRouter, async (origin) => {
    const anonymous = await audition(origin, "/1/audio", {});
    assert.equal(anonymous.response.status, 401);

    const member = await audition(origin, "/1/audio", signIn({ id: 9, role: "user" }));
    assert.equal(member.response.status, 403);
  });
  assert.equal(db.matching("audio_data").length, 0);
});

test("an admin can play a pending track in full", async () => {
  const db = scriptedPurgatoireDb("admin");
  await withRouter(purgatoireRouter, async (origin) => {
    const { response, bytes } = await audition(origin, "/1/audio", signIn(admin));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.deepEqual(bytes, AUDIO);
  });
  // The status is never consulted, so pending and rejected tracks play too.
  assert.equal(db.matching("status").length, 0);
});

test("an admin can seek: ranges are sliced in the database and answered with 206", async () => {
  const db = scriptedPurgatoireDb("admin");
  await withRouter(purgatoireRouter, async (origin) => {
    const headers = signIn(admin);

    const middle = await audition(origin, "/1/audio", { ...headers, Range: "bytes=10-19" });
    assert.equal(middle.response.status, 206);
    assert.equal(middle.response.headers.get("content-range"), "bytes 10-19/100");
    assert.equal(middle.response.headers.get("content-length"), "10");
    assert.deepEqual(middle.bytes, AUDIO.subarray(10, 20));

    const tail = await audition(origin, "/1/audio", { ...headers, Range: "bytes=-5" });
    assert.equal(tail.response.status, 206);
    assert.equal(tail.response.headers.get("content-range"), "bytes 95-99/100");
    assert.deepEqual(tail.bytes, AUDIO.subarray(95));

    const open = await audition(origin, "/1/audio", { ...headers, Range: "bytes=0-" });
    assert.equal(open.response.status, 206);
    assert.deepEqual(open.bytes, AUDIO);
  });
  assert.deepEqual(db.matching("substring").map((entry) => entry.params), [
    [1, 11, 10],
    [1, 96, 5],
    [1, 1, 100],
  ]);
  assert.equal(db.matching("SELECT audio_data FROM").length, 0, "a ranged read must not load the whole file");
});

test("a range outside the file is refused with 416 and no audio is read", async () => {
  const db = scriptedPurgatoireDb("admin");
  await withRouter(purgatoireRouter, async (origin) => {
    const { response } = await audition(origin, "/1/audio", {
      ...signIn(admin),
      Range: "bytes=100-",
    });
    assert.equal(response.status, 416);
    assert.equal(response.headers.get("content-range"), "bytes */100");
  });
  assert.equal(db.matching("substring").length, 0);
});

test("a missing track, a track with no audio and a bad id are not served", async () => {
  scriptedPurgatoireDb("admin");
  await withRouter(purgatoireRouter, async (origin) => {
    const headers = signIn(admin);
    assert.equal((await audition(origin, "/404/audio", headers)).response.status, 404);
    assert.equal((await audition(origin, "/2/audio", headers)).response.status, 404);
    assert.equal((await audition(origin, "/abc/audio", headers)).response.status, 400);
    assert.equal((await audition(origin, "/0/audio", headers)).response.status, 400);
  });
});
