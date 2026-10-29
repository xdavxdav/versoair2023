import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import { ownerCredentialResponseSchema } from "@shared/geoadmin-credentials";
import { hashGeoAdminAccessCode } from "../services/geoadmin-staff-codes";
import { decodeBase32Secret } from "../services/totp";
import { createGeoAdminCredentialRouter } from "./geoadmin-credentials";

async function withServer(
  authorizeOwner: RequestHandler,
  run: (url: string, audits: string[]) => Promise<void>,
) {
  const audits: string[] = [];
  const app = express();
  app.use(express.json());
  app.use(createGeoAdminCredentialRouter({
    authorizeOwner,
    audit: async (_req, kind) => { audits.push(kind); },
  }));
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}/geoadmin-access/owner-credentials`, audits);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const owner: RequestHandler = (req, _res, next) => {
  req.user = { userId: "1", email: "owner@example.com", role: "superuser" } as typeof req.user;
  next();
};

const post = (url: string, body: unknown) => fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

test("non-owners cannot generate credential drafts", async () => {
  const deny: RequestHandler = (_req, res) => { res.status(403).json({ success: false }); };
  await withServer(deny, async (url, audits) => {
    const res = await post(url, { kind: "access-code" });
    assert.equal(res.status, 403);
    assert.deepEqual(audits, []);
  });
});

test("owner access-code draft matches the env hash format and is audited", async () => {
  await withServer(owner, async (url, audits) => {
    const res = await post(url, { kind: "access-code" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const draft = ownerCredentialResponseSchema.parse(await res.json());
    assert.equal(draft.kind, "access-code");
    if (draft.kind !== "access-code") return;
    assert.equal(draft.hash, hashGeoAdminAccessCode(draft.code));
    assert.equal(draft.variable, "SUPERADMIN_GEOADMIN_CODE_HASH");
    assert.deepEqual(audits, ["access-code"]);
  });
});

test("owner authenticator draft returns a valid secret and otpauth URI", async () => {
  await withServer(owner, async (url, audits) => {
    const res = await post(url, { kind: "authenticator" });
    assert.equal(res.status, 200);
    const draft = ownerCredentialResponseSchema.parse(await res.json());
    assert.equal(draft.kind, "authenticator");
    if (draft.kind !== "authenticator") return;
    assert.equal(decodeBase32Secret(draft.secret).length, 32);
    assert.equal(new URL(draft.uri).searchParams.get("secret"), draft.secret);
    assert.match(decodeURIComponent(draft.uri), /owner@example\.com/);
    assert.deepEqual(audits, ["authenticator"]);
  });
});

test("unknown credential kinds and extra fields are rejected without auditing", async () => {
  await withServer(owner, async (url, audits) => {
    assert.equal((await post(url, { kind: "superuser" })).status, 400);
    assert.equal((await post(url, { kind: "access-code", activate: true })).status, 400);
    assert.deepEqual(audits, []);
  });
});
