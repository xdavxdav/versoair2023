/**
 * The announcement draft shown next to a session: the text from `buildAnnouncement`, the public
 * link inside it, and the copy step. Nothing here sends anything. The owner pastes the text into
 * WhatsApp by hand, or opens WhatsApp's share chooser with the text filled in.
 */
import { buildAnnouncement, type Announcement } from "./listening-session-announcement";
import { sessionPath, type SessionLang } from "./listening-session-format";

export interface AnnouncementSession {
  id: number;
  title: string;
  hostName: string | null;
  startsAt: string;
}

export type AnnouncementDraft =
  | { ok: true; announcement: Announcement; url: string }
  | { ok: false; message: string };

/** There is no live voice yet, so the text always promises the live chat, never a microphone. */
export function draftAnnouncement(
  session: AnnouncementSession,
  options: { lang: SessionLang; contactName: string; origin: string },
): AnnouncementDraft {
  const url = `${options.origin.replace(/\/+$/, "")}${sessionPath(session.id)}`;
  try {
    const announcement = buildAnnouncement({
      title: session.title,
      hostName: session.hostName,
      startsAt: session.startsAt,
      url,
      lang: options.lang,
      hasVoice: false,
      contactName: options.contactName.trim() || null,
    });
    return { ok: true, announcement, url };
  } catch (error) {
    if (error instanceof RangeError) return { ok: false, message: error.message };
    throw error;
  }
}

export const COPY_FAILED_MESSAGE =
  "Copying did not work in this browser. The text is selected: press Ctrl+C (Cmd+C on a Mac) to copy it.";

export type CopyOutcome = { ok: true } | { ok: false; message: string };

/** `navigator.clipboard` is missing on a page that is not served over HTTPS, and a browser can refuse it. */
export async function copyText(text: string, clipboard: Pick<Clipboard, "writeText"> | null | undefined): Promise<CopyOutcome> {
  if (!clipboard) return { ok: false, message: COPY_FAILED_MESSAGE };
  try {
    await clipboard.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false, message: COPY_FAILED_MESSAGE };
  }
}
