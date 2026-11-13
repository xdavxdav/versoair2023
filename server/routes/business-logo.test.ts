import assert from "node:assert/strict";
import test, { afterEach, beforeEach, mock } from "node:test";
import cookieParser from "cookie-parser";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import logoRouter from "./business-logo";

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
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);

const previousFlag = process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
beforeEach(() => {
  delete process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
});
afterEach(() => {
  if (previousFlag === undefined)
    delete process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED;
  else process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = previousFlag;
});

interface StoredLogo {
  logo_data: Buffer | null;
  logo_mime: string | null;
  owner_id: number;
  is_public: boolean | null;
}

interface Scenario {
  /** Who owns the business. */
  ownerId?: number;
  coOwnerId?: number;
  userTier?: string;
  bizTier?: string;
  /** The row behind GET /file/:id; undefined: no such business. */
  stored?: StoredLogo;
  readFails?: boolean;
}

function scriptedDb(scenario: Scenario = {}) {
  return scriptPool((sql, params) => {
    const ownsIt = () =>
      String(params[0]) === String(BUSINESS) &&
      [scenario.ownerId ?? owner.id, scenario.coOwnerId].some(
        (id) => id != null && String(params[1]) === String(id),
      );

    if (sql.startsWith("SELECT b.id, b.tier, b.name, u.subscription_tier")) {
      return {
        rows: ownsIt()
          ? [
              {
                id: BUSINESS,
                name: "Chez Ada",
                tier: scenario.bizTier ?? "free",
                subscription_tier: scenario.userTier ?? "free",
              },
            ]
          : [],
      };
    }
    if (sql === "SELECT logo_url FROM businesses WHERE id = $1") {
      return { rows: [{ logo_url: "/api/business-logo/file/5?v=1" }] };
    }
    if (sql.startsWith("SELECT logo_url FROM businesses b")) {
      return {
        rows: ownsIt() ? [{ logo_url: "/api/business-logo/file/5?v=1" }] : [],
      };
    }
    if (sql.startsWith("SELECT b.logo_data, b.logo_mime, b.owner_id,")) {
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
  withRouter(logoRouter, fn, {
    path: "/api/business-logo",
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

function logoForm(
  file?: { name: string; type: string; content: Buffer },
  fields: Record<string, string> = { businessId: String(BUSINESS) },
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (file) {
    form.append(
      "logo",
      new Blob([new Uint8Array(file.content)], { type: file.type }),
      file.name,
    );
  }
  return form;
}

const png = { name: "logo.png", type: "image/png", content: PNG };
const UPLOAD = "/api/business-logo/upload";

async function fetchLogo(
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

const FILE = `/api/business-logo/file/${BUSINESS}`;
const publicLogo: StoredLogo = {
  logo_data: PNG,
  logo_mime: "image/png",
  owner_id: owner.id,
  is_public: true,
};
const pendingLogo: StoredLogo = { ...publicLogo, is_public: false };

test("uploading or removing a logo needs a signed-in user", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const upload = await postForm(origin, UPLOAD, logoForm(png));
    assert.equal(upload.status, 401);
    const removal = await call(
      origin,
      "DELETE",
      `/api/business-logo/${BUSINESS}`,
    );
    assert.equal(removal.status, 401);
  });
  assert.deepEqual(writes(db), []);
});

test("a free-tier owner can upload a logo while subscriptions are not on sale", async () => {
  const db = scriptedDb();
  let logoUrl = "";
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, logoForm(png), signIn(owner));
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    logoUrl = res.body.logoUrl;
  });
  assert.match(logoUrl, /^\/api\/business-logo\/file\/5\?v=\d+$/);

  const [update, ...others] = writes(db);
  assert.equal(others.length, 0);
  assert.ok(update.sql.startsWith("UPDATE businesses SET logo_url = $1"));
  assert.equal(update.params[0], logoUrl);
  assert.deepEqual(update.params[1], PNG);
  assert.equal(update.params[2], "image/png");
  assert.equal(String(update.params[3]), String(BUSINESS));
});

test("an accepted co-owner can upload a logo", async () => {
  const db = scriptedDb({ coOwnerId: coOwner.id });
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, logoForm(png), signIn(coOwner));
    assert.equal(res.status, 200);
  });
  assert.equal(writes(db).length, 1);
});

