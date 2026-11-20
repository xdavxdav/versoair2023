import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import profileRequestsRouter from "./profile-requests";

const requester = { id: 12, role: "user", email: "jdcz@example.com" };
const nonOwnerAdmin = { id: 2, role: "admin", email: "mod@example.com" };
const owner = {
  id: 1,
  role: "superuser",
  email: "owner@example.com",
};

function signInOwnerWithGeo() {
  signIn(owner);
  const token = jwt.sign(
    {
      userId: owner.id,
      email: owner.email,
      role: owner.role,
      ownerMfa: true,
      geoAdminCodeAuthenticated: true,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

function scriptedProfileDb() {
  const requests: any[] = [
    {
      id: 1,
      requester_user_id: 12,
      requester_email: "jdcz@example.com",
      display_name: "jdcz",
      provider: "soundcloud",
      normalized_url: "https://soundcloud.com/user-63192703-824225280",
      external_id: "1158104212",
      status: "pending",
      note: "My SoundCloud profile",
      snapshot: {
        provider: "soundcloud",
        normalizedUrl: "https://soundcloud.com/user-63192703-824225280",
        sourceTier: "hydration",
        externalId: "1158104212",
        displayName: "jdcz",
        username: "jdcz",
        bio: "i kill beats",
        city: "kpetoukro",
        countryCode: null,
        avatarUrl: "https://i1.sndcdn.com/avatars-GHactRjVwzxGSGQs-d5BteA-large.jpg",
        bannerUrl: "https://i1.sndcdn.com/visuals-BH6tWBwUZUJy8w80-zwhwSA-original.jpg",
        externalStats: { followersCount: 4, followingsCount: 3, trackCount: 3 },
        tracks: [],
      },
      created_at: new Date().toISOString(),
    },
  ];
  const stagedTracks: any[] = [];

  const db = scriptPool((sql, params) => {
    if (sql.includes("INSERT INTO profile_link_requests")) {
      const [userId, email, displayName, provider, url, extId, note, snapJson] = params as any[];
      const row = {
        id: requests.length + 1,
        requester_user_id: userId,
        requester_email: email,
        display_name: displayName,
        provider,
        normalized_url: url,
        external_id: extId,
        status: "pending",
        note,
        snapshot: JSON.parse(snapJson),
        created_at: new Date().toISOString(),
      };
      requests.push(row);
      return { rows: [row] };
    }
    if (sql.includes("INSERT INTO profile_import_tracks")) {
      stagedTracks.push({ id: stagedTracks.length + 1, params });
      return { rows: [{ id: stagedTracks.length }] };
    }
    if (sql.includes("FROM profile_link_requests") && sql.includes("WHERE requester_user_id")) {
      return { rows: requests.filter((r) => r.requester_user_id === Number(params[0])) };
    }
    if (sql.includes("FROM profile_import_tracks") && sql.includes("WHERE artist_user_id")) {
      return { rows: stagedTracks };
    }
    if (sql.includes("FROM profile_link_requests r")) {
      return { rows: requests.map((r) => ({ ...r, staged_tracks: [] })) };
    }
    if (sql.includes("SELECT * FROM profile_link_requests WHERE id = $1 FOR UPDATE")) {
      const found = requests.find((r) => r.id === Number(params[0]));
      return { rows: found ? [found] : [] };
    }
    if (sql.includes("SELECT id FROM artist_profiles WHERE user_id = $1")) {
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO artist_profiles")) {
      const [userId, stageName, genres, countryCode, bio, avatar, artistCode] = params as any[];
      return {
        rows: [
          {
            id: 55,
            user_id: userId,
            stage_name: stageName,
            evaluation_status: "pending",
            contract_access: "none",
            artist_code: artistCode,
            genres,
            countryCode,
            bio,
            avatar,
          },
        ],
      };
    }
    if (sql.includes("SELECT id FROM artists WHERE user_id = $1")) {
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO artists")) {
      return { rows: [{ id: 88 }] };
    }
    if (sql.includes("UPDATE profile_link_requests") && sql.includes("SET status = 'approved'")) {
      const id = Number(params[5]);
      const r = requests.find((x) => x.id === id);
      if (r) r.status = "approved";
      return { rows: [r] };
    }
    if (sql.includes("UPDATE profile_link_requests") && sql.includes("SET status = 'rejected'")) {
      const id = Number(params[2]);
      const r = requests.find((x) => x.id === id);
      if (r) r.status = "rejected";
      return { rows: [r] };
    }
    return { rows: [] };
  });

  return { db, requests };
}

test("POST / rejects invalid URLs and creates only a pending request (never user/artist accounts)", async () => {
  const { db } = scriptedProfileDb();
  await withRouter(profileRequestsRouter, async (origin) => {
    const bad = await call(origin, "POST", "/", {
      body: { url: "http://127.0.0.1/evil", requesterEmail: "a@b.com" },
    });
    assert.equal(bad.status, 400);

    const noEmail = await call(origin, "POST", "/", {
      body: { url: "https://open.spotify.com/artist/123" },
    });
    assert.equal(noEmail.status, 400);

    const created = await call(origin, "POST", "/", {
      body: {
        url: "https://soundcloud.com.evil.com/jdcz",
        requesterEmail: "jdcz@example.com",
      },
    });
    assert.equal(created.status, 400);

    assert.equal(db.matching("INSERT INTO users").length, 0);
    assert.equal(db.matching("INSERT INTO artist_profiles").length, 0);
    assert.equal(db.matching("INSERT INTO music_tracks").length, 0);
  });
});

test("admin review routes require owner and approve creates pending evaluation_status (never bypasses contracts)", async () => {
  process.env.SUPERADMIN_EMAIL = owner.email;
  const { db } = scriptedProfileDb();
  await withRouter(profileRequestsRouter, async (origin) => {
    const anonList = await call(origin, "GET", "/admin/list");
    assert.equal(anonList.status, 401);

    const modList = await call(origin, "GET", "/admin/list", {
      headers: signIn(nonOwnerAdmin),
    });
    assert.equal(modList.status, 403);

    const noGeoList = await call(origin, "GET", "/admin/list", {
      headers: signIn(owner),
    });
    assert.equal(noGeoList.status, 401);

    const ownerList = await call(origin, "GET", "/admin/list", {
      headers: signInOwnerWithGeo(),
    });
    assert.equal(ownerList.status, 200);
    assert.equal(ownerList.body?.requests?.length, 1);

    const approved = await call(origin, "POST", "/admin/1/approve", {
      headers: signInOwnerWithGeo(),
      body: { reviewNote: "Verified jdcz SoundCloud" },
    });
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    assert.equal(approved.body?.resultingArtistProfileId, 55);
    assert.equal(approved.body?.resultingArtistId, 88);

    // Must never auto-approve contracts or set evaluation_status = 'approved'
    assert.equal(db.matching("INSERT INTO artist_contracts").length, 0);
    const [profileInsert] = db.matching("INSERT INTO artist_profiles");
    assert.ok(profileInsert.sql.includes("'pending', 'none'"));
  });
});

test("GET /mine requires auth and returns requester requests", async () => {
  scriptedProfileDb();
  await withRouter(profileRequestsRouter, async (origin) => {
    assert.equal((await call(origin, "GET", "/mine")).status, 401);
    const mine = await call(origin, "GET", "/mine", {
      headers: signIn(requester),
    });
    assert.equal(mine.status, 200);
    assert.equal(mine.body?.requests?.length, 1);
  });
});
