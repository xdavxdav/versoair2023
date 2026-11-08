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
const importGuard = mock.method(db, "execute", (async () => ({
  rows: [],
})) as never);
const versavidsRouter = (await import("./versavids")).default;
importGuard.mock.restore();

const client = { id: 5, role: "customer" };
const artist = { id: 9, role: "customer" };
const stranger = { id: 6, role: "customer" };
const admin = { id: 1, role: "admin" };

// Users 5 (the client) and 9 hold an artist profile; 6 does not.
const ARTISTS = new Set([5, 9]);

interface World {
  status: string;
  claimed_by: number | null;
}

function scriptedWorld(world: World) {
  return scriptExecute((sql, params) => {
    if (
      sql.startsWith("SELECT client_id, status, claimed_by FROM video_projects")
    ) {
      return { rows: [{ client_id: 5, ...world }] };
    }
    if (sql.startsWith("SELECT id FROM artist_profiles WHERE user_id = $1")) {
      return { rows: ARTISTS.has(Number(params[0])) ? [{ id: 90 }] : [] };
    }
    if (sql.startsWith("UPDATE video_projects SET claimed_by = $1")) {
      if (world.status !== "open") return { rows: [] };
      world.status = "claimed";
      world.claimed_by = Number(params[0]);
      return { rows: [{ id: params[1] }] };
    }
    if (sql.startsWith("INSERT INTO video_deliverables")) {
      return { rows: [{ id: 41 }] };
    }
    if (sql.startsWith("SELECT vp.*, u.display_name as client_name")) {
      return {
        rows: [
          {
            id: 1,
            title: "Music video",
            client_id: 5,
            ...world,
            client_name: "Casey",
            client_email: "casey@example.com",
            videaste_name: "Vee",
          },
        ],
      };
    }
    if (sql.startsWith("SELECT * FROM video_briefs")) {
      return { rows: [{ aspect_ratio: "16:9", resolution: "4k" }] };
    }
    if (sql.startsWith("SELECT vd.*, u.display_name as videaste_name")) {
      return {
        rows: [{ id: 40, title: "Cut v1", file_url: "https://vimeo.com/1" }],
      };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedWorld>;
const changes = (scripted: ScriptedDb) =>
  scripted.log.filter((entry) => /^(UPDATE|DELETE|INSERT)\b/.test(entry.sql));

const claim = (origin: string, account: typeof client, id: number) =>
  call(origin, "PATCH", `/projects/${id}`, {
    headers: signIn(account),
    body: { claimed_by: true },
  });

test("only an artist can take a project, and never the client's own", async () => {
  const scripted = scriptedWorld({ status: "open", claimed_by: null });
  await withRouter(versavidsRouter, async (origin) => {
    // Not an artist: nothing is claimed.
    const notArtist = await claim(origin, stranger, 1);
    assert.equal(notArtist.status, 403);
    assert.equal(
      notArtist.body?.error,
      "Only artists with an active profile can take a project",
    );

    // The client has an artist profile too, but still cannot take their own project.
    const own = await claim(origin, client, 1);
    assert.equal(own.status, 403);
    assert.equal(own.body?.error, "You cannot take your own project");
    assert.equal(changes(scripted).length, 0);

    const taken = await claim(origin, artist, 1);
    assert.equal(taken.status, 200, JSON.stringify(taken.body));
    const update = scripted.matching("UPDATE video_projects SET claimed_by")[0];
    assert.deepEqual(update.params, [9, 1]);
  });

  // Only an active profile counts, and it is the signed-in user's own.
  const lookup = scripted.matching("FROM artist_profiles")[0];
  assert.match(lookup.sql, /WHERE user_id = \$1 AND is_active = true/);
  assert.deepEqual(lookup.params, [6]);
});

const delivery = (origin: string, account: typeof client, body: unknown) =>
  call(origin, "POST", "/deliverables", {
    headers: signIn(account),
    body,
  });

test("a project that is no longer open answers 409 to every claim", async () => {
  for (const status of ["claimed", "in_progress", "completed", "cancelled"]) {
    const scripted = scriptedWorld({ status, claimed_by: 8 });
    await withRouter(versavidsRouter, async (origin) => {
      for (const account of [artist, client, stranger, admin]) {
        const res = await claim(origin, account, 1);
        assert.equal(res.status, 409, `${status} / user ${account.id}`);
        assert.equal(res.body?.error, "Project is no longer open");
      }
    });
    assert.equal(changes(scripted).length, 0, status);
    assert.equal(scripted.matching("FROM artist_profiles").length, 0, status);
  }
});

test("a delivery must be a plain http(s) link", async () => {
  const scripted = scriptedWorld({ status: "in_progress", claimed_by: 9 });
  const work = { project_id: 1, title: "Final cut" };
  await withRouter(versavidsRouter, async (origin) => {
    const refused: unknown[] = [
      "javascript:alert(document.cookie)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "ftp://files.example.com/cut.mp4",
      "//evil.example.com/cut.mp4",
      "vimeo.com/123",
      "https://trusted.example.com@evil.example.com/cut.mp4",
      `https://example.com/${"a".repeat(2000)}`,
      { href: "https://example.com" },
      12345,
    ];
    for (const file_url of refused) {
      const res = await delivery(origin, artist, { ...work, file_url });
      assert.equal(res.status, 400, JSON.stringify(file_url).slice(0, 60));
    }

    const badThumbnail = await delivery(origin, artist, {
      ...work,
      file_url: "https://vimeo.com/123",
      thumbnail_url: "javascript:alert(1)",
    });
    assert.equal(badThumbnail.status, 400);

    // Nothing reached the database, not even a project lookup.
    assert.equal(scripted.log.length, 0);

    const saved = await delivery(origin, artist, {
      ...work,
      file_url: "  HTTPS://Vimeo.com/123  ",
      thumbnail_url: "https://cdn.example.com/t.jpg",
    });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    const insert = scripted.matching("INSERT INTO video_deliverables")[0];
    assert.equal(insert.params[4], "https://vimeo.com/123");
    assert.equal(insert.params[5], "https://cdn.example.com/t.jpg");

    // The thumbnail is optional.
    await delivery(origin, artist, {
      ...work,
      file_url: "https://vimeo.com/123",
    });
    const second = scripted.matching("INSERT INTO video_deliverables")[1];
    assert.equal(second.params[5], null);
  });
});

test("work is accepted while a project is in progress, not once it is closed", async () => {
  const world: World = { status: "claimed", claimed_by: 9 };
  const scripted = scriptedWorld(world);
  const work = {
    project_id: 1,
    title: "Final cut",
    file_url: "https://vimeo.com/123",
  };
  await withRouter(versavidsRouter, async (origin) => {
    for (const status of ["claimed", "in_progress", "review", "revision"]) {
      world.status = status;
      const res = await delivery(origin, artist, work);
      assert.equal(res.status, 201, status);
    }
    assert.equal(scripted.matching("INSERT INTO video_deliverables").length, 4);

    const before = changes(scripted).length;
    for (const status of ["completed", "cancelled"]) {
      world.status = status;
      const res = await delivery(origin, artist, work);
      assert.equal(res.status, 409, status);
      assert.equal(res.body?.error, "This project is not accepting deliveries");
    }

    // Nobody has taken an open project yet, so even staff cannot deliver to it.
    world.status = "open";
    world.claimed_by = null;
    assert.equal((await delivery(origin, admin, work)).status, 409);

    // A refused delivery neither stores a file nor reopens the project.
    assert.equal(changes(scripted).length, before);
  });
});

const detail = (
  origin: string,
  account: typeof client | null,
  id: string | number = 1,
) =>
  call(origin, "GET", `/projects/${id}`, {
    headers: account ? signIn(account) : undefined,
  });

test("delivered work and the client's email are for the people involved", async () => {
  const scripted = scriptedWorld({ status: "review", claimed_by: 9 });
  await withRouter(versavidsRouter, async (origin) => {
    assert.equal((await detail(origin, null)).status, 401);
    for (const id of ["abc", "0", "-1", "1;DROP TABLE video_projects"]) {
      assert.equal((await detail(origin, client, id)).status, 404, id);
    }
    assert.equal(scripted.log.length, 0);

    // Anyone signed in can read the open request, but not the delivery.
    const outsider = await detail(origin, stranger);
    assert.equal(outsider.status, 200);
    assert.equal(outsider.body?.project.title, "Music video");
    assert.equal(outsider.body?.project.client_email, undefined);
    assert.deepEqual(outsider.body?.deliverables, []);
    assert.equal(outsider.body?.brief.resolution, "4k");
    assert.equal(scripted.matching("FROM video_deliverables").length, 0);

    for (const account of [client, artist, admin]) {
      const res = await detail(origin, account);
      assert.equal(res.status, 200);
      assert.equal(res.body?.project.client_email, "casey@example.com");
      assert.equal(res.body?.deliverables.length, 1);
      assert.equal(res.body?.deliverables[0].file_url, "https://vimeo.com/1");
    }
  });
});