test("when subscriptions are on sale a free-tier owner is asked to upgrade", async () => {
  process.env.COMMERCIAL_SUBSCRIPTIONS_ENABLED = "true";
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, logoForm(png), signIn(owner));
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
      logoForm(png),
      signIn(owner),
    );
    assert.equal(viaBusiness.status, 200);

    scenario.bizTier = "free";
    scenario.userTier = "max";
    const viaOwner = await postForm(
      origin,
      UPLOAD,
      logoForm(png),
      signIn(owner),
    );
    assert.equal(viaOwner.status, 200);
  });
  assert.equal(writes(db).length, 2);
});

test("only the owner of the business can change its logo", async () => {
  const db = scriptedDb({ ownerId: 99 });
  await serve(async (origin) => {
    const res = await postForm(origin, UPLOAD, logoForm(png), signIn(owner));
    assert.equal(res.status, 403);
    assert.match(res.body.message, /don't own/i);

    const removal = await call(
      origin,
      "DELETE",
      `/api/business-logo/${BUSINESS}`,
      {
        headers: signIn(owner),
      },
    );
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
      logoForm({
        name: "notes.txt",
        type: "text/plain",
        content: Buffer.from("hi"),
      }),
      headers,
    );
    assert.equal(text.status, 400);
    assert.match(text.body.message, /Invalid file type/);

    // An allowed type under a script-looking name is refused as well.
    const html = await postForm(
      origin,
      UPLOAD,
      logoForm({ name: "logo.html", type: "image/png", content: PNG }),
      headers,
    );
    assert.equal(html.status, 400);

    const tooBig = await postForm(
      origin,
      UPLOAD,
      logoForm({ ...png, content: Buffer.alloc(5 * 1024 * 1024 + 1) }),
      headers,
    );
    assert.equal(tooBig.status, 413);
    assert.match(tooBig.body.message, /5 MB/);

    const noFile = await postForm(origin, UPLOAD, logoForm(undefined), headers);
    assert.equal(noFile.status, 400);
    assert.match(noFile.body.message, /No logo file/);

    const noBusiness = await postForm(
      origin,
      UPLOAD,
      logoForm(png, {}),
      headers,
    );
    assert.equal(noBusiness.status, 400);
    assert.match(noBusiness.body.message, /businessId is required/);
  });
  assert.deepEqual(writes(db), []);
});

test("SVG logos are accepted", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await postForm(
      origin,
      UPLOAD,
      logoForm({ name: "logo.svg", type: "image/svg+xml", content: SVG }),
      signIn(owner),
    );
    assert.equal(res.status, 200);
  });
  assert.equal(writes(db)[0].params[2], "image/svg+xml");
});

test("every upload gets a new address, so a replaced logo is not stuck in the cache", async () => {
  scriptedDb();
  const urls: string[] = [];
  await serve(async (origin) => {
    const headers = signIn(owner);
    const start = Date.now();
    for (const at of [start, start + 5000]) {
      const clock = mock.method(Date, "now", () => at);
      try {
        const res = await postForm(origin, UPLOAD, logoForm(png), headers);
        assert.equal(res.status, 200);
        urls.push(res.body.logoUrl);
      } finally {
        clock.mock.restore();
      }
    }
    assert.deepEqual(urls, [`${FILE}?v=${start}`, `${FILE}?v=${start + 5000}`]);
  });
  assert.notEqual(urls[0], urls[1]);
});

test("removing a logo clears every stored column", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await call(origin, "DELETE", `/api/business-logo/${BUSINESS}`, {
      headers: signIn(owner),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
  const [update, ...others] = writes(db);
  assert.equal(others.length, 0);
  assert.match(
    update.sql,
    /^UPDATE businesses SET logo_url = NULL, logo_data = NULL, logo_mime = NULL WHERE id = \$1$/,
  );
  assert.equal(String(update.params[0]), String(BUSINESS));
});

test("a logo of a business in the directory is shown to every visitor", async () => {
  const db = scriptedDb({ stored: publicLogo });
  await serve(async (origin) => {
    const visitor = await fetchLogo(origin, FILE);
    assert.equal(visitor.status, 200);
    assert.deepEqual(visitor.bytes, PNG);
    assert.equal(visitor.headers.get("content-type"), "image/png");
    assert.equal(visitor.headers.get("cache-control"), "public, max-age=86400");
    assert.equal(visitor.headers.get("x-content-type-options"), "nosniff");

    // The cache-busting suffix is not part of the route.
    const versioned = await fetchLogo(origin, `${FILE}?v=1700000000000`);
    assert.equal(versioned.status, 200);
    assert.deepEqual(versioned.bytes, PNG);

    // A stale or broken sign-in must not hide a public logo.
    const stale = await fetchLogo(origin, FILE, {
      Authorization: "Bearer not-a-real-token",
      Cookie: "auth_token=expired",
    });
    assert.equal(stale.status, 200);
    assert.deepEqual(stale.bytes, PNG);
  });
  // The directory rule is decided in SQL, from the same helper as the directory.
  const [read] = db.matching("SELECT b.logo_data");
  assert.match(read.sql, /b\.is_active = true AND b\.is_verified = true/);
  assert.match(read.sql, /\) AS is_public FROM businesses b WHERE b\.id = \$1/);
});

