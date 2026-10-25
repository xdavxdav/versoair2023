import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";

import {
  INBOX_ATTACHMENT_MAX_BYTES,
  receiveInboxAttachment,
} from "./inbox-upload";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.post("/attachments", receiveInboxAttachment, (req, res) => {
    res.json({ success: true, size: req.file?.size ?? null });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

async function upload(
  baseUrl: string,
  bytes: Uint8Array,
  type: string,
  field = "file",
) {
  const form = new FormData();
  form.append(field, new Blob([bytes], { type }), "upload.bin");
  const res = await fetch(`${baseUrl}/attachments`, {
    method: "POST",
    body: form,
  });
  return { status: res.status, body: (await res.json()) as any };
}

test("an image within the limit is accepted", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await upload(baseUrl, new Uint8Array(1024), "image/png");
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true, size: 1024 });
  });
});

test("a file that is not an image is refused with 415, not a server error", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await upload(baseUrl, new Uint8Array(32), "text/plain");
    assert.equal(status, 415);
    assert.equal(body.success, false);
    assert.match(body.error, /JPEG, PNG, WebP or GIF/);
  });
});

test("an oversize image is refused with 413, not a server error", async () => {
  await withServer(async (baseUrl) => {
    const bytes = new Uint8Array(INBOX_ATTACHMENT_MAX_BYTES + 1024);
    const { status, body } = await upload(baseUrl, bytes, "image/png");
    assert.equal(status, 413);
    assert.equal(body.success, false);
    assert.match(body.error, /8 MB/);
  });
});

test("a file sent under the wrong field name is refused with 400", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await upload(baseUrl, new Uint8Array(16), "image/png", "photo");
    assert.equal(status, 400);
    assert.equal(body.success, false);
  });
});
