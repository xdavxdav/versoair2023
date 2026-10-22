import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  acceptGeoAdminInvitation,
  generateGeoAdminInvitationToken,
  getGeoAdminInvitationExpiry,
  hashGeoAdminInvitationToken,
  invitationTokenMatchesHash,
  isWellFormedGeoAdminInvitationToken,
  type GeoAdminInvitationStore,
  type GeoAdminInvitationTxStore,
} from "./geoadmin-invitations";
import { canLinkExistingUserToGeoAdmin } from "@shared/geoadmin-invitation";
import { hashGeoAdminAccessCode } from "./geoadmin-staff-codes";

type Inv = {
  id: number;
  email: string;
  gateUsername: string;
  role: "admin" | "moderator";
  tokenHash: string;
  status: string;
  expiresAt: Date;
  acceptedUserId: number | null;
};
type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  previousRole?: string | null;
  gateUsername: string | null;
  isVerified: boolean;
  portalAccess: string[];
  password: string;
  geoAdminCodeHash?: string | null;
};

/** In-memory store with serialized, all-or-nothing transactions. */
function createFakeStore(state: { invitations: Inv[]; users: User[] }) {
  let queue: Promise<unknown> = Promise.resolve();
  const tx: GeoAdminInvitationTxStore = {
    async claimPendingInvitation(tokenHash, now) {
      const inv = state.invitations.find(
        (i) => i.tokenHash === tokenHash && i.status === "pending" && i.expiresAt > now,
      );
      if (!inv) return null;
      inv.status = "accepted";
      return { id: inv.id, email: inv.email, gateUsername: inv.gateUsername, role: inv.role, invitedBy: 1 };
    },
    async findInvitationByTokenHash(tokenHash) {
      return state.invitations.find((i) => i.tokenHash === tokenHash) ?? null;
    },
    async findUserConflict(email, gateUsername) {
      if (state.users.some((u) => u.email.toLowerCase() === email)) return "email";
      if (state.users.some((u) => u.gateUsername === gateUsername)) return "gate_username";
      return null;
    },
    async isUsernameTaken(username) {
      return state.users.some((u) => u.username === username);
    },
    async createStaffUser(data) {
      const user: User = {
        id: state.users.length + 100,
        username: data.username,
        email: data.email,
        role: data.role,
        gateUsername: data.gateUsername,
        isVerified: true,
        portalAccess: ["general", "geo-admin"],
        password: data.passwordHash,
        geoAdminCodeHash: data.geoAdminCodeHash,
      };
      state.users.push(user);
      return { id: user.id };
    },
    async attachExistingUser(data) {
      const user = state.users.find((u) => u.id === data.userId);
      if (
        !user ||
        user.email.toLowerCase() !== data.email ||
        !canLinkExistingUserToGeoAdmin(user)
      ) {
        return false;
      }
      user.previousRole = user.role;
      user.role = data.role;
      user.gateUsername = data.gateUsername;
      user.geoAdminCodeHash = data.geoAdminCodeHash;
      user.portalAccess = [...new Set([...user.portalAccess, "geo-admin"])];
      return true;
    },
    async linkAcceptedUser(invitationId, userId) {
      state.invitations.find((i) => i.id === invitationId)!.acceptedUserId = userId;
    },
  };
  const store: GeoAdminInvitationStore = {
    transaction(fn) {
      const run = queue.then(async () => {
        const snapshot = structuredClone(state);
        try {
          return await fn(tx);
        } catch (error) {
          state.invitations = snapshot.invitations;
          state.users = snapshot.users;
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
  return store;
}

const NOW = new Date("2030-01-01T00:00:00Z");
const PASSWORD = "Str0ngPassword!";

function setup(overrides: Partial<Inv> = {}, users: User[] = []) {
  const { token, tokenHash } = generateGeoAdminInvitationToken();
  const state = {
    invitations: [
      {
        id: 1,
        email: "ops@company.com",
        gateUsername: "ops_lead",
        role: "admin" as const,
        tokenHash,
        status: "pending",
        expiresAt: getGeoAdminInvitationExpiry(NOW),
        acceptedUserId: null,
        ...overrides,
      },
    ],
    users,
  };
  const deps = {
    store: createFakeStore(state),
    hashPassword: async (p: string) => `hashed:${p}`,
    now: () => NOW,
  };
  return { token, state, deps };
}

test("tokens are random, well-formed and purpose-bound", () => {
  const a = generateGeoAdminInvitationToken();
  const b = generateGeoAdminInvitationToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isWellFormedGeoAdminInvitationToken(a.token));
  assert.match(a.tokenHash, /^[0-9a-f]{64}$/);
  assert.ok(invitationTokenMatchesHash(a.token, a.tokenHash));
  assert.ok(!invitationTokenMatchesHash(b.token, a.tokenHash));
  // Not a plain sha256 of the token, so hashes from other flows never collide.
  assert.notEqual(a.tokenHash, createHash("sha256").update(a.token).digest("hex"));
  for (const bad of ["", "gai_short", a.token + "x", "eyJhbGciOiJIUzI1NiJ9.e30.sig", a.token.replace("gai_", "rst_")]) {
    assert.ok(!isWellFormedGeoAdminInvitationToken(bad), bad);
  }
});

test("accepting creates a verified staff account exactly once", async () => {
  const { token, state, deps } = setup();
  const result = await acceptGeoAdminInvitation({ token, password: PASSWORD }, deps);
  assert.equal(result.ok, true);
  assert.equal(state.users.length, 1);
  const [user] = state.users;
  assert.equal(user.email, "ops@company.com");
  assert.equal(user.role, "admin");
  assert.equal(user.gateUsername, "ops_lead");
  assert.equal(user.username, "ops_lead");
  assert.equal(user.isVerified, true);
  assert.deepEqual(user.portalAccess, ["general", "geo-admin"]);
  assert.equal(user.password, `hashed:${PASSWORD}`);
  assert.match(result.ok ? result.geoAdminAccessCode : "", /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/);
  assert.equal(user.geoAdminCodeHash, hashGeoAdminAccessCode(result.ok ? result.geoAdminAccessCode : ""));
  assert.equal(state.invitations[0].status, "accepted");
  assert.equal(state.invitations[0].acceptedUserId, user.id);

  const replay = await acceptGeoAdminInvitation({ token, password: PASSWORD }, deps);
  assert.deepEqual(replay.ok ? null : [replay.status, replay.code], [410, "INVITATION_ALREADY_USED"]);
  assert.equal(state.users.length, 1);
});

test("concurrent acceptances only succeed once", async () => {
  const { token, state, deps } = setup();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => acceptGeoAdminInvitation({ token, password: PASSWORD }, deps)),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(state.users.length, 1);
});

test("expired, revoked, undelivered and unknown invitations are rejected", async () => {
  const cases: Array<[Partial<Inv>, number, string]> = [
    [{ expiresAt: new Date(NOW.getTime() - 1) }, 410, "INVITATION_EXPIRED"],
    [{ status: "expired" }, 410, "INVITATION_EXPIRED"],
    [{ status: "revoked" }, 410, "INVITATION_REVOKED"],
    [{ status: "delivery_failed" }, 400, "INVITATION_INVALID"],
  ];
  for (const [overrides, status, code] of cases) {
    const { token, state, deps } = setup(overrides);
    const result = await acceptGeoAdminInvitation({ token, password: PASSWORD }, deps);
    assert.deepEqual(result.ok ? null : [result.status, result.code], [status, code]);
    assert.equal(state.users.length, 0);
  }

  const { state, deps } = setup();
  const unknown = await acceptGeoAdminInvitation(
    { token: generateGeoAdminInvitationToken().token, password: PASSWORD },
    deps,
  );
  assert.deepEqual(unknown.ok ? null : unknown.code, "INVITATION_INVALID");
  const malformed = await acceptGeoAdminInvitation({ token: "not-a-token", password: PASSWORD }, deps);
  assert.deepEqual(malformed.ok ? null : malformed.code, "INVITATION_INVALID");
  assert.equal(state.invitations[0].status, "pending");
});

test("existing accounts are never taken over and the invitation stays pending", async () => {
  const existing: User = {
    id: 5,
    username: "someone",
    email: "OPS@company.com",
    role: "user",
    gateUsername: null,
    isVerified: true,
    portalAccess: ["general"],
    password: "original",
  };
  const { token, state, deps } = setup({}, [existing]);
  const result = await acceptGeoAdminInvitation({ token, password: PASSWORD }, deps);
  assert.deepEqual(result.ok ? null : [result.status, result.code], [409, "ACCOUNT_CONFLICT"]);
  assert.equal(state.users.length, 1);
  assert.equal(state.users[0].role, "user");
  assert.equal(state.users[0].password, "original");
  assert.equal(state.invitations[0].status, "pending");
});

test("an existing verified account can accept only while authenticated as the invitee", async () => {
  const existing: User = {
    id: 5,
    username: "existing_user",
    email: "ops@company.com",
    role: "business_owner",
    previousRole: null,
    gateUsername: null,
    isVerified: true,
    portalAccess: ["general", "business"],
    password: "original-hash",
  };
  const { token, state, deps } = setup({}, [existing]);
  const result = await acceptGeoAdminInvitation(
    { token, existingUserId: existing.id },
    deps,
  );

  assert.equal(result.ok, true);
  assert.equal(state.users.length, 1);
  assert.equal(existing.role, "admin");
  assert.equal(existing.previousRole, "business_owner");
  assert.equal(existing.gateUsername, "ops_lead");
  assert.deepEqual(existing.portalAccess, ["general", "business", "geo-admin"]);
  assert.equal(existing.password, "original-hash");
  assert.match(result.ok ? result.geoAdminAccessCode : "", /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/);
  assert.equal(existing.geoAdminCodeHash, hashGeoAdminAccessCode(result.ok ? result.geoAdminAccessCode : ""));
  assert.equal(state.invitations[0].status, "accepted");
  assert.equal(state.invitations[0].acceptedUserId, existing.id);
});

test("existing-account acceptance rejects an unrelated signed-in account", async () => {
  const existing: User = {
    id: 5,
    username: "someone_else",
    email: "someone-else@company.com",
    role: "user",
    gateUsername: null,
    isVerified: true,
    portalAccess: ["general"],
    password: "original",
  };
  const { token, state, deps } = setup({}, [existing]);
  const result = await acceptGeoAdminInvitation(
    { token, existingUserId: existing.id },
    deps,
  );
  assert.deepEqual(result.ok ? null : [result.status, result.code], [409, "ACCOUNT_CONFLICT"]);
  assert.equal(state.invitations[0].status, "pending");
  assert.equal(existing.role, "user");
  assert.equal(existing.password, "original");
});

test("existing-account acceptance rejects unverified and privileged accounts", async () => {
  const cases: User[] = [
    {
      id: 5,
      username: "unverified",
      email: "ops@company.com",
      role: "user",
      gateUsername: null,
      isVerified: false,
      portalAccess: ["general"],
      password: "original",
    },
    {
      id: 6,
      username: "already_staff",
      email: "ops@company.com",
      role: "admin",
      gateUsername: null,
      isVerified: true,
      portalAccess: ["general"],
      password: "original",
    },
  ];
  for (const user of cases) {
    const { token, state, deps } = setup({}, [user]);
    const result = await acceptGeoAdminInvitation(
      { token, existingUserId: user.id },
      deps,
    );
    assert.equal(result.ok, false);
    assert.equal(state.invitations[0].status, "pending");
    assert.equal(user.password, "original");
  }
});

test("username collisions get a suffix instead of failing", async () => {
  const existing: User = {
    id: 5,
    username: "ops_lead",
    email: "other@company.com",
    role: "user",
    gateUsername: null,
    isVerified: true,
    portalAccess: ["general"],
    password: "x",
  };
  const { token, state, deps } = setup({}, [existing]);
  const result = await acceptGeoAdminInvitation({ token, password: PASSWORD }, deps);
  assert.equal(result.ok, true);
  assert.equal(state.users[1].username, "ops_lead_2");
  assert.equal(state.users[1].gateUsername, "ops_lead");
});

test("hash comparison is deterministic", () => {
  assert.equal(hashGeoAdminInvitationToken("gai_x"), hashGeoAdminInvitationToken("gai_x"));
});
