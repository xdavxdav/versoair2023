type Operation = "load" | "create";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function serverMessage(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const error = body.error;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : null;
}

export function adminBusinessFailureMessage(
  status: number,
  body: unknown,
  operation: Operation,
): string {
  if (status === 401) {
    return operation === "create"
      ? "GeoAdmin access could not be verified. Sign in with your access code, then check the business list before retrying."
      : "GeoAdmin access could not be verified. Sign in again to refresh the business list.";
  }

  if (status === 403) {
    return serverMessage(body) || "Your GeoAdmin role does not allow this action.";
  }

  if (operation === "create" && status >= 500) {
    return "The server could not confirm the save. Check the business list before retrying.";
  }

  return (
    serverMessage(body) ||
    (status === 400
      ? "Some business information is missing or invalid."
      : `Could not ${operation === "create" ? "save" : "load"} businesses (HTTP ${status}).`)
  );
}

export async function readAdminBusinessResponse(
  response: Response,
  operation: Operation,
): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !isRecord(body) ||
    body.success !== true
  ) {
    throw new Error(
      response.ok
        ? "The server returned an invalid business response."
        : adminBusinessFailureMessage(response.status, body, operation),
    );
  }
  return body;
}
