import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { Router } from "express";
import { call, scriptPool, withRouter } from "../test-support/route-harness";
import { withSavedJobsTable } from "./saved-jobs";

test("a table that cannot be created is a contained 500, and the next request tries again", async () => {
  mock.method(console, "error", () => undefined);
  let failuresLeft = 1;
  const db = scriptPool((sql) => {
    if (sql.startsWith("CREATE TABLE") && failuresLeft-- > 0) {
      throw new Error("permission denied for schema public");
    }
    return undefined;
  });
  const router = Router();
  router.get("/probe", withSavedJobsTable, (_req, res) => {
    res.json({ reached: true });
  });

  await withRouter(router, async (origin) => {
    const failed = await call(origin, "GET", "/probe");
    assert.equal(failed.status, 500);
    assert.deepEqual(failed.body, {
      success: false,
      error: "Saved jobs are unavailable right now",
    });

    const retried = await call(origin, "GET", "/probe");
    assert.equal(retried.status, 200);
    assert.deepEqual(retried.body, { reached: true });

    assert.equal((await call(origin, "GET", "/probe")).status, 200);
  });

  assert.equal(
    db.matching("CREATE TABLE").length,
    2,
    "one failed attempt, one that worked, and none once it was remembered",
  );
  assert.equal(db.matching("CREATE UNIQUE INDEX").length, 1);
});
