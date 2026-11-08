type Env = Record<string, string | undefined>;

const SWITCHED_OFF = new Set(["false", "0", "off", "no", "disabled"]);

/**
 * Listening sessions are on unless the kill switch is set. Setting
 * LISTENING_SESSIONS_ENABLED to false (also 0, off, no, disabled; any case)
 * makes every /api/listening-sessions route answer 404. The switch is read on
 * each request, so changing it never needs a code change.
 */
export function isListeningSessionsEnabled(env: Env = process.env): boolean {
  const value = env.LISTENING_SESSIONS_ENABLED?.trim().toLowerCase();
  return value === undefined || !SWITCHED_OFF.has(value);
}
