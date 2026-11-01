/**
 * Helpers for the "please add this" request emails sent to the admin team.
 * Everything a visitor types ends up inside an HTML email, so every value is
 * escaped and length-capped here, in one place.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function toText(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).replace(CONTROL_CHARACTERS, "");
  }
  return "";
}

export function escapeHtml(value: unknown): string {
  return toText(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Names, subjects and other short fields: one line, trimmed, capped. */
export function oneLine(value: unknown, max = 200): string {
  return toText(value).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Descriptions: keeps the line breaks, trimmed, capped. */
export function multiLine(value: unknown, max = 2000): string {
  return toText(value).replace(/\r\n?/g, "\n").trim().slice(0, max);
}

/** Only http(s) links are ever turned into clickable links. */
export function safeHttpUrl(value: unknown): string | null {
  const text = oneLine(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export type RequestEmailKind = "business" | "artist" | "job";

export interface RequestEmailField {
  label: string;
  value: unknown;
  /** Render the value as a link when it is a valid http(s) URL. */
  link?: boolean;
}

export interface RequestEmailSpec {
  kind: RequestEmailKind;
  heading: string;
  subheading: string;
  intro: string;
  title: string;
  subtitle?: string;
  refId: string;
  /** Fields with an empty value are left out. */
  fields: RequestEmailField[];
  note: string;
  dashboardUrl: string;
  year?: number;
}

const THEMES: Record<
  RequestEmailKind,
  { gradient: string; accent: string; badgeBg: string; badgeText: string; card: string }
> = {
  business: {
    gradient: "linear-gradient(135deg, #bf831c 0%, #d4a037 100%)",
    accent: "#bf831c",
    badgeBg: "#fff3cd",
    badgeText: "#856404",
    card: "#f8f9fa",
  },
  artist: {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    accent: "#7c3aed",
    badgeBg: "#ede9fe",
    badgeText: "#6d28d9",
    card: "#f5f3ff",
  },
  job: {
    gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    accent: "#2563eb",
    badgeBg: "#dbeafe",
    badgeText: "#1d4ed8",
    card: "#eff6ff",
  },
};

function renderField(field: RequestEmailField): string {
  const text = toText(field.value).trim();
  if (!text) return "";

  const url = field.link ? safeHttpUrl(text) : null;
  const value = url
    ? `<a href="${escapeHtml(url)}" style="color: #1db954;">${escapeHtml(url)}</a>`
    : escapeHtml(text);

  return `<div class="field"><span class="field-label">${escapeHtml(field.label)}</span><span class="field-value">${value}</span></div>`;
}

export function renderRequestEmail(spec: RequestEmailSpec): string {
  const theme = THEMES[spec.kind];
  const year = spec.year ?? new Date().getFullYear();
  const subtitle = spec.subtitle
    ? `<p style="margin: 0 0 8px; color: #475569; font-size: 14px;">${escapeHtml(spec.subtitle)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: ${theme.gradient}; color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
      .header h1 { margin: 0; font-size: 22px; }
      .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
      .body { background: white; padding: 32px 24px; }
      .field { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; }
      .field-label { color: #666; font-size: 14px; min-width: 130px; font-weight: 600; }
      .field-value { color: #1a1a2e; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
      .badge { display: inline-block; background: ${theme.badgeBg}; color: ${theme.badgeText}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
      .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; background: ${theme.accent}; color: white !important; }
      .footer { background: #1a1a2e; padding: 24px; text-align: center; font-size: 12px; color: #888; border-radius: 0 0 12px 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${escapeHtml(spec.heading)}</h1>
        <p>${escapeHtml(spec.subheading)}</p>
      </div>
      <div class="body">
        <p>Hi Admin,</p>
        <p>${escapeHtml(spec.intro)}</p>

        <div style="background: ${theme.card}; border-left: 4px solid ${theme.accent}; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 4px; color: #1a1a2e;">${escapeHtml(spec.title)}</h3>
          ${subtitle}
          <span class="badge">⏳ Pending Review</span>
        </div>

        <div style="margin: 20px 0;">
          <div class="field"><span class="field-label">Reference</span><span class="field-value">${escapeHtml(spec.refId)}</span></div>
          ${spec.fields.map(renderField).join("\n          ")}
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(spec.dashboardUrl)}" class="btn">Review in Dashboard</a>
        </div>

        <p style="font-size: 13px; color: #888; text-align: center;">${escapeHtml(spec.note)}</p>
      </div>
      <div class="footer">
        <p><strong>Verso Air</strong> — Business Intelligence Platform</p>
        <p>© ${year} Verso Air. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;
}
