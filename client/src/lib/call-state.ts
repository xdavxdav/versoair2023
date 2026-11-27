export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";

export type CallEndReason =
  | "ended"
  | "no_answer"
  | "missed"
  | "disconnected"
  | "offline"
  | "busy"
  | "disabled"
  | "not_allowed"
  | "permission"
  | "failed"
  | "error"
  | "self";

const MESSAGES: Record<CallEndReason, string> = {
  ended: "Call ended",
  no_answer: "No answer",
  missed: "Missed call",
  disconnected: "The other person lost connection",
  offline: "They are offline right now",
  busy: "They are already on a call",
  disabled: "Calls are not available yet",
  not_allowed: "You can't call this conversation",
  permission: "Allow the microphone (and camera) to make calls",
  failed: "The call could not connect",
  error: "The call could not start",
  self: "You can't call yourself",
};

export const callEndMessage = (reason: string): string =>
  MESSAGES[reason as CallEndReason] ?? MESSAGES.error;

export function formatCallDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
