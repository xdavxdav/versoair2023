// What the VersaVids studio shows for a project, decided in one place: who the
// viewer is, which buttons they get, and what a form may send. Pure, so it is
// unit tested; the server stays the authority on every one of these actions.
import {
  DELIVERY_ACCEPTING_STATUSES,
  parseDeliveryUrl,
} from "@shared/versavids-rules";

export type ProjectRole = "client" | "videaste" | "other";
export type ProjectAction = "claim" | "deliver" | "review" | "cancel";

export interface VersaVidsProject {
  id: number;
  title: string;
  description: string | null;
  projectType: string | null;
  genre: string | null;
  budget: number | null;
  currency: string;
  deadline: string | null;
  status: string;
  priority: string;
  clientId: number | null;
  claimedBy: number | null;
  clientName: string | null;
  /** Only sent to the client, the artist who took the project and staff. */
  clientEmail: string | null;
  videasteName: string | null;
}

export interface VersaVidsDeliverable {
  id: number;
  title: string;
  description: string | null;
  /** null when the stored link is not a plain http(s) link: never rendered. */
  fileUrl: string | null;
  version: number;
  status: string;
  clientFeedback: string | null;
}

export interface VersaVidsBrief {
  aspectRatio: string | null;
  resolution: string | null;
  visualStyle: string | null;
  formats: string[];
}

