import { sql } from "drizzle-orm";

/**
 * Members offered in the "new message" picker.
 *
 * SELECT DISTINCT collapses the join fan-out, and PostgreSQL only allows
 * ORDER BY expressions that appear in a DISTINCT select list. The
 * followed/connected-first ordering therefore runs in an outer query.
 */
export function buildContactsQuery(
  userId: number,
  search: string,
  limit: number,
) {
  const like = `%${search}%`;
  const filter = search
    ? sql`(u.username ILIKE ${like} OR u.display_name ILIKE ${like} OR su.display_name ILIKE ${like})`
    : sql`(uf.is_following = true OR uc.is_connection = true OR ec.conversation_id IS NOT NULL OR u.role IN ('artist', 'business', 'admin'))`;

  return sql`
    WITH user_following AS (
      SELECT DISTINCT su_target.user_id AS target_user_id, true AS is_following
      FROM social_users su_me
      JOIN social_followers sf ON sf.follower_id = su_me.id
      JOIN social_users su_target ON su_target.id = sf.following_id
      WHERE su_me.user_id = ${userId}
    ),
    user_conns AS (
      SELECT DISTINCT
        CASE WHEN requester_id = ${userId} THEN receiver_id ELSE requester_id END AS target_user_id,
        true AS is_connection
      FROM connections
      WHERE (requester_id = ${userId} OR receiver_id = ${userId})
        AND status = 'accepted'
    ),
    existing_convs AS (
      SELECT
        NULLIF(regexp_replace(participant_id, '[^0-9]', '', 'g'), '')::int AS target_user_id,
        id AS conversation_id
      FROM inbox_conversations
      WHERE user_id = ${userId}
    )
    SELECT * FROM (
      SELECT DISTINCT
        u.id,
        COALESCE(u.display_name, su.display_name, u.username) AS name,
        u.username,
        u.role,
        COALESCE(su.avatar_url, null) AS avatar,
        su.bio,
        COALESCE(uf.is_following, false) AS "isFollowing",
        COALESCE(uc.is_connection, false) AS "isConnection",
        ec.conversation_id AS "conversationId"
      FROM users u
      LEFT JOIN social_users su ON su.user_id = u.id
      LEFT JOIN user_following uf ON uf.target_user_id = u.id
      LEFT JOIN user_conns uc ON uc.target_user_id = u.id
      LEFT JOIN existing_convs ec ON ec.target_user_id = u.id
      WHERE u.id != ${userId}
        AND ${filter}
    ) AS contacts
    ORDER BY
      ("isFollowing" OR "isConnection") DESC,
      id DESC
    LIMIT ${limit}
  `;
}
