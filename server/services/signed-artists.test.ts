import assert from "node:assert/strict";
import test from "node:test";
import { getSignedArtistMap } from "./signed-artists";

function fakeDb(rows: any[] = []) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  return {
    calls,
    db: {
      async query(text: string, values?: unknown[]) {
        calls.push({ text, values });
        return { rows };
      },
    },
  };
}

test("only approved contracts with a real grade can make an artist signed", async () => {
  const { db, calls } = fakeDb();
  await getSignedArtistMap(db, [4]);
  const sql = calls[0].text;
  assert.match(sql, /FROM artist_contracts/);
  assert.match(sql, /status = 'approved'/);
  assert.match(sql, /grade IN \('S', 'A', 'B', 'C'\)/);
  assert.match(sql, /DISTINCT ON \(artist_id\)/);
  assert.match(sql, /ORDER BY artist_id, reviewed_at DESC NULLS LAST, id DESC/);
});

test("music_artists.label_status is never consulted, because its default says signed", async () => {
  const { db, calls } = fakeDb();
  await getSignedArtistMap(db, [4]);
  assert.doesNotMatch(calls[0].text, /label_status|music_artists/);
});

test("ids are de-duplicated and junk ids never reach the query", async () => {
  const { db, calls } = fakeDb();
  await getSignedArtistMap(db, [7, 7, 3, null, undefined, 0, -2, 1.5, Number.NaN, 3]);
  assert.deepEqual(calls[0].values, [[7, 3]]);
});

test("no artist ids means no query and nobody is signed", async () => {
  const { db, calls } = fakeDb();
  assert.equal((await getSignedArtistMap(db, [])).size, 0);
  assert.equal((await getSignedArtistMap(db, [null, undefined])).size, 0);
  assert.equal(calls.length, 0);
});

test("grade and featuring come from the contract; grade C is signed but not featured", async () => {
  const { db } = fakeDb([
    { artist_id: 1, grade: "S", can_be_featured: true },
    { artist_id: "2", grade: "C", can_be_featured: false },
    { artist_id: 3, grade: "B", can_be_featured: null },
  ]);
  const signed = await getSignedArtistMap(db, [1, 2, 3, 4]);
  assert.deepEqual(signed.get(1), { grade: "S", canBeFeatured: true });
  assert.deepEqual(signed.get(2), { grade: "C", canBeFeatured: false });
  assert.deepEqual(signed.get(3), { grade: "B", canBeFeatured: false });
  assert.equal(signed.has(4), false, "an artist without a contract is regular");
});

test("a row without a recognised grade is ignored rather than badged", async () => {
  const { db } = fakeDb([
    { artist_id: 1, grade: "pending", can_be_featured: true },
    { artist_id: 2, grade: null, can_be_featured: true },
  ]);
  assert.equal((await getSignedArtistMap(db, [1, 2])).size, 0);
});
