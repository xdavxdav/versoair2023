import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import cookieParser from "cookie-parser";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import coverRouter from "./business-cover";

const BUSINESS = 5;
const owner = { id: 21, role: "user" };
const coOwner = { id: 22, role: "business_owner" };
const stranger = { id: 8, role: "user" };
const admin = { id: 1, role: "admin" };
const moderator = { id: 3, role: "moderator" };
const superuser = { id: 2, role: "superuser" };

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
]);

const previousFlag = process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
beforeEach(() => {
  delete process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
});
afterEach(() => {
  if (previousFlag === undefined)
    delete process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
  else process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = previousFlag;
});

interface StoredCover {
  cover_data: Buffer | null;
  cover_mime: string | null;
  owner_id: number;
  is_public: boolean | null;
}

interface Scenario {
  ownerId?: number;
  coOwnerId?: number;
  userTier?: string;
  bizTier?: string;
  /** The row behind GET /file/:id; undefined: no such business. */
  stored?: StoredCover;
  readFails?: boolean;
}

function scriptedDb(scenario: Scenario = {}) {
  return scriptPool((sql, params) => {
    const ownsIt = () =>
      String(params[0]) === String(BUSINESS) &&
      [scenario.ownerId ?? owner.id, scenario.coOwnerId].some(
        (id) => id != null && String(params[1]) === String(id),
      );

    if (sql.startsWith("SELECT b.id, b.tier, u.subscription_tier")) {
      return {
        rows: ownsIt()
          ? [
              {
                id: BUSINESS,
                tier: scenario.bizTier ?? "free",
                subscription_tier: scenario.userTier ?? "free",
              },
            ]
          : [],
      };
    }
    if (sql.startsWith("SELECT b.id FROM businesses b")) {
      return { rows: ownsIt() ? [{ id: BUSINESS }] : [] };
    }
    if (sql.startsWith("SELECT b.cover_data, b.cover_mime, b.owner_id,")) {
      if (scenario.readFails)
        throw new Error("password authentication failed for secret-db-host");
      return {
        rows:
          scenario.stored && String(params[0]) === String(BUSINESS)
            ? [scenario.stored]
            : [],
      };
    }
    if (sql.includes("FROM business_owners bo") && sql.includes("AS is_owner")) {
      return {
        rows: [
          {
            is_owner:
              String(params[0]) === String(BUSINESS) &&
              String(params[1]) === String(scenario.coOwnerId),
          },
        ],
      };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedDb>;

const writes = (db: ScriptedDb) =>
  db.log.filter((entry) => /^(INSERT|UPDATE|DELETE)\b/.test(entry.sql));

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(coverRouter, fn, {
    path: "/api/business-cover",
    before: [cookieParser()],
  });

async function postForm(
  origin: string,
  path: string,
  form: FormData,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, text };
}

function coverForm(
  file?: { name: string; type: string; content: Buffer },
  fields: Record<string, string> = { businessId: String(BUSINESS) },
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) {
    form.append(
      "cover",
      new Blob([new Uint8Array(file.content)], { type: file.type }),
      file.name,
    );
  }
  return form;
}

async function fetchCover(
  origin: string,
  path: string,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${origin}${path}`, {
    headers,
    signal: AbortSignal.timeout(3000),
  });
  return {
    status: response.status,
    headers: response.headers,
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

const png = { name: "cover.png", type: "image/png", content: PNG };
const UPLOAD = "/api/business-cover/upload";
const FILE = `/api/business-cover/file/${BUSINESS}`;
const publicCover: StoredCover = {
  cover_data: PNG,
  cover_mime: "image/png",
  owner_id: owner.id,
  is_public: true,
};
const pendingCover: StoredCover = { ...publicCover, is_public: false };

test("uploading or removing a cover needs a signed-in user", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const upload = await postForm(origin, UPLOAD, coverForm(png));
    assert.equal(upload.status, 401);
    const removal = await call(
      origin,
      "DELETE",
      `/api/business-cover/${BUSINESS}`,
    );
    assert.equal(removal.status, 401);
  });
  assert.deepEqual(writes(db), []);
});

test("an owner can upload a cover while subscriptions are not on sale", async () => {
  const db = scriptedDb();
  let coverUrl = "";
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, coverForm(png), signIn(owner));
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    coverUrl = res.body.coverUrl;
  });
  assert.match(coverUrl, /^\/api\/business-cover\/file\/5\?v=\d+$/);

  const [update, ...others] = writes(db);
  assert.equal(others.length, 0);
  assert.ok(
    update.sql.startsWith("UPDATE businesses SET cover_url = $1, cover_data = $2"),
  );
  assert.equal(update.params[0], coverUrl);
  assert.deepEqual(update.params[1], PNG);
  assert.equal(update.params[2], "image/png");
  assert.equal(String(update.params[3]), String(BUSINESS));
});

test("an accepted co-owner can upload a cover", async () => {
  const db = scriptedDb({ coOwnerId: coOwner.id });
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, coverForm(png), signIn(coOwner));
    assert.equal(res.status, 200);
  });
  assert.equal(writes(db).length, 1);
});

test("when subscriptions are on sale a free-tier owner is asked to upgrade", async () => {
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "true";
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, coverForm(png), signIn(owner));
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.requiredTier, "essential");
    assert.match(res.body.message, /paid subscription/i);
  });
  assert.deepEqual(writes(db), []);
});

test("when subscriptions are on sale a paid tier on the business or the owner can upload", async () => {
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "true";
  const scenario: Scenario = { bizTier: "essential" };
  const db = scriptedDb(scenario);
  await serve(async (origin) => {
    const viaBusiness = await postForm(
      origin,
      UPLOAD,
      coverForm(png),
      signIn(owner),
    );
    assert.equal(viaBusiness.status, 200);

    scenario.bizTier = "free";
    scenario.userTier = "max";
    const viaOwner = await postForm(
      origin,
      UPLOAD,
      coverForm(png),
      signIn(owner),
    );
    assert.equal(viaOwner.status, 200);
  });
  assert.equal(writes(db).length, 2);
});

test("only the owner of the business can change its cover", async () => {
  const db = scriptedDb({ ownerId: 99 });
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, coverForm(png), signIn(owner));
    assert.equal(res.status, 403);
    assert.match(res.body.message, /don't own/i);

    const removal = await call(origin, "DELETE", `/api/business-cover/${BUSINESS}`, {
      headers: signIn(owner),
    });
    assert.equal(removal.status, 403);
  });
  assert.deepEqual(writes(db), []);
});

test("only image files up to 5 MB are accepted", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const headers = signIn(owner);

    const text = await postForm(
      origin,
      UPLOAD,
      coverForm({
        name: "notes.txt",
        type: "text/plain",
        content: Buffer.from("hi"),
      }),
      headers,
    );
    assert.equal(text.status, 400);
    assert.match(text.body.message, /Invalid file type/);

    const tooBig = await postForm(
      origin,
      UPLOAD,
      coverForm({ ...png, content: Buffer.alloc(5 * 1024 * 1024 + 1) }),
      headers,
    );
    assert.equal(tooBig.status, 413);
    assert.match(tooBig.body.message, /5 MB/);

    const noFile = await postForm(origin, UPLOAD, coverForm(undefined), headers);
    assert.equal(noFile.status, 400);
    assert.match(noFile.body.message, /No cover photo/);

    const noBusiness = await postForm(origin, UPLOAD, coverForm(png, {}), headers);
    assert.equal(noBusiness.status, 400);
    assert.match(noBusiness.body.message, /businessId is required/);
  });
  assert.deepEqual(writes(db), []);
});

test("every upload gets a new address, so a replaced cover is not stuck in the cache", async () => {
  scriptedDb();
  const urls: string[] = [];
  await serve(async (origin) => {
    const headers = signIn(owner);
    for (let i = 0; i < 2; i++) {
      const res = await postForm(origin, UPLOAD, coverForm(png), headers);
      assert.equal(res.status, 200);
      urls.push(res.body.coverUrl);
    }
  });
  assert.notEqual(urls[0], urls[1]);
});

test("removing a cover clears every stored column", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await call(origin, "DELETE", `/api/business-cover/${BUSINESS}`, {
      headers: signIn(owner),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
  const [update, ...others] = writes(db);
  assert.equal(others.length, 0);
  assert.match(
    update.sql,
    /^UPDATE businesses SET cover_url = NULL, cover_data = NULL, cover_mime = NULL WHERE id = \$1$/,
  );
  assert.equal(String(update.params[0]), String(BUSINESS));
});

test("a cover of a business in the directory is shown to every visitor", async () => {
  const db = scriptedDb({ stored: publicCover });
  await serve(async (origin) => {
    const visitor = await fetchCover(origin, FILE);
    assert.equal(visitor.status, 200);
    assert.deepEqual(visitor.bytes, PNG);
    assert.equal(visitor.headers.get("content-type"), "image/png");
    assert.equal(visitor.headers.get("cache-control"), "public, max-age=86400");
    assert.equal(visitor.headers.get("x-content-type-options"), "nosniff");

    const versioned = await fetchCover(origin, `${FILE}?v=1700000000000`);
    assert.equal(versioned.status, 200);
    assert.deepEqual(versioned.bytes, PNG);

    // A stale sign-in must not hide a public cover.
    const stale = await fetchCover(origin, FILE, {
      Cookie: "auth_token=expired",
    });
    assert.equal(stale.status, 200);
    assert.deepEqual(stale.bytes, PNG);
  });
  const [read] = db.matching("SELECT b.cover_data");
  assert.match(read.sql, /b\.is_active = true AND b\.is_verified = true/);
});

test("the cover of a business that is not in the directory yet is private to its owner and the team", async () => {
  scriptedDb({ coOwnerId: coOwner.id, stored: pendingCover });
  await serve(async (origin) => {
    const visitor = await fetchCover(origin, FILE);
    assert.equal(visitor.status, 404);
    assert.ok(!visitor.bytes.includes(PNG));
    assert.deepEqual(JSON.parse(visitor.bytes.toString()), {
      success: false,
      message: "Cover photo not found",
    });

    const viaHeader = await fetchCover(origin, FILE, signIn(owner));
    assert.equal(viaHeader.status, 200);
    assert.deepEqual(viaHeader.bytes, PNG);
    assert.equal(viaHeader.headers.get("cache-control"), "private, no-store");

    // An <img> tag cannot send a header; it carries the sign-in cookie.
    const token = signIn(owner).Authorization.replace("Bearer ", "");
    const viaCookie = await fetchCover(origin, FILE, {
      Cookie: `auth_token=${token}`,
    });
    assert.equal(viaCookie.status, 200);
    assert.deepEqual(viaCookie.bytes, PNG);

    const coOwnerResponse = await fetchCover(origin, FILE, signIn(coOwner));
    assert.equal(coOwnerResponse.status, 200);
    assert.deepEqual(coOwnerResponse.bytes, PNG);

    const other = await fetchCover(origin, FILE, signIn(stranger));
    assert.equal(other.status, 404);
    assert.ok(!other.bytes.includes(PNG));

    for (const staff of [admin, moderator, superuser]) {
      const res = await fetchCover(origin, FILE, signIn(staff));
      assert.equal(res.status, 200, `${staff.role} can see it`);
      assert.deepEqual(res.bytes, PNG);
    }

    // A sign-in that is no longer valid is answered, not left hanging.
    const broken = await fetchCover(origin, FILE, {
      Cookie: "auth_token=expired",
    });
    assert.equal(broken.status, 401);
  });
});

test("a missing business, a business without a cover, or a non-numeric id is a plain 404", async () => {
  const scenario: Scenario = {};
  scriptedDb(scenario);
  await serve(async (origin) => {
    assert.equal((await fetchCover(origin, FILE)).status, 404);
    assert.equal(
      (await fetchCover(origin, "/api/business-cover/file/6")).status,
      404,
    );
    assert.equal(
      (await fetchCover(origin, "/api/business-cover/file/missing.png")).status,
      404,
    );

    scenario.stored = { ...publicCover, cover_data: null };
    assert.equal((await fetchCover(origin, FILE)).status, 404);

    scenario.stored = { ...pendingCover, cover_data: null };
    assert.equal((await fetchCover(origin, FILE, signIn(owner))).status, 404);
  });
});

test("a database failure while reading a cover answers 500 without leaking details", async () => {
  scriptedDb({ stored: publicCover, readFails: true });
  await serve(async (origin) => {
    const res = await call(origin, "GET", FILE);
    assert.equal(res.status, 500);
    assert.equal(res.body.message, "Cover photo unavailable");
    assert.ok(!res.text.includes("secret-db-host"));
  });
});
