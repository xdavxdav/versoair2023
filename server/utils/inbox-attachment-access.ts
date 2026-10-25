import { sql, type SQL } from "drizzle-orm";

export const INBOX_ATTACHMENT_URL_PREFIX = "/api/inbox/attachments/file/";

// 1-9 digits stays inside a SERIAL id and rules out leading zeros.
const STORED_ATTACHMENT_URL =
  /^\/api\/inbox\/attachments\/file\/([1-9][0-9]{0,8})$/;

export function inboxAttachmentUrl(id: number): string {
  return `${INBOX_ATTACHMENT_URL_PREFIX}${id}`;
}

/** The attachment id behind a canonical stored URL; null for anything else. */
export function parseInboxAttachmentUrl(url: unknown): number | null {
  if (typeof url !== "string") return null;
  const match = STORED_ATTACHMENT_URL.exec(url);
  return match ? Number(match[1]) : null;
}

/**
 * The user who first put this URL on a message. An honest client only ever
 * attaches what it uploaded itself, so the earliest sender is the uploader.
 */
function firstSenderOf(url: string) {
  return sql`(
    SELECT first_m.sender_id
    FROM inbox_messages first_m
    WHERE first_m.attachment_url = ${url}
    ORDER BY first_m.id
    LIMIT 1
  )`;
}

/**
 * True when one of the user's own conversations holds a message that was sent
 * by the file's owner and points at exactly this URL. It is an equality on
 * purpose: a prefix or LIKE match would let a neighbouring id or a crafted
 * suffix grant access. Requiring the owner as sender means a message someone
 * else wrote about the file never counts, even if an older version of the
 * server accepted it.
 */
function userHasOwnersMessageWithAttachment(
  userId: number,
  url: string,
  owner: SQL,
) {
  return sql`EXISTS (
    SELECT 1
    FROM inbox_conversations c
    JOIN inbox_messages m ON m.conversation_id = c.id
    WHERE c.user_id = ${userId}
      AND m.attachment_url = ${url}
      AND m.sender_id = ${owner}
  )`;
}

/**
 * Who may read a stored attachment: its uploader, or anyone with the uploader's
 * message carrying it in their own conversation. Uploads from before the
 * uploader was recorded (uploaded_by IS NULL) are reachable through messages
 * only, and the first sender stands in for the uploader.
 */
export function attachmentReadableBy(userId: number, attachmentId: number) {
  const url = inboxAttachmentUrl(attachmentId);
  return sql`inbox_attachments.id = ${attachmentId}
    AND (
      inbox_attachments.uploaded_by = ${userId}
      OR ${userHasOwnersMessageWithAttachment(
        userId,
        url,
        sql`COALESCE(inbox_attachments.uploaded_by::text, ${firstSenderOf(url)})`,
      )}
    )`;
}

/**
 * Who may put a stored attachment on a message: only its uploader. Otherwise
 * posting someone else's attachment URL into your own conversation would make
 * you a participant of it and let you read it.
 */
export function attachmentUploadedBy(userId: number, attachmentId: number) {
  return sql`inbox_attachments.id = ${attachmentId}
    AND inbox_attachments.uploaded_by = ${userId}`;
}

/** Older uploads lived on disk with no owner record; the first sender's message in the user's own conversation is the only grant. */
export function legacyFileReadableBy(userId: number, filename: string) {
  const url = `${INBOX_ATTACHMENT_URL_PREFIX}${filename}`;
  return userHasOwnersMessageWithAttachment(userId, url, firstSenderOf(url));
}
