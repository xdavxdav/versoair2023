/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — Startup Table Migration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Runs on every server boot. Ensures ALL 55 schema tables exist via
 * `CREATE TABLE IF NOT EXISTS`. This is critical for Render + Neon deployments
 * where drizzle-kit push cannot be run interactively.
 *
 * Safe to run repeatedly — every statement is idempotent.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { pool } from "../db";

export async function ensureAllTables(): Promise<void> {
  if (process.env.DISABLE_DB_CHECK === "true") {
    console.warn(
      "⚠️ [MIGRATE] DISABLE_DB_CHECK=true — skipping schema boot check.",
    );
    return;
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err: any) {
    console.warn(
      "⚠️ [MIGRATE] Database unavailable during boot check; skipping schema migration.",
      err?.message || err,
    );
    return;
  }

  const startTime = Date.now();
  let created = 0;
  let existed = 0;
  let failed = 0;

  try {
    console.log("🏗️  [MIGRATE] Ensuring all schema tables exist...");

    // Get list of existing tables to report accurately
    const { rows: existingTables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const existingSet = new Set(existingTables.map((r) => r.table_name));

    for (const stmt of TABLE_STATEMENTS) {
      try {
        await client.query(stmt.sql);
        if (existingSet.has(stmt.table)) {
          existed++;
        } else {
          created++;
          console.log(`  ✅ Created table: ${stmt.table}`);
        }
      } catch (err: any) {
        failed++;
        console.error(
          `  ❌ Failed to ensure table ${stmt.table}:`,
          err.message,
        );
      }
    }

    // ── Column drift fix: ensure users table has all schema columns ──
    // Tables created before schema updates may be missing newer columns.
    const USERS_COLUMN_ADDITIONS = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gate_username TEXT UNIQUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access JSONB DEFAULT '["general"]'`,
    ];
    for (const alt of USERS_COLUMN_ADDITIONS) {
      try {
        await client.query(alt);
      } catch (_) {
        // Column may already exist — that's fine
      }
    }

    // ── Column drift: businesses branding ──────────────────────────────────
    // Drizzle includes logo_url in every business insert, so older databases
    // must receive this column before GeoAdmin can create a business.
    const BUSINESSES_COLUMN_ADDITIONS = [
      `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT`,
    ];
    for (const alt of BUSINESSES_COLUMN_ADDITIONS) {
      await client.query(alt);
    }

    // ── Column drift: streaming_plans + backfill download quotas per tier ──
    const STREAMING_PLANS_ADDITIONS = [
      `ALTER TABLE streaming_plans ADD COLUMN IF NOT EXISTS downloads_per_month INTEGER DEFAULT 0`,
    ];
    for (const alt of STREAMING_PLANS_ADDITIONS) {
      try {
        await client.query(alt);
      } catch (_) {
        /* fine */
      }
    }
    // Backfill known plan quotas (only touches rows that currently have 0/NULL)
    const PLAN_QUOTA_UPDATES: Array<[string, number]> = [
      ["Gratuit", 0],
      ["Supporter", 5],
      ["Champion", 20],
      ["Patron", -1], // -1 = unlimited
    ];
    for (const [name, quota] of PLAN_QUOTA_UPDATES) {
      try {
        await client.query(
          `UPDATE streaming_plans SET downloads_per_month = $1
             WHERE name = $2 AND (downloads_per_month IS NULL OR downloads_per_month = 0)`,
          [quota, name],
        );
      } catch (_) {
        /* streaming_plans may not exist yet on first boot — will be created above */
      }
    }

    // ── Column drift: inbox_messages — publish-to-community (viral DM) support ──
    const INBOX_MESSAGES_ADDITIONS = [
      `ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS published_post_id INTEGER`,
    ];
    for (const alt of INBOX_MESSAGES_ADDITIONS) {
      try {
        await client.query(alt);
      } catch (_) {
        /* inbox_messages may not exist yet on first boot, or column already exists */
      }
    }

    // Create indexes after all tables exist (separate pass to avoid FK issues)
    for (const idx of INDEX_STATEMENTS) {
      try {
        await client.query(idx);
      } catch (_) {
        // Indexes may already exist — that's fine
      }
    }

    // ── Protected account: joel_007 must never be deletable ──
    // Enforced at the DATABASE level via a trigger so it can't be bypassed
    // by any code path (admin panel, raw SQL executor, ORM, cascades, etc.).
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION protect_joel_007()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.username = 'joel_007' OR OLD.gate_username = 'joel_007' THEN
            RAISE EXCEPTION 'The joel_007 account cannot be deleted';
          END IF;
          RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await client.query(`
        DROP TRIGGER IF EXISTS trg_protect_joel_007 ON users;
      `);
      await client.query(`
        CREATE TRIGGER trg_protect_joel_007
        BEFORE DELETE ON users
        FOR EACH ROW
        EXECUTE FUNCTION protect_joel_007();
      `);
      console.log("🔒 [MIGRATE] joel_007 deletion protection trigger active");
    } catch (err: any) {
      console.error(
        "  ❌ Failed to install joel_007 protection trigger:",
        err.message,
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `🏗️  [MIGRATE] Done in ${duration}ms — ${created} created, ${existed} already existed, ${failed} failed`,
    );
  } catch (err: any) {
    console.error("❌ [MIGRATE] Fatal migration error:", err.message);
  } finally {
    client.release();
  }
}

// ─── Table Definitions ────────────────────────────────────────────────────────
// Order matters: parent tables (no foreign keys) first, then children.

interface TableDef {
  table: string;
  sql: string;
}

const TABLE_STATEMENTS: TableDef[] = [
  // ═══════════════════════════════════════════════
  // 1. GEOGRAPHY & IDENTITY (no dependencies)
  // ═══════════════════════════════════════════════
  {
    table: "countries",
    sql: `CREATE TABLE IF NOT EXISTS countries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code CHAR(2) NOT NULL UNIQUE
    )`,
  },
  {
    table: "regions",
    sql: `CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      country_id INTEGER REFERENCES countries(id)
    )`,
  },
  {
    table: "cities",
    sql: `CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      region_name TEXT,
      region_id INTEGER REFERENCES regions(id),
      country_id INTEGER REFERENCES countries(id)
    )`,
  },

  // ═══════════════════════════════════════════════
  // 2. USERS (core — referenced by most tables)
  // ═══════════════════════════════════════════════
  {
    table: "users",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_verified BOOLEAN DEFAULT false,
      subscription_tier VARCHAR DEFAULT 'free',
      subscription_status VARCHAR DEFAULT 'active',
      premium_expires_at TIMESTAMP,
      trial_tier VARCHAR,
      trial_started_at TIMESTAMP,
      trial_expires_at TIMESTAMP,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      password_reset_token TEXT,
      password_reset_expires TIMESTAMP,
      verified_at TIMESTAMP,
      referral_code VARCHAR(12) UNIQUE,
      referred_by INTEGER,
      stripe_customer_id VARCHAR(255),
      oauth_provider VARCHAR(20),
      oauth_provider_id TEXT,
      gate_username TEXT UNIQUE,
      portal_access JSONB DEFAULT '["general"]',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "verification_tokens",
    sql: `CREATE TABLE IF NOT EXISTS verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'email_verification',
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 3. DIRECTORY CORE
  // ═══════════════════════════════════════════════
  {
    table: "business_categories",
    sql: `CREATE TABLE IF NOT EXISTS business_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_id INTEGER,
      description TEXT,
      main_category BOOLEAN DEFAULT false
    )`,
  },
  {
    table: "businesses",
    sql: `CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER REFERENCES users(id),
      category_id INTEGER REFERENCES business_categories(id),
      city_id INTEGER REFERENCES cities(id),
      description TEXT,
      phone VARCHAR,
      email VARCHAR,
      address TEXT,
      location TEXT,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      country_code VARCHAR,
      country_id INTEGER,
      region_id INTEGER,
      city_name VARCHAR,
      rating DECIMAL DEFAULT 0.0,
      reviews_count INTEGER DEFAULT 0,
      popularity_score INTEGER DEFAULT 0,
      is_advertiser BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      verified_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      is_premium BOOLEAN DEFAULT false,
      featured BOOLEAN DEFAULT false,
      ad_balance DECIMAL DEFAULT 0,
      ad_status VARCHAR,
      contact_info JSONB,
      website TEXT,
      social_links JSONB,
      opening_hours JSONB,
      attributes JSONB DEFAULT '{}',
      tags JSONB DEFAULT '[]',
      keywords JSONB,
      amenities JSONB DEFAULT '[]',
      reviews INTEGER DEFAULT 0,
      business_type VARCHAR,
      migrated_from_table VARCHAR,
      search_vector TEXT,
      approval_status VARCHAR DEFAULT 'approved',
      submitted_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      approval_notes TEXT,
      pdf_path TEXT,
      tier VARCHAR DEFAULT 'free',
      tier_expires_at TIMESTAMP,
      logo_url TEXT,
      verification_status VARCHAR DEFAULT 'unverified',
      verification_documents JSONB DEFAULT '[]',
      avg_response_time_hours DECIMAL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "business_services",
    sql: `CREATE TABLE IF NOT EXISTS business_services (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price DECIMAL(10,2),
      category VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 4. MUSIC & ARTISTS
  // ═══════════════════════════════════════════════
  {
    table: "artists",
    sql: `CREATE TABLE IF NOT EXISTS artists (
      id SERIAL PRIMARY KEY,
      business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      stage_name TEXT NOT NULL,
      genre VARCHAR(100),
      label_status VARCHAR DEFAULT 'unsigned',
      spotify_url TEXT,
      country_code VARCHAR(2)
    )`,
  },
  {
    table: "contractors",
    sql: `CREATE TABLE IF NOT EXISTS contractors (
      id SERIAL PRIMARY KEY,
      business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      email VARCHAR,
      phone VARCHAR,
      specialization TEXT,
      hourly_rate DECIMAL,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "payment_card_types",
    sql: `CREATE TABLE IF NOT EXISTS payment_card_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code VARCHAR(10) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "saved_payment_methods",
    sql: `CREATE TABLE IF NOT EXISTS saved_payment_methods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
      stripe_customer_id VARCHAR(255) NOT NULL,
      card_brand VARCHAR(30),
      card_last4 VARCHAR(4),
      card_exp_month INTEGER,
      card_exp_year INTEGER,
      cardholder_name TEXT,
      billing_email VARCHAR(255),
      billing_phone VARCHAR(50),
      billing_address_line1 TEXT,
      billing_address_line2 TEXT,
      billing_city VARCHAR(100),
      billing_state VARCHAR(100),
      billing_postal_code VARCHAR(20),
      billing_country VARCHAR(2),
      card_country VARCHAR(2),
      card_funding VARCHAR(20),
      card_issuer VARCHAR(100),
      card_fingerprint VARCHAR(64),
      cvc_check VARCHAR(20),
      is_default BOOLEAN DEFAULT false,
      label VARCHAR(100),
      preauthorized BOOLEAN DEFAULT false,
      max_charge_amount DECIMAL(12,2),
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "ngo_charges",
    sql: `CREATE TABLE IF NOT EXISTS ngo_charges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_method_id INTEGER REFERENCES saved_payment_methods(id),
      user_id INTEGER REFERENCES users(id),
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      description TEXT,
      category VARCHAR(50),
      stripe_payment_intent_id VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      receipt_url TEXT,
      processed_by INTEGER REFERENCES users(id),
      refunded_at TIMESTAMP,
      refund_reason TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 5. MUSIC TRACKS
  // ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════
  // 5b. SOCIAL PLATFORM (posts, comments, likes, follows, notifications)
  // ═══════════════════════════════════════════════
  {
    table: "social_users",
    sql: `CREATE TABLE IF NOT EXISTS social_users (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT,
      avatar_url TEXT,
      cover_image_url TEXT,
      location TEXT,
      website TEXT,
      profession TEXT,
      company TEXT,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      post_count INTEGER DEFAULT 0,
      engagement_score DECIMAL(10,2) DEFAULT 0,
      satisfaction_rating DECIMAL(3,2) DEFAULT 0,
      verified_badge BOOLEAN DEFAULT false,
      premium_member BOOLEAN DEFAULT false,
      dark_mode_enabled BOOLEAN DEFAULT true,
      notifications_enabled BOOLEAN DEFAULT true,
      privacy_level TEXT DEFAULT 'public',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_active_at TIMESTAMP
    )`,
  },
  {
    table: "social_posts",
    sql: `CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES social_users(id),
      title TEXT,
      content TEXT NOT NULL,
      image_urls TEXT[],
      video_url TEXT,
      media_type TEXT,
      post_type TEXT DEFAULT 'discussion',
      faq_category TEXT,
      is_resolved BOOLEAN DEFAULT false,
      tags TEXT[],
      mentioned_users INTEGER[],
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      share_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      engagement_score DECIMAL(10,2) DEFAULT 0,
      engagement_rate DECIMAL(5,2) DEFAULT 0,
      is_trending BOOLEAN DEFAULT false,
      is_pinned BOOLEAN DEFAULT false,
      is_edited BOOLEAN DEFAULT false,
      edit_history JSONB,
      metadata JSONB,
      track_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    )`,
  },
  {
    table: "social_comments",
    sql: `CREATE TABLE IF NOT EXISTS social_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES social_posts(id),
      author_id INTEGER NOT NULL REFERENCES social_users(id),
      parent_comment_id INTEGER REFERENCES social_comments(id),
      content TEXT NOT NULL,
      like_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      is_edited BOOLEAN DEFAULT false,
      edit_history JSONB,
      mentioned_users INTEGER[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    )`,
  },
  {
    table: "social_likes",
    sql: `CREATE TABLE IF NOT EXISTS social_likes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES social_users(id),
      post_id INTEGER REFERENCES social_posts(id),
      comment_id INTEGER REFERENCES social_comments(id),
      like_type TEXT DEFAULT 'post',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "social_followers",
    sql: `CREATE TABLE IF NOT EXISTS social_followers (
      id SERIAL PRIMARY KEY,
      follower_id INTEGER NOT NULL REFERENCES social_users(id),
      following_id INTEGER NOT NULL REFERENCES social_users(id),
      is_close BOOLEAN DEFAULT false,
      is_muted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "social_notifications",
    sql: `CREATE TABLE IF NOT EXISTS social_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES social_users(id),
      from_user_id INTEGER REFERENCES social_users(id),
      post_id INTEGER REFERENCES social_posts(id),
      comment_id INTEGER REFERENCES social_comments(id),
      notification_type TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      read_at TIMESTAMP
    )`,
  },
  {
    table: "music_tracks",
    sql: `CREATE TABLE IF NOT EXISTS music_tracks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id INTEGER,
      album_id INTEGER,
      track_number INTEGER,
      duration INTEGER,
      streams INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      release_date TIMESTAMP,
      genre TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      audio_url TEXT,
      description TEXT,
      price TEXT DEFAULT '0.99',
      downloads INTEGER DEFAULT 0,
      revenue TEXT DEFAULT '0.00',
      status TEXT DEFAULT 'published',
      bpm INTEGER,
      musical_key TEXT,
      mood TEXT,
      cover_art TEXT,
      wiki_url TEXT,
      is_explicit BOOLEAN DEFAULT false,
      lyrics TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 6. JOBS
  // ═══════════════════════════════════════════════
  {
    table: "jobs",
    sql: `CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY,
      title VARCHAR NOT NULL,
      company VARCHAR NOT NULL,
      location VARCHAR,
      type VARCHAR,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      sector VARCHAR DEFAULT 'general',
      country_code VARCHAR(2),
      salary_min INTEGER,
      salary_max INTEGER,
      currency VARCHAR DEFAULT 'USD',
      description TEXT,
      requirements TEXT,
      benefits TEXT,
      skills TEXT,
      experience_level VARCHAR,
      education_level VARCHAR,
      department VARCHAR,
      posted_date DATE,
      application_deadline DATE,
      is_featured BOOLEAN DEFAULT false,
      is_remote BOOLEAN DEFAULT false,
      application_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      status VARCHAR DEFAULT 'active',
      company_logo TEXT,
      company_description TEXT,
      apply_url TEXT,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )`,
  },

  // ═══════════════════════════════════════════════
  // 7. SOCIAL NETWORKING
  // ═══════════════════════════════════════════════
  {
    table: "connections",
    sql: `CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      status VARCHAR DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      accepted_at TIMESTAMP,
      CONSTRAINT unique_connection_pair UNIQUE (requester_id, receiver_id)
    )`,
  },

  // ═══════════════════════════════════════════════
  // 8. FINANCES & REVIEWS
  // ═══════════════════════════════════════════════
  {
    table: "transactions",
    sql: `CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id INTEGER REFERENCES businesses(id),
      user_id INTEGER REFERENCES users(id),
      amount DECIMAL(12,2) NOT NULL,
      type VARCHAR,
      status VARCHAR DEFAULT 'pending',
      reference VARCHAR UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "business_reviews",
    sql: `CREATE TABLE IF NOT EXISTS business_reviews (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      user_id INTEGER REFERENCES users(id),
      rating INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 9. AUDIT & ADMIN
  // ═══════════════════════════════════════════════
  {
    table: "audit_logs",
    sql: `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type VARCHAR,
      entity_id TEXT,
      changes JSONB,
      ip_address VARCHAR,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 10. ADVERTISING
  // ═══════════════════════════════════════════════
  {
    table: "ad_campaigns",
    sql: `CREATE TABLE IF NOT EXISTS ad_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      budget DECIMAL(12,2) NOT NULL,
      status VARCHAR DEFAULT 'active',
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 11. PROPERTIES & HOSPITALITY
  // ═══════════════════════════════════════════════
  {
    table: "properties",
    sql: `CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      location TEXT NOT NULL,
      city VARCHAR NOT NULL,
      country_code VARCHAR(2),
      address TEXT,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      image TEXT,
      images JSONB DEFAULT '[]',
      price DECIMAL(12,2) NOT NULL,
      rating DECIMAL(3,1) DEFAULT 0.0,
      reviews INTEGER DEFAULT 0,
      bedrooms INTEGER,
      bathrooms INTEGER,
      area INTEGER,
      guests INTEGER,
      amenities JSONB DEFAULT '[]',
      verified BOOLEAN DEFAULT false,
      instant_book BOOLEAN DEFAULT false,
      free_cancellation BOOLEAN DEFAULT false,
      discount INTEGER DEFAULT 0,
      featured BOOLEAN DEFAULT false,
      tags JSONB DEFAULT '[]',
      host_name TEXT,
      host_phone VARCHAR,
      host_email VARCHAR,
      superhost BOOLEAN DEFAULT false,
      response_rate INTEGER DEFAULT 100,
      response_time VARCHAR DEFAULT '< 1 hour',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      verification_status VARCHAR DEFAULT 'unverified',
      trust_score INTEGER DEFAULT 0,
      verification_data JSONB DEFAULT '{}'
    )`,
  },

  // ═══════════════════════════════════════════════
  // 12. RESERVATIONS & ANALYTICS
  // ═══════════════════════════════════════════════
  {
    table: "reservations",
    sql: `CREATE TABLE IF NOT EXISTS reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      status VARCHAR DEFAULT 'pending',
      total_price DECIMAL(12,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "analytics",
    sql: `CREATE TABLE IF NOT EXISTS analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR NOT NULL,
      entity_id INTEGER NOT NULL,
      page_views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue DECIMAL(12,2) DEFAULT 0.00,
      period VARCHAR DEFAULT 'daily',
      date TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT unique_analytics_per_entity UNIQUE (entity_id, entity_type, date)
    )`,
  },
  {
    table: "music_analytics",
    sql: `CREATE TABLE IF NOT EXISTS music_analytics (
      id SERIAL PRIMARY KEY,
      total_artists INTEGER DEFAULT 0,
      total_tracks INTEGER DEFAULT 0,
      total_streams INTEGER DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 13. MUSIC ARTISTS (dedicated table)
  // ═══════════════════════════════════════════════
  {
    table: "music_artists",
    sql: `CREATE TABLE IF NOT EXISTS music_artists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      genre TEXT,
      biography TEXT,
      image_url TEXT,
      cover_image_url TEXT,
      country VARCHAR(100),
      country_code VARCHAR(2),
      label_status VARCHAR(20) DEFAULT 'signed',
      spotify_url TEXT,
      wiki_url TEXT,
      instagram_url TEXT,
      twitter_url TEXT,
      website_url TEXT,
      total_streams INTEGER DEFAULT 0,
      monthly_listeners INTEGER DEFAULT 0,
      followers INTEGER DEFAULT 0,
      total_tracks INTEGER DEFAULT 0,
      total_albums INTEGER DEFAULT 0,
      verified BOOLEAN DEFAULT false,
      featured_track_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 14. BUSINESS MESSAGES
  // ═══════════════════════════════════════════════
  {
    table: "business_messages",
    sql: `CREATE TABLE IF NOT EXISTS business_messages (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR NOT NULL,
      sender_role VARCHAR NOT NULL,
      message TEXT NOT NULL,
      message_type VARCHAR DEFAULT 'text',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 15. NOTIFICATIONS
  // ═══════════════════════════════════════════════
  {
    table: "notifications",
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR NOT NULL,
      from_user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT,
      related_entity_type VARCHAR,
      related_entity_id TEXT,
      is_read BOOLEAN DEFAULT false,
      action_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      read_at TIMESTAMP
    )`,
  },

  // ═══════════════════════════════════════════════
  // 16. DIGITAL PASSPORT VERIFICATION
  // ═══════════════════════════════════════════════
  {
    table: "verifications",
    sql: `CREATE TABLE IF NOT EXISTS verifications (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone VARCHAR,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      business_registration_number TEXT,
      manager_id TEXT,
      operational_proof TEXT,
      logo TEXT,
      action_photos JSONB DEFAULT '[]',
      opening_hours JSONB DEFAULT '{}',
      specialties JSONB DEFAULT '[]',
      social_links JSONB DEFAULT '{}',
      medical_license TEXT,
      regulatory_approval TEXT,
      hygiene_inspection TEXT,
      verification_status VARCHAR DEFAULT 'pending',
      admin_notes TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP,
      trust_score_breakdown JSONB DEFAULT '{"basicInfo":0,"legalDocs":0,"marketingAssets":0,"industryCredentials":0}'
    )`,
  },

  // ═══════════════════════════════════════════════
  // 17. TICKETING & SUPPORT
  // ═══════════════════════════════════════════════
  {
    table: "tickets",
    sql: `CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR DEFAULT 'open',
      priority VARCHAR DEFAULT 'medium',
      category VARCHAR DEFAULT 'general',
      reporter TEXT,
      reporter_id INTEGER REFERENCES users(id),
      requester_email VARCHAR,
      assignee_id INTEGER REFERENCES users(id),
      team VARCHAR,
      source VARCHAR DEFAULT 'portal',
      sla_target_hours INTEGER DEFAULT 24,
      sla_breached BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP
    )`,
  },
  {
    table: "ticket_assignments",
    sql: `CREATE TABLE IF NOT EXISTS ticket_assignments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      assigned_from INTEGER REFERENCES users(id),
      assigned_to INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP DEFAULT NOW(),
      notes TEXT
    )`,
  },
  {
    table: "ticket_comments",
    sql: `CREATE TABLE IF NOT EXISTS ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id),
      author_name VARCHAR,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "community_posts",
    sql: `CREATE TABLE IF NOT EXISTS community_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name VARCHAR,
      author_avatar TEXT,
      content TEXT NOT NULL,
      parent_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
      is_hidden BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 18. USER SETTINGS
  // ═══════════════════════════════════════════════
  {
    table: "user_settings",
    sql: `CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sector VARCHAR(50) NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value TEXT,
      data_type VARCHAR(20) DEFAULT 'string',
      description TEXT,
      default_value TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT user_settings_user_sector_key UNIQUE (user_id, sector, setting_key)
    )`,
  },
  {
    table: "settings_templates",
    sql: `CREATE TABLE IF NOT EXISTS settings_templates (
      id SERIAL PRIMARY KEY,
      sector VARCHAR(50) NOT NULL UNIQUE,
      template_data JSONB NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 19. EMAIL SUBSCRIPTIONS & QUEUE
  // ═══════════════════════════════════════════════
  {
    table: "email_subscriptions",
    sql: `CREATE TABLE IF NOT EXISTS email_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      frequency VARCHAR(30) DEFAULT 'daily_digest',
      is_active BOOLEAN DEFAULT true,
      filters JSONB DEFAULT '{}',
      unsubscribe_token TEXT NOT NULL UNIQUE,
      last_sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT email_sub_user_type_uniq UNIQUE (user_id, type)
    )`,
  },
  {
    table: "email_queue",
    sql: `CREATE TABLE IF NOT EXISTS email_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID REFERENCES email_subscriptions(id) ON DELETE SET NULL,
      recipient_email TEXT NOT NULL,
      recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      html_body TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      scheduled_at TIMESTAMP DEFAULT NOW(),
      sent_at TIMESTAMP,
      error TEXT,
      retry_count INTEGER DEFAULT 0,
      email_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 20. VERSO AIR CARD — Stripe Issuing
  // ═══════════════════════════════════════════════
  {
    table: "issued_cards",
    sql: `CREATE TABLE IF NOT EXISTS issued_cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_card_id VARCHAR(255) NOT NULL UNIQUE,
      stripe_cardholder_id VARCHAR(255) NOT NULL,
      card_brand VARCHAR(30) DEFAULT 'Visa',
      card_last4 VARCHAR(4),
      card_exp_month INTEGER,
      card_exp_year INTEGER,
      card_type VARCHAR(20) DEFAULT 'virtual',
      card_status VARCHAR(20) DEFAULT 'active',
      spending_limit_amount DECIMAL(12,2),
      spending_limit_interval VARCHAR(20),
      currency VARCHAR(3) DEFAULT 'USD',
      cardholder_name TEXT,
      billing_address_line1 TEXT,
      billing_city VARCHAR(100),
      billing_state VARCHAR(100),
      billing_postal_code VARCHAR(20),
      billing_country VARCHAR(2),
      tier_at_issuance VARCHAR(20),
      points_multiplier DECIMAL(4,2) DEFAULT 1.00,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      canceled_at TIMESTAMP
    )`,
  },
  {
    table: "points_ledger",
    sql: `CREATE TABLE IF NOT EXISTS points_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issued_card_id INTEGER REFERENCES issued_cards(id),
      type VARCHAR(30) NOT NULL,
      points INTEGER NOT NULL,
      balance INTEGER NOT NULL,
      description TEXT,
      stripe_transaction_id VARCHAR(255),
      transaction_amount DECIMAL(12,2),
      transaction_currency VARCHAR(3),
      merchant_name TEXT,
      merchant_category VARCHAR(100),
      base_points INTEGER,
      multiplier DECIMAL(4,2),
      category_bonus DECIMAL(4,2),
      tier_at_earning VARCHAR(20),
      expires_at TIMESTAMP,
      expired_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "points_redemptions",
    sql: `CREATE TABLE IF NOT EXISTS points_redemptions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      reward_type VARCHAR(30) NOT NULL,
      reward_value JSONB,
      is_active BOOLEAN DEFAULT true,
      min_tier VARCHAR(20),
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 21. STREAMROYALE — Competition Platform
  // (These also have CREATE TABLE IF NOT EXISTS in
  // streamroyale.ts but we include them for completeness)
  // ═══════════════════════════════════════════════
  {
    table: "regional_leagues",
    sql: `CREATE TABLE IF NOT EXISTS regional_leagues (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "artist_profiles",
    sql: `CREATE TABLE IF NOT EXISTS artist_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      stage_name TEXT NOT NULL,
      legal_name TEXT,
      genre JSONB DEFAULT '[]',
      country VARCHAR(100),
      country_code VARCHAR(2),
      bio TEXT,
      spotify_url TEXT,
      instagram_handle TEXT,
      profile_image_url TEXT,
      league_id INTEGER,
      lifetime_streams INTEGER DEFAULT 0,
      weekly_streams INTEGER DEFAULT 0,
      current_badge_tier INTEGER DEFAULT 1,
      wallet_balance DECIMAL(12,2) DEFAULT 0.00,
      payout_email TEXT,
      payout_method VARCHAR(20) DEFAULT 'paypal',
      verified_for_payout BOOLEAN DEFAULT false,
      revenue_boost_percent DECIMAL(4,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "streaming_plans",
    sql: `CREATE TABLE IF NOT EXISTS streaming_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      monthly_fee DECIMAL(8,2) NOT NULL,
      stream_limit INTEGER,
      pool_contribution_percent INTEGER NOT NULL,
      boost_credits INTEGER DEFAULT 0,
      downloads_per_month INTEGER DEFAULT 0,
      stripe_price_id VARCHAR(255),
      stripe_product_id VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    // Per-user download event log — used to enforce monthly quota per plan tier
    table: "track_downloads",
    sql: `CREATE TABLE IF NOT EXISTS track_downloads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      plan_tier VARCHAR(50),
      downloaded_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "listener_subscriptions",
    sql: `CREATE TABLE IF NOT EXISTS listener_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES streaming_plans(id),
      status VARCHAR(20) DEFAULT 'active',
      stripe_subscription_id VARCHAR(255),
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      boost_credits_remaining INTEGER DEFAULT 0,
      cancelled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "stream_events",
    sql: `CREATE TABLE IF NOT EXISTS stream_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id),
      track_id INTEGER REFERENCES music_tracks(id),
      artist_profile_id INTEGER REFERENCES artist_profiles(id),
      session_id VARCHAR(64),
      duration INTEGER NOT NULL,
      is_valid BOOLEAN DEFAULT false,
      is_self_stream BOOLEAN DEFAULT false,
      boosted BOOLEAN DEFAULT false,
      boost_multiplier DECIMAL(4,2) DEFAULT 1.00,
      super_stream BOOLEAN DEFAULT false,
      week_number INTEGER NOT NULL,
      year_number INTEGER NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "weekly_pools",
    sql: `CREATE TABLE IF NOT EXISTS weekly_pools (
      id SERIAL PRIMARY KEY,
      week_number INTEGER NOT NULL,
      year_number INTEGER NOT NULL,
      total_pool DECIMAL(12,2) DEFAULT 0.00,
      guaranteed_fund DECIMAL(12,2) DEFAULT 0.00,
      performance_pool DECIMAL(12,2) DEFAULT 0.00,
      platform_cut DECIMAL(12,2) DEFAULT 0.00,
      total_streams INTEGER DEFAULT 0,
      qualifying_artists INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'open',
      distributed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT weekly_pools_week_year_uniq UNIQUE (week_number, year_number)
    )`,
  },
  {
    table: "artist_royalties",
    sql: `CREATE TABLE IF NOT EXISTS artist_royalties (
      id SERIAL PRIMARY KEY,
      artist_profile_id INTEGER NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      year_number INTEGER NOT NULL,
      guaranteed_amount DECIMAL(12,2) DEFAULT 0.00,
      performance_amount DECIMAL(12,2) DEFAULT 0.00,
      badge_bonus DECIMAL(12,2) DEFAULT 0.00,
      tip_income DECIMAL(12,2) DEFAULT 0.00,
      total_earnings DECIMAL(12,2) DEFAULT 0.00,
      stream_count INTEGER DEFAULT 0,
      pool_share_percent DECIMAL(8,4) DEFAULT 0.00,
      global_rank INTEGER,
      regional_rank INTEGER,
      paid_out BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT artist_royalties_artist_week_uniq UNIQUE (artist_profile_id, week_number, year_number)
    )`,
  },
  {
    table: "artist_badges",
    sql: `CREATE TABLE IF NOT EXISTS artist_badges (
      id SERIAL PRIMARY KEY,
      artist_profile_id INTEGER NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
      tier INTEGER NOT NULL,
      badge_name VARCHAR(50) NOT NULL,
      lifetime_streams_at_unlock INTEGER DEFAULT 0,
      revenue_boost_percent DECIMAL(4,2) DEFAULT 0.00,
      unlocked_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "payout_requests",
    sql: `CREATE TABLE IF NOT EXISTS payout_requests (
      id SERIAL PRIMARY KEY,
      artist_profile_id INTEGER NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
      amount DECIMAL(12,2) NOT NULL,
      method VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      paypal_email TEXT,
      bank_details JSONB,
      notes TEXT,
      processed_at TIMESTAMP,
      processed_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ═══════════════════════════════════════════════
  // 22. STREAMING PLATFORM (Social Features)
  // ═══════════════════════════════════════════════
  {
    table: "albums",
    sql: `CREATE TABLE IF NOT EXISTS albums (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE,
      cover_art TEXT,
      release_date TIMESTAMP,
      genre TEXT,
      description TEXT,
      album_type VARCHAR(20) DEFAULT 'album',
      total_tracks INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "playlists",
    sql: `CREATE TABLE IF NOT EXISTS playlists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cover_art TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_public BOOLEAN DEFAULT true,
      is_system BOOLEAN DEFAULT false,
      total_tracks INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0,
      plays INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "playlist_tracks",
    sql: `CREATE TABLE IF NOT EXISTS playlist_tracks (
      id SERIAL PRIMARY KEY,
      playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT playlist_tracks_unique UNIQUE (playlist_id, track_id)
    )`,
  },
  {
    table: "stream_plays",
    sql: `CREATE TABLE IF NOT EXISTS stream_plays (
      id SERIAL PRIMARY KEY,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      artist_id INTEGER REFERENCES music_artists(id),
      duration INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT false,
      session_id VARCHAR(64),
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "track_likes",
    sql: `CREATE TABLE IF NOT EXISTS track_likes (
      id SERIAL PRIMARY KEY,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT track_likes_unique UNIQUE (track_id, user_id)
    )`,
  },
  {
    table: "track_comments",
    sql: `CREATE TABLE IF NOT EXISTS track_comments (
      id SERIAL PRIMARY KEY,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id INTEGER,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "artist_follows",
    sql: `CREATE TABLE IF NOT EXISTS artist_follows (
      id SERIAL PRIMARY KEY,
      artist_id INTEGER NOT NULL REFERENCES music_artists(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT artist_follows_unique UNIQUE (artist_id, user_id)
    )`,
  },
  {
    table: "streaming_subscriptions",
    sql: `CREATE TABLE IF NOT EXISTS streaming_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      tier VARCHAR(20) NOT NULL DEFAULT 'free',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      monthly_price DECIMAL(8,2) DEFAULT 0.00,
      max_downloads_per_month INTEGER DEFAULT 0,
      downloads_used INTEGER DEFAULT 0,
      no_ads BOOLEAN DEFAULT false,
      high_quality BOOLEAN DEFAULT false,
      offline_access BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'active',
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    table: "listening_history",
    sql: `CREATE TABLE IF NOT EXISTS listening_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id INTEGER NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
      played_at TIMESTAMP DEFAULT NOW(),
      duration INTEGER DEFAULT 0
    )`,
  },

  // ═══════════════════════════════════════════════
  // 23. ARTIST CONTRACTS
  // ═══════════════════════════════════════════════
  {
    table: "artist_contracts",
    sql: `CREATE TABLE IF NOT EXISTS artist_contracts (
      id SERIAL PRIMARY KEY,
      artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      email TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      genre VARCHAR(100),
      country VARCHAR(100),
      country_code VARCHAR(2),
      biography TEXT,
      portfolio_url TEXT,
      spotify_url TEXT,
      instagram_url TEXT,
      website_url TEXT,
      sample_track_url TEXT,
      motivation TEXT,
      monthly_listeners INTEGER DEFAULT 0,
      years_active INTEGER DEFAULT 0,
      grade VARCHAR(10) DEFAULT 'pending',
      revenue_share_artist INTEGER DEFAULT 0,
      revenue_share_platform INTEGER DEFAULT 0,
      max_downloads_per_month INTEGER DEFAULT 0,
      audio_quality VARCHAR(10) DEFAULT '128',
      can_be_featured BOOLEAN DEFAULT false,
      has_analytics_access BOOLEAN DEFAULT false,
      has_priority_support BOOLEAN DEFAULT false,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER REFERENCES users(id),
      review_notes TEXT,
      rejection_reason TEXT,
      agreed_to_terms BOOLEAN DEFAULT false,
      agreed_to_rev_share BOOLEAN DEFAULT false,
      applied_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      contract_start_date TIMESTAMP,
      contract_end_date TIMESTAMP,
      last_modified TIMESTAMP DEFAULT NOW()
    )`,
  },
];

// ─── Indexes (created after all tables) ───────────────────────────────────────
const INDEX_STATEMENTS: string[] = [
  // businesses
  `CREATE INDEX IF NOT EXISTS search_idx ON businesses (search_vector)`,
  `CREATE INDEX IF NOT EXISTS rating_ranking_idx ON businesses (rating)`,
  `CREATE INDEX IF NOT EXISTS businesses_created_idx ON businesses (created_at)`,
  // music_tracks
  `CREATE INDEX IF NOT EXISTS music_tracks_artist_idx ON music_tracks (artist_id)`,
  `CREATE INDEX IF NOT EXISTS music_tracks_album_idx ON music_tracks (album_id)`,
  `CREATE INDEX IF NOT EXISTS music_tracks_genre_idx ON music_tracks (genre)`,
  // Browse/streaming queries filter on status ('published') and sort by newest.
  `CREATE INDEX IF NOT EXISTS music_tracks_status_created_idx ON music_tracks (status, created_at DESC)`,
  // connections
  `CREATE INDEX IF NOT EXISTS connections_status_idx ON connections (status)`,
  `CREATE INDEX IF NOT EXISTS connections_requester_idx ON connections (requester_id)`,
  `CREATE INDEX IF NOT EXISTS connections_receiver_idx ON connections (receiver_id)`,
  // properties
  `CREATE INDEX IF NOT EXISTS properties_city_idx ON properties (city)`,
  `CREATE INDEX IF NOT EXISTS properties_type_idx ON properties (type)`,
  `CREATE INDEX IF NOT EXISTS properties_rating_idx ON properties (rating)`,
  // music_artists
  `CREATE INDEX IF NOT EXISTS music_artists_name_idx ON music_artists (name)`,
  `CREATE INDEX IF NOT EXISTS music_artists_genre_idx ON music_artists (genre)`,
  `CREATE INDEX IF NOT EXISTS music_artists_country_idx ON music_artists (country_code)`,
  // business_messages
  `CREATE INDEX IF NOT EXISTS biz_msg_business_idx ON business_messages (business_id)`,
  `CREATE INDEX IF NOT EXISTS biz_msg_created_idx ON business_messages (created_at)`,
  // verifications
  `CREATE INDEX IF NOT EXISTS verification_property_idx ON verifications (property_id)`,
  // tickets
  `CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status)`,
  `CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets (priority)`,
  `CREATE INDEX IF NOT EXISTS tickets_assignee_idx ON tickets (assignee_id)`,
  `CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets (created_at)`,
  // ticket_assignments
  `CREATE INDEX IF NOT EXISTS ticket_assignments_ticket_idx ON ticket_assignments (ticket_id)`,
  `CREATE INDEX IF NOT EXISTS ticket_assignments_assigned_to_idx ON ticket_assignments (assigned_to)`,
  // ticket_comments
  `CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON ticket_comments (ticket_id)`,
  // community_posts
  `CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS community_posts_user_idx ON community_posts (user_id)`,
  `CREATE INDEX IF NOT EXISTS community_posts_parent_idx ON community_posts (parent_id)`,
  // track_downloads
  `CREATE INDEX IF NOT EXISTS track_downloads_user_time_idx ON track_downloads (user_id, downloaded_at DESC)`,
  `CREATE INDEX IF NOT EXISTS track_downloads_track_idx ON track_downloads (track_id)`,
  // user_settings
  `CREATE INDEX IF NOT EXISTS user_settings_user_sector_idx ON user_settings (user_id, sector)`,
  `CREATE INDEX IF NOT EXISTS user_settings_sector_idx ON user_settings (sector)`,
  `CREATE INDEX IF NOT EXISTS user_settings_user_idx ON user_settings (user_id)`,
  // settings_templates
  `CREATE INDEX IF NOT EXISTS settings_templates_sector_idx ON settings_templates (sector)`,
  // email_subscriptions
  `CREATE INDEX IF NOT EXISTS email_sub_user_idx ON email_subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS email_sub_type_idx ON email_subscriptions (type)`,
  `CREATE INDEX IF NOT EXISTS email_sub_active_idx ON email_subscriptions (is_active)`,
  `CREATE INDEX IF NOT EXISTS email_sub_token_idx ON email_subscriptions (unsubscribe_token)`,
  // email_queue
  `CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue (status)`,
  `CREATE INDEX IF NOT EXISTS email_queue_scheduled_idx ON email_queue (scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS email_queue_recipient_idx ON email_queue (recipient_user_id)`,
  // issued_cards
  `CREATE INDEX IF NOT EXISTS issued_cards_user_idx ON issued_cards (user_id)`,
  `CREATE INDEX IF NOT EXISTS issued_cards_status_idx ON issued_cards (card_status)`,
  // points_ledger
  `CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON points_ledger (user_id)`,
  `CREATE INDEX IF NOT EXISTS points_ledger_type_idx ON points_ledger (type)`,
  `CREATE INDEX IF NOT EXISTS points_ledger_expiry_idx ON points_ledger (expires_at)`,
  // artist_profiles
  `CREATE INDEX IF NOT EXISTS artist_profiles_user_idx ON artist_profiles (user_id)`,
  `CREATE INDEX IF NOT EXISTS artist_profiles_league_idx ON artist_profiles (league_id)`,
  `CREATE INDEX IF NOT EXISTS artist_profiles_badge_idx ON artist_profiles (current_badge_tier)`,
  `CREATE INDEX IF NOT EXISTS artist_profiles_streams_idx ON artist_profiles (lifetime_streams)`,
  // listener_subscriptions
  `CREATE INDEX IF NOT EXISTS listener_subs_user_idx ON listener_subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS listener_subs_status_idx ON listener_subscriptions (status)`,
  // stream_events
  `CREATE INDEX IF NOT EXISTS stream_events_user_idx ON stream_events (user_id)`,
  `CREATE INDEX IF NOT EXISTS stream_events_track_idx ON stream_events (track_id)`,
  `CREATE INDEX IF NOT EXISTS stream_events_artist_idx ON stream_events (artist_profile_id)`,
  `CREATE INDEX IF NOT EXISTS stream_events_week_idx ON stream_events (week_number, year_number)`,
  `CREATE INDEX IF NOT EXISTS stream_events_valid_idx ON stream_events (is_valid)`,
  // weekly_pools
  `CREATE INDEX IF NOT EXISTS weekly_pools_status_idx ON weekly_pools (status)`,
  // artist_royalties
  `CREATE INDEX IF NOT EXISTS artist_royalties_week_idx ON artist_royalties (week_number, year_number)`,
  // artist_badges
  `CREATE INDEX IF NOT EXISTS artist_badges_artist_idx ON artist_badges (artist_profile_id)`,
  `CREATE INDEX IF NOT EXISTS artist_badges_tier_idx ON artist_badges (tier)`,
  // payout_requests
  `CREATE INDEX IF NOT EXISTS payout_requests_artist_idx ON payout_requests (artist_profile_id)`,
  `CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON payout_requests (status)`,
  // albums
  `CREATE INDEX IF NOT EXISTS albums_artist_idx ON albums (artist_id)`,
  // playlists
  `CREATE INDEX IF NOT EXISTS playlists_user_idx ON playlists (user_id)`,
  // playlist_tracks
  `CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_idx ON playlist_tracks (playlist_id)`,
  `CREATE INDEX IF NOT EXISTS playlist_tracks_track_idx ON playlist_tracks (track_id)`,
  // stream_plays
  `CREATE INDEX IF NOT EXISTS stream_plays_track_idx ON stream_plays (track_id)`,
  `CREATE INDEX IF NOT EXISTS stream_plays_user_idx ON stream_plays (user_id)`,
  `CREATE INDEX IF NOT EXISTS stream_plays_artist_idx ON stream_plays (artist_id)`,
  `CREATE INDEX IF NOT EXISTS stream_plays_date_idx ON stream_plays (created_at)`,
  // track_likes
  `CREATE INDEX IF NOT EXISTS track_likes_track_idx ON track_likes (track_id)`,
  `CREATE INDEX IF NOT EXISTS track_likes_user_idx ON track_likes (user_id)`,
  // track_comments
  `CREATE INDEX IF NOT EXISTS track_comments_track_idx ON track_comments (track_id)`,
  `CREATE INDEX IF NOT EXISTS track_comments_user_idx ON track_comments (user_id)`,
  // artist_follows
  `CREATE INDEX IF NOT EXISTS artist_follows_artist_idx ON artist_follows (artist_id)`,
  `CREATE INDEX IF NOT EXISTS artist_follows_user_idx ON artist_follows (user_id)`,
  // streaming_subscriptions
  `CREATE INDEX IF NOT EXISTS streaming_subs_user_idx ON streaming_subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS streaming_subs_tier_idx ON streaming_subscriptions (tier)`,
  // listening_history
  `CREATE INDEX IF NOT EXISTS listening_history_user_idx ON listening_history (user_id)`,
  `CREATE INDEX IF NOT EXISTS listening_history_date_idx ON listening_history (played_at)`,
  // artist_contracts
  `CREATE INDEX IF NOT EXISTS artist_contracts_email_idx ON artist_contracts (email)`,
  `CREATE INDEX IF NOT EXISTS artist_contracts_status_idx ON artist_contracts (status)`,
  `CREATE INDEX IF NOT EXISTS artist_contracts_grade_idx ON artist_contracts (grade)`,
  `CREATE INDEX IF NOT EXISTS artist_contracts_artist_idx ON artist_contracts (artist_id)`,
  // ── unified_profiles ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS unified_profiles (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    slug VARCHAR(255) UNIQUE,
    category VARCHAR(120),
    description TEXT,
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    website TEXT,
    social_links JSONB DEFAULT '{}',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    city_id INTEGER REFERENCES cities(id),
    region_id INTEGER REFERENCES regions(id),
    country_id INTEGER REFERENCES countries(id),
    country_code VARCHAR(2),
    city_name VARCHAR(120),
    is_verified BOOLEAN DEFAULT false,
    verification_status VARCHAR(30) DEFAULT 'pending',
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'DRAFT',
    approved_by INTEGER REFERENCES users(id),
    approval_notes TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    profile_image_url TEXT,
    rating DECIMAL(3,1),
    review_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    legacy_business_id INTEGER,
    legacy_artist_profile_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS up_owner_idx ON unified_profiles (owner_id)`,
  `CREATE INDEX IF NOT EXISTS up_status_idx ON unified_profiles (status)`,
  `CREATE INDEX IF NOT EXISTS up_verification_idx ON unified_profiles (verification_status)`,
  `CREATE INDEX IF NOT EXISTS up_account_type_idx ON unified_profiles (account_type)`,
  `CREATE INDEX IF NOT EXISTS up_published_idx ON unified_profiles (status, is_verified)`,
  `CREATE INDEX IF NOT EXISTS up_geo_idx ON unified_profiles (latitude, longitude)`,
  // ── profile_approval_actions (flat audit log) ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS profile_approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id INTEGER NOT NULL REFERENCES unified_profiles(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS paa_profile_idx ON profile_approval_actions (profile_id)`,
  `CREATE INDEX IF NOT EXISTS paa_admin_idx ON profile_approval_actions (performed_by)`,
];
