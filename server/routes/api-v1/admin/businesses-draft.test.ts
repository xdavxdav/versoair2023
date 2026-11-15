import assert from "node:assert/strict";
import test, { beforeEach, mock } from "node:test";
import {
  call,
  db,
  scriptPool,
  signIn,
  withRouter,
} from "../../test-support/route-harness";
import businessesAdminRouter from "./businesses";

const admin = { id: 1, role: "admin" };
const superuser = { id: 2, role: "superuser" };
const moderator = { id: 3, role: "moderator" };
const user = { id: 4, role: "user" };

beforeEach(() => {
  // Mock audit log insertion (best-effort)
  mock.method(db, "insert", (() => ({
    values: async () => undefined,
  })) as never);
});

interface DraftScenario {
  /** Category exists */
  categoryExists?: boolean;
}

function scriptedDb(scenario: DraftScenario = { categoryExists: true }) {
  return scriptPool((sql) => {
    // Category lookup
    if (sql.includes("SELECT") && sql.includes("FROM business_categories")) {
      return scenario.categoryExists
        ? { rows: [{ id: 1, name: "Restaurants & Cafes", slug: "restaurants" }] }
        : { rows: [] };
    }
    // Insert draft business
    if (sql.includes("INSERT INTO businesses")) {
      return {
        rows: [
          {
            id: 999,
            name: "Laurn's Plate",
            category_id: 1,
            description: null,
            country_code: "CA",
            is_active: false,
            approval_status: "pending",
            verification_status: "unverified",
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    return undefined;
  });
}

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(businessesAdminRouter, fn);

test("POST /draft: admin can create a draft business (inactive, pending, unverified)", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          description: "A nice restaurant",
          countryCode: "CA",
        },
      },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, "Laurn's Plate");
    assert.equal(res.body.data.isActive, false, "draft must be inactive");
    assert.equal(res.body.data.approvalStatus, "pending", "draft must be pending");
    assert.equal(
      res.body.data.verificationStatus,
      "unverified",
      "draft must be unverified"
    );
    assert.match(
      res.body.metadata.note,
      /not visible to the public/,
      "response includes visibility note"
    );
  });
});

test("POST /draft: missing required fields (name or categoryId) returns 400", async () => {
  await serve(async (origin) => {
    // Missing name
    const res1 = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          categoryId: 1,
          countryCode: "CA",
        },
      },
    );
    assert.equal(res1.status, 400);
    assert.match(res1.body.error.message, /name.*categoryId.*required/i);

    // Missing categoryId
    const res2 = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          name: "Laurn's Plate",
          countryCode: "CA",
        },
      },
    );
    assert.equal(res2.status, 400);
    assert.match(res2.body.error.message, /name.*categoryId.*required/i);
  });
});

test("POST /draft: invalid categoryId returns 404", async () => {
  const database = scriptedDb({ categoryExists: false });
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          name: "Laurn's Plate",
          categoryId: 9999, // does not exist
          countryCode: "CA",
        },
      },
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "CATEGORY_NOT_FOUND");
  });
});

test("POST /draft: non-admin users cannot create draft (401)", async () => {
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(user),
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          countryCode: "CA",
        },
      },
    );
    assert.equal(res.status, 401);
  });
});

test("POST /draft: unauthenticated request returns 401", async () => {
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: {}, // no auth
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          countryCode: "CA",
        },
      },
    );
    assert.equal(res.status, 401);
  });
});

test("POST /draft: countryCode is normalized to uppercase", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          countryCode: "ca", // lowercase
        },
      },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.data.countryCode, "CA", "country code is uppercase");
  });
});

test("POST /draft: description and countryCode are optional", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(admin),
        body: {
          name: "Minimal Business",
          categoryId: 1,
          // no description, no countryCode
        },
      },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });
});

test("POST /draft: superuser can also create draft", async () => {
  const database = scriptedDb();
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(superuser),
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          countryCode: "CA",
        },
      },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });
});

test("POST /draft: moderator cannot create draft (only admin/superuser)", async () => {
  await serve(async (origin) => {
    const res = await call(
      origin,
      "POST",
      "/draft",
      {
        headers: signIn(moderator),
        body: {
          name: "Laurn's Plate",
          categoryId: 1,
          countryCode: "CA",
        },
      },
    );

    assert.equal(res.status, 401);
  });
});
