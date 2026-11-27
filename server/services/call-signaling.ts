import { randomUUID } from "node:crypto";

export const RING_TIMEOUT_MS = 45_000;
export const MAX_SIGNAL_BYTES = 20_000;

export type CallState = "ringing" | "active";

export interface Call {
  id: string;
  callerId: number;
  calleeId: number;
  conversationId: number;
  video: boolean;
  state: CallState;
}

export type InviteResult =
  | { ok: true; call: Call }
  | { ok: false; reason: "busy" | "self" };

/**
 * Who is on which call. Everything the sockets relay is checked against this
 * list, so only the two people on a call can send to each other.
 */
export class CallRegistry {
  private readonly calls = new Map<string, Call>();

  private callOf(userId: number): Call | undefined {
    for (const call of this.calls.values()) {
      if (call.callerId === userId || call.calleeId === userId) return call;
    }
    return undefined;
  }

  invite(
    callerId: number,
    calleeId: number,
    conversationId: number,
    video: boolean,
  ): InviteResult {
    if (callerId === calleeId) return { ok: false, reason: "self" };
    if (this.callOf(callerId) || this.callOf(calleeId)) {
      return { ok: false, reason: "busy" };
    }
    const call: Call = {
      id: randomUUID(),
      callerId,
      calleeId,
      conversationId,
      video,
      state: "ringing",
    };
    this.calls.set(call.id, call);
    return { ok: true, call };
  }

  /** The other person on the call, or null when userId is not on it. */
  peerOf(callId: unknown, userId: number): number | null {
    const call = typeof callId === "string" ? this.calls.get(callId) : undefined;
    if (!call) return null;
    if (call.callerId === userId) return call.calleeId;
    if (call.calleeId === userId) return call.callerId;
    return null;
  }

  /** Only the person being called can pick up, and only while it rings. */
  accept(callId: unknown, userId: number): Call | null {
    const call = typeof callId === "string" ? this.calls.get(callId) : undefined;
    if (!call || call.calleeId !== userId || call.state !== "ringing") {
      return null;
    }
    call.state = "active";
    return call;
  }

  /** Ends a call for either person. Returns the call, or null if userId is not on it. */
  end(callId: unknown, userId: number): Call | null {
    if (this.peerOf(callId, userId) === null) return null;
    const call = this.calls.get(callId as string)!;
    this.calls.delete(call.id);
    return call;
  }

  /** A call nobody picked up; false once it was answered or ended. */
  expire(callId: string): Call | null {
    const call = this.calls.get(callId);
    if (!call || call.state !== "ringing") return null;
    this.calls.delete(callId);
    return call;
  }

  /** Ends whatever call a user was on, e.g. when their last connection drops. */
  dropUser(userId: number): Call | null {
    const call = this.callOf(userId);
    if (call) this.calls.delete(call.id);
    return call ?? null;
  }
}

/** A signalling payload is a session description or an ICE candidate, nothing else. */
export function cleanSignal(
  data: unknown,
): { description?: unknown; candidate?: unknown } | null {
  if (typeof data !== "object" || data === null) return null;
  const { description, candidate } = data as Record<string, unknown>;
  if (description === undefined && candidate === undefined) return null;
  const clean: { description?: unknown; candidate?: unknown } = {};
  if (description !== undefined) clean.description = description;
  if (candidate !== undefined) clean.candidate = candidate;
  return JSON.stringify(clean).length > MAX_SIGNAL_BYTES ? null : clean;
}
