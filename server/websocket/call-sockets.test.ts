import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test, { mock } from "node:test";
import jwt from "jsonwebtoken";
import { io as connect, type Socket } from "socket.io-client";
import { db, setTableRows } from "../test-support/route-harness";
import * as schema from "@shared/schema";
import { initializeSocket } from "./socket-config";

const token = (userId: number) => jwt.sign({ userId }, process.env.JWT_SECRET!);

const open = async (port: number, userId: number) => {
  const socket = connect(`http://127.0.0.1:${port}`, {
    auth: { token: token(userId) },
    transports: ["websocket"],
  });
  await once(socket, "authenticated");
  return socket;
};

const next = <T = any>(socket: Socket, event: string, ms = 1500) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

const silent = (socket: Socket, event: string, ms = 300) =>
  new Promise<boolean>((resolve) => {
    const onEvent = () => resolve(false);
    socket.once(event, onEvent);
    setTimeout(() => {
      socket.off(event, onEvent);
      resolve(true);
    }, ms);
  });

test("a call is relayed only between its two people", async () => {
  process.env.CALLS_ENABLED = "true";
  mock.method(db, "insert", (() => ({
    values: () => ({ onConflictDoUpdate: async () => undefined }),
  })) as never);
  setTableRows(schema.inboxConversations, [
    { participantId: "2", type: "direct" },
  ]);
  const server = createServer();
  const sockets: Socket[] = [];
  initializeSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;

  try {
    const [caller, callee, stranger] = await Promise.all([
      open(port, 1),
      open(port, 2),
      open(port, 3),
    ]);
    sockets.push(caller, callee, stranger);

    const incoming = next(callee, "call:incoming");
    const ringing = next(caller, "call:ringing");
    caller.emit("call:invite", { conversationId: 10, video: true });
    const { callId } = await ringing;
    assert.equal((await incoming).callId, callId);

    // A third person who learned the id gets nothing through, and cannot hang up the call.
    const leaked = silent(callee, "call:signal");
    stranger.emit("call:signal", { callId, description: { type: "offer" } });
    stranger.emit("call:accept", { callId });
    stranger.emit("call:end", { callId });
    assert.equal(await leaked, true);

    const accepted = next(caller, "call:accepted");
    callee.emit("call:accept", { callId });
    await accepted;

    const offer = next(callee, "call:signal");
    caller.emit("call:signal", { callId, description: { type: "offer", sdp: "x" }, junk: 1 });
    assert.deepEqual(await offer, { callId, description: { type: "offer", sdp: "x" } });

    const ended = next(callee, "call:ended");
    caller.emit("call:end", { callId });
    assert.deepEqual(await ended, { callId, reason: "ended" });
  } finally {
    sockets.forEach((socket) => socket.close());
    server.closeAllConnections?.();
    server.close();
  }
});

test("calls to support threads or while calls are off are refused", async () => {
  mock.method(db, "insert", (() => ({
    values: () => ({ onConflictDoUpdate: async () => undefined }),
  })) as never);
  const server = createServer();
  initializeSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const caller = await open(port, 1);
  try {
    process.env.CALLS_ENABLED = "false";
    let refused = next(caller, "call:unavailable");
    caller.emit("call:invite", { conversationId: 10 });
    assert.equal((await refused).reason, "disabled");

    process.env.CALLS_ENABLED = "true";
    setTableRows(schema.inboxConversations, [{ participantId: "support", type: "support" }]);
    refused = next(caller, "call:unavailable");
    caller.emit("call:invite", { conversationId: 10 });
    assert.equal((await refused).reason, "not_allowed");
  } finally {
    caller.close();
    server.closeAllConnections?.();
    server.close();
  }
});
