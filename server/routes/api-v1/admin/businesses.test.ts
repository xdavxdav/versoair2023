import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { auditLogs, businesses } from "../../../../shared/schema";
import {
  call,
  db,
  setTableRows,
  signIn,
  withRouter,
} from "../../../test-support/route-harness";
import businessesRouter from "./businesses";

const business = {
  id: 12,
  name: "Test business",
  categoryId: 1,
  description: null,
  email: "contact@example.test",
  phone: null,
  location: "Toronto, CA",
  address: null,
  countryCode: "CA",
  cityName: "Toronto",
  latitude: null,
  longitude: null,
  website: null,
  isVerified: false,
  isAdvertiser: false,
  isActive: true,
  rating: "0",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function recordBusinessWrites() {
  setTableRows(businesses, [business]);
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  mock.method(db, "update", ((table: unknown) => ({
    set(values: Record<string, unknown>) {
      assert.equal(table, businesses);
      updates.push(values);
      return {
        where: () => ({
          returning: async () => [{ ...business, ...values }],
        }),
      };
    },
  })) as never);
  mock.method(db, "insert", ((table: unknown) => ({
    values(values: Record<string, unknown>) {
      audits.push({ table, values });
      return Promise.resolve();
    },
  })) as never);

  return { updates, audits };
}

test("admin can verify a business through PUT and the change is audited", async () => {
  const { updates, audits } = recordBusinessWrites();

  await withRouter(businessesRouter, async (origin) => {
    const response = await call(origin, "PUT", "/12", {
      headers: signIn({ id: 1, role: "admin" }),
      body: { isVerified: true },
    });

    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.data.isVerified, true);
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].isVerified, true);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].table, auditLogs);
  assert.deepEqual(audits[0].values.changes, {
    isVerified: { from: false, to: true },
  });
});

test("non-admins cannot change business verification", async () => {
  const { updates, audits } = recordBusinessWrites();

  await withRouter(businessesRouter, async (origin) => {
    const response = await call(origin, "PUT", "/12", {
      headers: signIn({ id: 2, role: "business_owner" }),
      body: { isVerified: true },
    });

    assert.equal(response.status, 403, response.text);
  });

  assert.equal(updates.length, 0);
  assert.equal(audits.length, 0);
});

test("verification updates reject non-boolean values", async () => {
  const { updates, audits } = recordBusinessWrites();

  await withRouter(businessesRouter, async (origin) => {
    const response = await call(origin, "PUT", "/12", {
      headers: signIn({ id: 1, role: "admin" }),
      body: { isVerified: "true" },
    });

    assert.equal(response.status, 400, response.text);
    assert.equal(response.body.error.message, "isVerified must be a boolean");
  });

  assert.equal(updates.length, 0);
  assert.equal(audits.length, 0);
});
