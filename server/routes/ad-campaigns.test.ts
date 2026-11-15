import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptExecute,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import adCampaignsRouter from "./ad-campaigns";

test("campaign feed requires authentication and scopes a business owner to owned businesses", async () => {
  const queries = scriptExecute(() => ({
    rows: [
      {
        id: "b5dc1661-dffe-436b-b343-10b611118276",
        name: "Owner campaign",
        budget: "25.00",
        status: "draft",
        business_id: 12,
        business_name: "Owner business",
        country_code: "CA",
      },
    ],
  }));

  await withRouter(adCampaignsRouter, async (origin) => {
    assert.equal((await call(origin, "GET", "/")).status, 401);

    const owner = await call(origin, "GET", "/?countryCode=CA", {
      headers: signIn({ id: 44, role: "business_owner" }),
    });
    assert.equal(owner.status, 200, owner.text);
    assert.equal(owner.body.data[0].business_name, "Owner business");
  });

  assert.equal(queries.log.length, 1);
  assert.match(queries.log[0].sql, /b\.owner_id = \$2/);
  assert.deepEqual(queries.log[0].params, ["CA", 44, 50]);
});

test("campaign feed lets an admin read across businesses without an owner filter", async () => {
  const queries = scriptExecute(() => ({ rows: [] }));

  await withRouter(adCampaignsRouter, async (origin) => {
    const admin = await call(origin, "GET", "/", {
      headers: signIn({ id: 1, role: "admin" }),
    });
    assert.equal(admin.status, 200, admin.text);
  });

  assert.equal(queries.log.length, 1);
  assert.doesNotMatch(queries.log[0].sql, /owner_id/);
  assert.deepEqual(queries.log[0].params, [50]);
});
