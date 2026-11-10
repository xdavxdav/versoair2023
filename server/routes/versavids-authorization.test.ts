import assert from "node:assert/strict";
import test, { mock } from "node:test";
import {
  call,
  db,
  scriptExecute,
  signIn,
  withRouter,
} from "../test-support/route-harness";

// The router creates its tables as soon as it is imported; keep that off the wire.
const importGuard = mock.method(db, "execute", (async () => ({ rows: [] })) as never);
const versavidsRouter = (await import("./versavids")).default;
importGuard.mock.restore();

const client = { id: 5, role: "customer" };
const videaste = { id: 9, role: "customer" };
const stranger = { id: 6, role: "customer" };
const admin = { id: 1, role: "admin" };

function scriptedVersaVidsDb() {
  // client 5 owns every project; videaste 9 holds 1; project 2 is still open.
  const projects: Record<number, { client_id: number; claimed_by: number | null; status: string }> = {
    1: { client_id: 5, claimed_by: 9, status: "in_progress" },
    2: { client_id: 5, claimed_by: null, status: "open" },
  };
  const deliverables: Record<number, { project_id: number; client_id: number; claimed_by: number }> = {
    40: { project_id: 1, client_id: 5, claimed_by: 9 },
  };
  return scriptExecute((sql, params) => {
    if (
      sql.startsWith("SELECT client_id, status, claimed_by FROM video_projects WHERE id = $1") ||
      sql.startsWith("SELECT client_id, claimed_by FROM video_projects WHERE id = $1")
    ) {
      const project = projects[Number(params[0])];
      return { rows: project ? [project] : [] };
    }
    if (sql.startsWith("UPDATE video_projects SET claimed_by = $1")) {
      const project = projects[Number(params[1])];
      if (project?.status !== "open") return { rows: [] };
      project.status = "claimed";
      project.claimed_by = Number(params[0]);
      return { rows: [{ id: params[1] }] };
    }
    if (sql.startsWith("SELECT vd.project_id, vp.client_id, vp.claimed_by FROM video_deliverables vd")) {
      const deliverable = deliverables[Number(params[0])];
      return { rows: deliverable ? [deliverable] : [] };
    }
    if (sql.startsWith("INSERT INTO video_briefs")) return { rows: [{ id: 1 }] };
    if (sql.startsWith("INSERT INTO video_deliverables")) return { rows: [{ id: 41 }] };
    // Only videaste 9 has an artist profile.
    if (sql.startsWith("SELECT id FROM artist_profiles WHERE user_id = $1")) {
      return { rows: Number(params[0]) === 9 ? [{ id: 90 }] : [] };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedVersaVidsDb>;
const changes = (db: ScriptedDb) => db.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const patchProject = (origin: string, account: typeof client, id: string | number, body: unknown) =>
  call(origin, "PATCH", `/projects/${id}`, { headers: signIn(account), body });

test("project status can be changed by the client, the assigned videaste and staff only", async () => {
  const db = scriptedVersaVidsDb();
  await withRouter(versavidsRouter, async (origin) => {
    assert.equal((await call(origin, "PATCH", "/projects/1", { body: { status: "review" } })).status, 401);
    assert.equal((await patchProject(origin, client, "abc", { status: "review" })).status, 404);
    assert.equal((await patchProject(origin, client, 99, { status: "review" })).status, 404);

    const refused = await patchProject(origin, stranger, 1, { status: "completed" });
    assert.equal(refused.status, 403);
    assert.equal(changes(db).length, 0);

    // The session id is the string "5"; the column is the number 5. It must still match.
    const byClient = await patchProject(origin, client, 1, { status: "review" });
    assert.equal(byClient.status, 200, JSON.stringify(byClient.body));
    assert.deepEqual(db.matching("UPDATE video_projects SET status = $1")[0].params, ["review", 1]);

    const byVideaste = await patchProject(origin, videaste, 1, { status: "completed" });
    assert.equal(byVideaste.status, 200);
    assert.equal(db.matching("SET status = 'completed'").length, 1);

    assert.equal((await patchProject(origin, admin, 1, { status: "cancelled" })).status, 200);
  });
});

test("project status cannot be set to claim-only or unknown values", async () => {
  const db = scriptedVersaVidsDb();
  await withRouter(versavidsRouter, async (origin) => {
    for (const status of ["open", "claimed", "approved", "'; DROP TABLE video_projects; --"]) {
      const res = await patchProject(origin, client, 1, { status });
      assert.equal(res.status, 400, status);
    }
  });
  assert.equal(changes(db).length, 0);
});

test("an open project can be claimed once", async () => {
  const db = scriptedVersaVidsDb();
  await withRouter(versavidsRouter, async (origin) => {
    const first = await patchProject(origin, videaste, 2, { claimed_by: true });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const claim = db.matching("UPDATE video_projects SET claimed_by = $1")[0];
    assert.match(claim.sql, /WHERE id = \$2 AND status = 'open' RETURNING id/);
    assert.deepEqual(claim.params, [9, 2]);

    // Once it is claimed, anyone asking for it again is told it is gone (409),
    // which the board shows as "someone else took it", not as a permission error.
    const second = await patchProject(origin, stranger, 2, { claimed_by: true });
    assert.equal(second.status, 409);
    assert.equal(second.body?.error, "Project is no longer open");
  });
});

test("losing a claim race is a 409, not a silent overwrite", async () => {
  const db = scriptExecute((sql) => {
    if (sql.startsWith("SELECT client_id, status, claimed_by FROM video_projects")) {
      return { rows: [{ client_id: 5, claimed_by: null, status: "open" }] };
    }
    if (sql.startsWith("SELECT id FROM artist_profiles WHERE user_id = $1")) {
      return { rows: [{ id: 90 }] };
    }
    // Somebody else claimed it between the read and the guarded update.
    return { rows: [] };
  });
  await withRouter(versavidsRouter, async (origin) => {
    const res = await patchProject(origin, videaste, 2, { claimed_by: true });
    assert.equal(res.status, 409);
    assert.equal(res.body?.error, "Project is no longer open");
  });
  assert.equal(db.matching("UPDATE video_projects SET status").length, 0);
});

test("only the project client or staff may write a brief", async () => {
  const db = scriptedVersaVidsDb();
  const brief = (origin: string, account: typeof client, body: unknown) =>
    call(origin, "POST", "/briefs", { headers: signIn(account), body });

  await withRouter(versavidsRouter, async (origin) => {
    assert.equal((await call(origin, "POST", "/briefs", { body: { project_id: 1 } })).status, 401);
    for (const project_id of [undefined, "abc", true, 0, -1, "1; DROP TABLE x"]) {
      assert.equal((await brief(origin, client, { project_id })).status, 400, String(project_id));
    }
    assert.equal((await brief(origin, client, { project_id: 99 })).status, 404);
    assert.equal((await brief(origin, stranger, { project_id: 1 })).status, 403);
    assert.equal((await brief(origin, videaste, { project_id: 1 })).status, 403);
    assert.equal(changes(db).length, 0);

    assert.equal((await brief(origin, client, { project_id: "1", visual_style: "cinematic" })).status, 201);
    assert.equal((await brief(origin, admin, { project_id: 1 })).status, 201);
    assert.equal(db.matching("INSERT INTO video_briefs").length, 2);
  });
});

test("only the assigned videaste or staff may upload a deliverable", async () => {
  const db = scriptedVersaVidsDb();
  const upload = (origin: string, account: typeof client, body: unknown) =>
    call(origin, "POST", "/deliverables", { headers: signIn(account), body });
  const work = { project_id: 1, title: "Final cut", file_url: "https://cdn.example.com/cut.mp4" };

  await withRouter(versavidsRouter, async (origin) => {
    assert.equal((await call(origin, "POST", "/deliverables", { body: work })).status, 401);
    assert.equal((await upload(origin, videaste, { ...work, project_id: "abc" })).status, 400);
    assert.equal((await upload(origin, videaste, { ...work, title: "" })).status, 400);
    assert.equal((await upload(origin, videaste, { ...work, project_id: 99 })).status, 404);
    assert.equal((await upload(origin, stranger, work)).status, 403);
    // The client is not the person delivering the work.
    assert.equal((await upload(origin, client, work)).status, 403);
    assert.equal(changes(db).length, 0);

    assert.equal((await upload(origin, videaste, work)).status, 201);
    assert.equal(db.matching("INSERT INTO video_deliverables").length, 1);
    assert.equal(db.matching("UPDATE video_projects SET status = 'review'").length, 1);
    assert.equal((await upload(origin, admin, work)).status, 201);
  });
});

test("only the project client or staff may approve a deliverable or ask for changes", async () => {
  const db = scriptedVersaVidsDb();
  const review = (origin: string, account: typeof client, id: string | number, body: unknown) =>
    call(origin, "PATCH", `/deliverables/${id}`, { headers: signIn(account), body });

  await withRouter(versavidsRouter, async (origin) => {
    assert.equal((await call(origin, "PATCH", "/deliverables/40", { body: { status: "approved" } })).status, 401);
    assert.equal((await review(origin, client, "abc", { status: "approved" })).status, 404);
    assert.equal((await review(origin, client, 99, { status: "approved" })).status, 404);

    // A stranger, and the videaste approving their own work, are refused.
    assert.equal((await review(origin, stranger, 40, { status: "approved" })).status, 403);
    assert.equal((await review(origin, videaste, 40, { status: "approved" })).status, 403);
    assert.equal(changes(db).length, 0);

    // The client must pick a real decision.
    assert.equal((await review(origin, client, 40, { status: "pending" })).status, 400);
    assert.equal((await review(origin, client, 40, {})).status, 400);
    assert.equal(changes(db).length, 0);

    assert.equal((await review(origin, client, 40, { status: "approved" })).status, 200);
    const completed = db.matching("UPDATE video_projects SET status = 'completed'");
    assert.equal(completed.length, 1);
    assert.deepEqual(completed[0].params, [1], "the project comes from the loaded deliverable, not the request");

    const revision = await review(origin, client, 40, {
      status: "revision_requested",
      client_feedback: "Shorter intro",
    });
    assert.equal(revision.status, 200);
    assert.equal(db.matching("INSERT INTO video_revisions").length, 1);
    assert.equal(db.matching("UPDATE video_projects SET status = 'revision'").length, 1);

    assert.equal((await review(origin, admin, 40, { status: "approved" })).status, 200);
  });
});