export interface VersaVidsProjectDetail {
  project: VersaVidsProject;
  brief: VersaVidsBrief | null;
  deliverables: VersaVidsDeliverable[];
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

function toId(value: unknown): number | null {
  const n =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** The signed-in user's id, or null when it is not a usable number. */
export const viewerIdOf = (id: unknown): number | null => toId(id);

// Postgres sends DECIMAL columns as strings ("500.00").
function toAmount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toProject(raw: unknown): VersaVidsProject | null {
  const row = asRecord(raw);
  const id = toId(row?.id);
  const title = text(row?.title);
  if (!row || id === null || !title) return null;
  return {
    id,
    title,
    description: text(row.description),
    projectType: text(row.project_type),
    genre: text(row.genre),
    budget: toAmount(row.budget),
    currency: text(row.currency) ?? "USD",
    deadline: text(row.deadline),
    status: text(row.status) ?? "open",
    priority: text(row.priority) ?? "normal",
    clientId: toId(row.client_id),
    claimedBy: toId(row.claimed_by),
    clientName: text(row.client_name),
    clientEmail: mailtoAddress(text(row.client_email)),
    videasteName: text(row.videaste_name),
  };
}

function toDeliverable(raw: unknown): VersaVidsDeliverable | null {
  const row = asRecord(raw);
  const id = toId(row?.id);
  if (!row || id === null) return null;
  return {
    id,
    title: text(row.title) ?? "Delivery",
    description: text(row.description),
    fileUrl: parseDeliveryUrl(row.file_url),
    version: toId(row.version) ?? 1,
    status: text(row.status) ?? "submitted",
    clientFeedback: text(row.client_feedback),
  };
}

function toBrief(raw: unknown): VersaVidsBrief | null {
  const row = asRecord(raw);
  if (!row) return null;
  const formats = Array.isArray(row.deliverable_formats)
    ? row.deliverable_formats.filter((f): f is string => typeof f === "string")
    : [];
  return {
    aspectRatio: text(row.aspect_ratio),
    resolution: text(row.resolution),
    visualStyle: text(row.visual_style),
    formats,
  };
}

export function parseProjects(body: unknown): VersaVidsProject[] {
  const data = asRecord(body);
  if (!data || data.success !== true || !Array.isArray(data.projects))
    return [];
  return data.projects
    .map(toProject)
    .filter((p): p is VersaVidsProject => p !== null);
}

export function parseProjectDetail(
  body: unknown,
): VersaVidsProjectDetail | null {
  const data = asRecord(body);
  if (!data || data.success !== true) return null;
  const project = toProject(data.project);
  if (!project) return null;
  const deliverables = (
    Array.isArray(data.deliverables) ? data.deliverables : []
  )
    .map(toDeliverable)
    .filter((d): d is VersaVidsDeliverable => d !== null)
    .sort((a, b) => b.version - a.version || b.id - a.id);
  return { project, brief: toBrief(data.brief), deliverables };
}

export function projectRole(
  project: Pick<VersaVidsProject, "clientId" | "claimedBy">,
  viewerId: number | null,
): ProjectRole {
  if (viewerId === null) return "other";
  if (project.clientId === viewerId) return "client";
  if (project.claimedBy === viewerId) return "videaste";
  return "other";
}

// The client can walk away until the work is delivered; a delivery in review
// is answered with "approve" or "ask for changes" instead.
const CANCELLABLE_STATUSES = ["open", "claimed", "in_progress", "revision"];

export function projectActions(
  project: Pick<VersaVidsProject, "clientId" | "claimedBy" | "status">,
  viewer: { id: number | null; isArtist: boolean },
): ProjectAction[] {
  const role = projectRole(project, viewer.id);
  if (role === "client") {
    const actions: ProjectAction[] = [];
    if (project.status === "review") actions.push("review");
    if (CANCELLABLE_STATUSES.includes(project.status)) actions.push("cancel");
    return actions;
  }
  if (role === "videaste") {
    const canDeliver =
      DELIVERY_ACCEPTING_STATUSES.includes(project.status) &&
      project.status !== "review";
    return canDeliver ? ["deliver"] : [];
  }
  return project.status === "open" && viewer.isArtist ? ["claim"] : [];
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  claimed: "Taken",
  in_progress: "In progress",
  review: "Delivered",
  revision: "Changes requested",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  submitted: "Waiting for review",
  approved: "Approved",
  revision_requested: "Changes requested",
};

export function deliverableStatusLabel(status: string): string {
  return DELIVERABLE_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** One sentence telling this viewer what happens next. */
export function projectHint(
  project: Pick<VersaVidsProject, "status" | "videasteName">,
  role: ProjectRole,
): string {
  const artist = project.videasteName ?? "The artist";
  if (role === "client") {
    switch (project.status) {
      case "open":
        return "Waiting for an artist to take your project.";
      case "claimed":
        return `${artist} took your project and will start soon.`;
      case "in_progress":
        return `${artist} is working on your project.`;
      case "review":
        return "A delivery is ready. Watch it, then approve it or ask for changes.";
      case "revision":
        return `You asked for changes. Waiting for ${artist}'s new version.`;
      case "completed":
        return "You approved the delivery. This project is complete.";
      case "cancelled":
        return "You cancelled this project.";
    }
  }
  if (role === "videaste") {
    switch (project.status) {
      case "claimed":
      case "in_progress":
        return "Deliver your work as a link when it is ready.";
      case "review":
        return "Delivered. Waiting for the client to approve or ask for changes.";
      case "revision":
        return "The client asked for changes. Deliver a new version.";
      case "completed":
        return "The client approved your delivery.";
      case "cancelled":
        return "The client cancelled this project.";
    }
  }
  return project.status === "open"
    ? "Open to artists."
    : statusLabel(project.status);
}

export function latestDeliverable(
  deliverables: VersaVidsDeliverable[],
): VersaVidsDeliverable | null {
  return deliverables.reduce<VersaVidsDeliverable | null>(
    (best, d) =>
      !best ||
      d.version > best.version ||
      (d.version === best.version && d.id > best.id)
        ? d
        : best,
    null,
  );
}

export function nextVersion(deliverables: VersaVidsDeliverable[]): number {
  return (latestDeliverable(deliverables)?.version ?? 0) + 1;
}

/** The artist's board: what they took, and what is still open for anyone. */
export function splitArtistBoard(
  projects: VersaVidsProject[],
  viewerId: number | null,
): { mine: VersaVidsProject[]; open: VersaVidsProject[] } {
  return {
    mine: projects.filter((p) => viewerId !== null && p.claimedBy === viewerId),
    open: projects.filter(
      (p) =>
        p.status === "open" && (viewerId === null || p.clientId !== viewerId),
    ),
  };
}

const TITLE_MAX = 200;
const NOTES_MAX = 2000;

export type FormCheck<T> = ({ ok: true } & T) | { ok: false; error: string };

export function checkDelivery(input: {
  title: string;
  url: string;
  notes: string;
}): FormCheck<{ title: string; url: string; notes: string | null }> {
  const title = input.title.trim();
  if (!title) {
    return {
      ok: false,
      error: "Give this delivery a title, for example “Final cut”.",
    };
  }
  if (title.length > TITLE_MAX) {
    return {
      ok: false,
      error: `The title is too long (${TITLE_MAX} characters at most).`,
    };
  }
  const url = parseDeliveryUrl(input.url);
  if (!url) {
    return {
      ok: false,
      error:
        "Paste a link that starts with https:// (Vimeo, YouTube, Google Drive, Dropbox…).",
    };
  }
  const notes = input.notes.trim();
  if (notes.length > NOTES_MAX) {
    return {
      ok: false,
      error: `The notes are too long (${NOTES_MAX} characters at most).`,
    };
  }
  return { ok: true, title, url, notes: notes || null };
}

export function checkChangeRequest(input: string): FormCheck<{ note: string }> {
  const note = input.trim();
  if (!note) return { ok: false, error: "Tell the artist what to change." };
  if (note.length > NOTES_MAX) {
    return {
      ok: false,
      error: `The note is too long (${NOTES_MAX} characters at most).`,
    };
  }
  return { ok: true, note };
}

// The budget column is DECIMAL(10,2): anything above this would be a server error.
const BUDGET_MAX_CENTS = 9_999_999_999;
export const BUDGET_MAX = BUDGET_MAX_CENTS / 100;

export function parseBudgetInput(
  input: string,
): FormCheck<{ value: number | null }> {
  // "1500,50" is how many French users type a decimal.
  const raw = input.trim().replace(",", ".");
  if (!raw) return { ok: true, value: null };
  // Plain decimals only: Number() would also accept "0x10" and "1e3".
  const cents = /^(\d+\.?\d*|\.\d+)$/.test(raw)
    ? Math.round(Number(raw) * 100)
    : NaN;
  if (!Number.isSafeInteger(cents) || cents > BUDGET_MAX_CENTS) {
    return {
      ok: false,
      error: "Enter a budget between 0 and 99,999,999.99, or leave it empty.",
    };
  }
  return { ok: true, value: cents > 0 ? cents / 100 : null };
}

export function formatBudget(
  budget: number | null,
  currency: string,
): string | null {
  if (budget === null) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(budget) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(budget);
  } catch {
    return `${budget} ${currency}`;
  }
}

// video_briefs.resolution is VARCHAR(10): send the short code ("4K"), never the
// label ("1080p Full HD"), which the database refuses.
export function resolutionCode(id: string): string {
  return id.replace(/k$/i, "K").slice(0, 10);
}

const FORMAT_LABELS: Record<string, string> = {
  mp4: "MP4",
  mov: "MOV / ProRes",
  webm: "WebM",
  gif: "GIF",
  "png-seq": "PNG sequence",
  raw: "RAW project files",
};

export function formatLabel(id: string): string {
  return FORMAT_LABELS[id] ?? id.toUpperCase();
}

/** Where a delivery link leads, so the client sees it before clicking. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "link";
  } catch {
    return "link";
  }
}

// A stored deadline is a UTC date: showing it in local time could move it a day.
export function formatDeadline(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** An address that is safe to put in a mailto: link, otherwise null. */
export function mailtoAddress(value: string | null): string | null {
  const part = `[^\\s@<>"'?&#%,;]+`;
  return value && new RegExp(`^${part}@${part}\\.${part}$`).test(value)
    ? value
    : null;
}