test("the logo of a business that is not in the directory yet is private to its owner and the team", async () => {
  scriptedDb({ coOwnerId: coOwner.id, stored: pendingLogo });
  await serve(async (origin) => {
    // A visitor learns nothing: same answer as for a logo that does not exist.
    const visitor = await fetchLogo(origin, FILE);
    assert.equal(visitor.status, 404);
    assert.ok(!visitor.bytes.includes(PNG));
    assert.deepEqual(JSON.parse(visitor.bytes.toString()), {
      success: false,
      message: "Logo not found",
    });

    const viaHeader = await fetchLogo(origin, FILE, signIn(owner));
    assert.equal(viaHeader.status, 200);
    assert.deepEqual(viaHeader.bytes, PNG);
    assert.equal(viaHeader.headers.get("cache-control"), "private, no-store");

    // An <img> tag cannot send a header; it carries the sign-in cookie.
    const token = signIn(owner).Authorization.replace("Bearer ", "");
    const viaCookie = await fetchLogo(origin, FILE, {
      Cookie: `auth_token=${token}`,
    });
    assert.equal(viaCookie.status, 200);
    assert.deepEqual(viaCookie.bytes, PNG);

    const coOwnerResponse = await fetchLogo(origin, FILE, signIn(coOwner));
    assert.equal(coOwnerResponse.status, 200);
    assert.deepEqual(coOwnerResponse.bytes, PNG);

    const other = await fetchLogo(origin, FILE, signIn(stranger));
    assert.equal(other.status, 404);
    assert.ok(!other.bytes.includes(PNG));

    for (const staff of [admin, moderator, superuser]) {
      const res = await fetchLogo(origin, FILE, signIn(staff));
      assert.equal(res.status, 200, `${staff.role} can see it`);
      assert.deepEqual(res.bytes, PNG);
    }

    // A token that is no longer valid is answered, not left hanging.
    const broken = await fetchLogo(origin, FILE, {
      Authorization: "Bearer not-a-real-token",
    });
    assert.equal(broken.status, 401);
  });
});

test("a missing business or a business without a logo is a plain 404", async () => {
  const scenario: Scenario = {};
  scriptedDb(scenario);
  await serve(async (origin) => {
    assert.equal((await fetchLogo(origin, FILE)).status, 404);
    assert.equal(
      (await fetchLogo(origin, "/api/business-logo/file/6")).status,
      404,
    );

    scenario.stored = { ...publicLogo, logo_data: null };
    assert.equal((await fetchLogo(origin, FILE)).status, 404);

    scenario.stored = { ...pendingLogo, logo_data: null };
    assert.equal((await fetchLogo(origin, FILE, signIn(owner))).status, 404);
  });
});

test("an SVG logo is served as an image that cannot run scripts", async () => {
  scriptedDb({
    stored: { ...publicLogo, logo_data: SVG, logo_mime: "image/svg+xml" },
  });
  await serve(async (origin) => {
    const res = await fetchLogo(origin, FILE);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^image\/svg\+xml/);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    const policy = res.headers.get("content-security-policy") ?? "";
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /\bsandbox\b/);
  });
});

test("a database failure while reading a logo answers 500 without leaking details", async () => {
  scriptedDb({ stored: publicLogo, readFails: true });
  await serve(async (origin) => {
    const res = await call(origin, "GET", FILE);
    assert.equal(res.status, 500);
    assert.equal(res.body.message, "Logo unavailable");
    assert.ok(!res.text.includes("secret-db-host"));
  });
});

test("legacy logo file names are still sanitised", async () => {
  scriptedDb();
  await serve(async (origin) => {
    const missing = await call(
      origin,
      "GET",
      "/api/business-logo/file/missing-logo.png",
    );
    assert.equal(missing.status, 404);
    const unsafe = await call(origin, "GET", "/api/business-logo/file/a%2Fb");
    assert.equal(unsafe.status, 400);
  });
});
