/**
 * The readable reason in an API failure. Most handlers answer
 * { error: "text" } but sign-in failures answer { error: { code, message } };
 * rendering the latter as text would throw inside React.
 */
export function apiErrorMessage(
  body: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const error = (body as { error?: unknown } | null | undefined)?.error;
  if (typeof error === "string" && error.trim()) return error;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
