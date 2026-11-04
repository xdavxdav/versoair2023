// Small helpers shared by the admin create/edit forms.

// <input type="date"> only accepts YYYY-MM-DD, but the API returns full timestamps.
// Without this the field renders empty and saving would silently clear the stored date.
export function toDateInputValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : "";
  }
  return "";
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface ApiFailure {
  status: number;
  code: string | null;
  message: string;
}

// Error bodies look like { error: { code, message } } or, for some guards, { message }.
export async function readApiFailure(
  res: Pick<Response, "status" | "json">,
  fallback: string,
): Promise<ApiFailure> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const code = typeof body?.error?.code === "string" ? body.error.code : null;
  const message =
    (typeof body?.error?.message === "string" && body.error.message) ||
    (typeof body?.message === "string" && body.message) ||
    fallback;
  return { status: res.status, code, message };
}

export type AdminAccessIssue = "geoadmin-code" | "sign-in" | "admin-only";

export function adminAccessIssue(failure: {
  status: number;
  code: string | null;
}): AdminAccessIssue | null {
  if (failure.status === 401 && failure.code === "GEOADMIN_CODE_REQUIRED") {
    return "geoadmin-code";
  }
  if (failure.status === 401) return "sign-in";
  if (failure.status === 403) return "admin-only";
  return null;
}

export const ADMIN_ACCESS_MESSAGES: Record<AdminAccessIssue, string> = {
  "geoadmin-code":
    "Sign in to the Admin Panel with your personal access code first, then come back to this page.",
  "sign-in": "Your session has expired. Please sign in again.",
  "admin-only":
    "Ad campaigns can only be created and managed by Admin accounts.",
};
