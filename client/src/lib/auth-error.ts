export function authErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "The request failed. Please try again.";
  const message = error.message.replace(/^\d+:\s*/, "");
  try {
    const body: unknown = JSON.parse(message);
    if (body && typeof body === "object") {
      if ("message" in body && typeof body.message === "string") {
        return body.message;
      }
      if ("error" in body && body.error && typeof body.error === "object" &&
          "message" in body.error && typeof body.error.message === "string") {
        return body.error.message;
      }
    }
  } catch {
    // Network failures and plain-text responses do not contain JSON.
  }
  return message;
}
