/**
 * Idempotent schema & starter-community seed for VXPP Communities.
 */

export const VXPP_COMMUNITIES_SCHEMA_UPGRADES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS vxpp_communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    tagline VARCHAR(120) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(40) NOT NULL DEFAULT 'Business',
    emoji VARCHAR(16) NOT NULL DEFAULT '◎',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS vxpp_communities_created_at_idx ON vxpp_communities (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vxpp_community_members (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES vxpp_communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL DEFAULT 'Member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vxpp_community_members_unique UNIQUE (community_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vxpp_community_members_community_idx ON vxpp_community_members (community_id)`,
  `CREATE TABLE IF NOT EXISTS vxpp_community_posts (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES vxpp_communities(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Member',
    body TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS vxpp_community_posts_community_created_idx ON vxpp_community_posts (community_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS vxpp_community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES vxpp_community_posts(id) ON DELETE CASCADE,
    community_id INTEGER NOT NULL REFERENCES vxpp_communities(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Member',
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS vxpp_community_comments_post_created_idx ON vxpp_community_comments (post_id, created_at ASC)`,
  `CREATE INDEX IF NOT EXISTS vxpp_community_comments_community_idx ON vxpp_community_comments (community_id)`,
  `CREATE TABLE IF NOT EXISTS vxpp_community_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES vxpp_community_posts(id) ON DELETE CASCADE,
    community_id INTEGER NOT NULL REFERENCES vxpp_communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vxpp_community_likes_unique UNIQUE (post_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vxpp_community_likes_community_idx ON vxpp_community_likes (community_id)`,
];

export const STARTER_VXPP_COMMUNITIES = [
  {
    name: "Toronto Trades Network",
    slug: "toronto-trades-network",
    category: "Trades",
    emoji: "⬢",
    tagline: "Plumbers, electricians and builders trading work across the city.",
    description:
      "A working room for the trades. Post overflow work, ask for a supplier, vouch for a crew, or flag a job that needs a second pair of hands.",
  },
  {
    name: "Independent Food Makers",
    slug: "independent-food-makers",
    category: "Food",
    emoji: "✦",
    tagline: "Caterers, bakers and food shops sharing menus, suppliers and pop-ups.",
    description:
      "For the people cooking, baking and selling food on their own terms. Swap supplier leads, plan pop-ups, and test a menu on the group before it goes live.",
  },
  {
    name: "Founders & Operators",
    slug: "founders-operators",
    category: "Business",
    emoji: "▲",
    tagline: "Owners comparing notes on hiring, pricing and the day-to-day.",
    description:
      "Small teams, real numbers. Ask the questions you would not put on LinkedIn — pricing, retainers, first hires, and what actually moved the needle.",
  },
  {
    name: "Clinic & Wellness Circle",
    slug: "clinic-wellness-circle",
    category: "Health",
    emoji: "◈",
    tagline: "Practitioners and clinics coordinating referrals and shared space.",
    description:
      "A referral network for clinics, therapists and practitioners. Share open rooms, cover shifts, and send clients somewhere you trust.",
  },
  {
    name: "Live Music & Venues",
    slug: "live-music-venues",
    category: "Music",
    emoji: "❖",
    tagline: "Bookers, artists and venues putting shows together.",
    description:
      "Who is playing where, who needs a player, and which room is free on a Thursday. Bookers and artists in one thread.",
  },
  {
    name: "Junction Neighbours",
    slug: "junction-neighbours",
    category: "Neighbourhood",
    emoji: "◆",
    tagline: "What is happening around the Junction, block by block.",
    description:
      "Street-level updates from the neighbourhood: openings, closures, road work, and the small things worth knowing.",
  },
] as const;

let ensured = false;

export async function ensureVxppCommunitiesSchema(queryable: {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}): Promise<void> {
  if (ensured) return;
  for (const stmt of VXPP_COMMUNITIES_SCHEMA_UPGRADES) {
    await queryable.query(stmt);
  }
  const existing = await queryable.query(`SELECT COUNT(*)::int AS total FROM vxpp_communities`);
  const total = Number(existing.rows[0]?.total || 0);
  if (total === 0) {
    for (const c of STARTER_VXPP_COMMUNITIES) {
      await queryable.query(
        `INSERT INTO vxpp_communities (name, slug, category, emoji, tagline, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO NOTHING`,
        [c.name, c.slug, c.category, c.emoji, c.tagline, c.description],
      );
    }
  }
  ensured = true;
}

export function resetVxppCommunitiesEnsureForTests(): void {
  ensured = false;
}
