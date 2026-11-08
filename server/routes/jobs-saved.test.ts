import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import { SAVED_JOBS_DDL } from "../utils/saved-jobs";
import jobsRouter from "./jobs";

// jobs.id is a UUID column
const JOB = "3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2c";
const OTHER_JOB = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const user = { id: 7, role: "user" };

// The saved_jobs table is created on first use and then remembered for the
// life of the process, so this has to outlive a single test.
let tableCreated = false;

function scriptedJobsDb(existingJobs: string[] = [JOB]) {
  return scriptPool((sql, params) => {
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS saved_jobs")) {
      tableCreated = true;
      return undefined;
    }
    if (!sql.startsWith("CREATE") && /\bsaved_jobs\b/.test(sql)) {
      assert.ok(tableCreated, `saved_jobs was used before it was created: ${sql}`);
    }
    if (sql.startsWith("SELECT 1 FROM jobs WHERE id = $1")) {
      return { rows: existingJobs.includes(String(params[0])) ? [{ one: 1 }] : [] };
    }
    if (sql.startsWith("SELECT status FROM jobs WHERE id = $1")) {
      return {
        rows: existingJobs.includes(String(params[0])) ? [{ status: "active" }] : [],
      };
    }
    if (sql.startsWith("SELECT job_id FROM saved_jobs WHERE user_id = $1")) {
      return {
        rows:
          params[0] === 7
            ? [{ job_id: JOB }, { job_id: OTHER_JOB }]
            : [{ job_id: OTHER_JOB }],
      };
    }
    if (sql.startsWith("INSERT INTO job_applications")) {
      return {
        rows: [{ id: "5d1c9e0a-7b3f-4c2d-9a8e-1f2b3c4d5e6f", status: "submitted" }],
      };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedJobsDb>;
const writes = (db: ScriptedDb) =>
  db.log.filter((entry) => /^(INSERT|DELETE|UPDATE)\b/.test(entry.sql));

test("saving, unsaving and listing need a signed-in user", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    assert.equal((await call(origin, "POST", `/${JOB}/save`)).status, 401);
    assert.equal((await call(origin, "POST", `/${JOB}/unsave`)).status, 401);
    assert.equal((await call(origin, "GET", "/saved")).status, 401);
  });
  assert.equal(db.log.length, 0, "nothing was read or written");
});

test("job ids are UUIDs: any other shape is a 404 before a query runs", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    for (const id of ["1", "42", "abc", "x' OR '1'='1"]) {
      for (const action of ["save", "unsave"]) {
        const res = await call(origin, "POST", `/${encodeURIComponent(id)}/${action}`, {
          headers: signIn(user),
        });
        assert.equal(res.status, 404, `${action} ${id}`);
      }
    }
  });
  assert.equal(db.log.length, 0);
});

test("saving stores the job for the signed-in user, whatever the body claims", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await call(origin, "POST", `/${JOB}/save`, {
        headers: signIn(user),
        body: { userId: 99, user_id: 99 },
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.success, true);
      assert.equal(res.body.jobId, JOB);
    }
  });

  const inserts = db.matching("INSERT INTO saved_jobs");
  assert.equal(inserts.length, 2);
  for (const insert of inserts) {
    assert.deepEqual(insert.params, [7, JOB]);
    assert.match(insert.sql, /ON CONFLICT \(user_id, job_id\) DO NOTHING/);
  }
});

test("saving a job that does not exist is a 404 and stores nothing", async () => {
  const db = scriptedJobsDb([]);
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/save`, { headers: signIn(user) });
    assert.equal(res.status, 404);
  });
  assert.equal(writes(db).length, 0);
});

test("unsaving removes only the signed-in user's own row", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/unsave`, {
      headers: signIn(user),
      body: { userId: 99 },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.jobId, JOB);
  });
  const [removal] = db.matching("DELETE FROM saved_jobs");
  assert.match(removal.sql, /WHERE user_id = \$1 AND job_id = \$2$/);
  assert.deepEqual(removal.params, [7, JOB]);
});

test("the saved list is the signed-in user's own jobs", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    const mine = await call(origin, "GET", "/saved", { headers: signIn(user) });
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.deepEqual(mine.body.jobIds, [JOB, OTHER_JOB]);

    const theirs = await call(origin, "GET", "/saved", {
      headers: signIn({ id: 8, role: "user" }),
    });
    assert.deepEqual(theirs.body.jobIds, [OTHER_JOB]);
  });
  const reads = db.matching("FROM saved_jobs");
  assert.deepEqual(reads.map((read) => read.params), [[7], [8]]);
});

test("the table holds one row per user and job and goes away with either", () => {
  const ddl = SAVED_JOBS_DDL.join("\n").replace(/\s+/g, " ");
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS saved_jobs/);
  assert.match(ddl, /user_id INTEGER NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(ddl, /job_id UUID NOT NULL REFERENCES jobs\(id\) ON DELETE CASCADE/);
  assert.match(
    ddl,
    /CREATE UNIQUE INDEX IF NOT EXISTS saved_jobs_user_job_key ON saved_jobs \(user_id, job_id\)/,
  );
});

test("apply and applicants work with real (UUID) job ids", async () => {
  const db = scriptedJobsDb();
  await withRouter(jobsRouter, async (origin) => {
    const applied = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(user),
      body: { applicant_email: "candidate@example.com" },
    });
    assert.equal(applied.status, 200, JSON.stringify(applied.body));
    assert.equal(db.matching("INSERT INTO job_applications")[0].params[0], JOB);

    // The owner check may refuse this user, but the request must get that far
    // instead of being turned away as "Not found" for its id.
    await call(origin, "GET", `/${JOB}/applications`, { headers: signIn(user) });
    assert.ok(
      db.log.some(
        (entry) => entry.sql.includes("FROM jobs j") && entry.params.includes(JOB),
      ),
      "the applicants lookup ran for the UUID",
    );
  });
});
