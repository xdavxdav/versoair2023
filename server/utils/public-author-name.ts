/**
 * Names that are safe to show publicly.
 *
 * Some accounts and legacy rows hold an email address where a name belongs
 * (the community wall used to store the poster's email as the author name).
 * Anything containing "@" is treated as an email and is never returned.
 */

const MAX_PUBLIC_NAME_LENGTH = 60;

/** The first candidate that is a short string without "@"; otherwise `fallback`. */
export function safePublicName(
  candidates: readonly unknown[],
  fallback: string,
): string {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const name = candidate.trim().replace(/\s+/g, " ");
    if (
      name.length > 0 &&
      name.length <= MAX_PUBLIC_NAME_LENGTH &&
      !name.includes("@")
    ) {
      return name;
    }
  }
  return fallback;
}

/** Blanks an email-like string; every other value is returned unchanged. */
export function hideEmailLike<T>(value: T): T | null {
  return typeof value === "string" && value.includes("@") ? null : value;
}

interface UserLookup {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

/** The name stored with a new post: the account's display name or handle, never its email. */
export async function resolveAuthorName(
  db: UserLookup,
  userId: unknown,
): Promise<string> {
  const result = await db.query(
    `SELECT display_name, username FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return safePublicName([row?.display_name, row?.username], "Anonymous");
}

/** A post as the public wall may see it: email-like names are blanked, so legacy rows stop leaking too. */
export function toPublicPost(
  post: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...post,
    author_name: hideEmailLike(post.author_name),
    username: hideEmailLike(post.username),
    display_name: hideEmailLike(post.display_name),
  };
}
