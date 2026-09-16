CREATE TABLE "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"device" text,
	"ip" varchar(45),
	"country" varchar(2),
	"city" text,
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"revoked_reason" varchar(50),
	"last_active" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "active_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"budget" numeric(12, 2) NOT NULL,
	"status" varchar DEFAULT 'active',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ad_journal_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"type" varchar(20) DEFAULT 'free',
	"status" varchar(20) DEFAULT 'draft',
	"images" jsonb DEFAULT '[]'::jsonb,
	"videos" jsonb DEFAULT '[]'::jsonb,
	"contact_email" varchar,
	"contact_phone" varchar,
	"business_name" text,
	"location" text,
	"expires_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" varchar(120) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist_id" integer,
	"cover_art" text,
	"pochette" text,
	"release_date" timestamp,
	"genre" text,
	"description" text,
	"album_type" varchar(20) DEFAULT 'album',
	"total_tracks" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" integer NOT NULL,
	"page_views" integer DEFAULT 0,
	"unique_visitors" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue" numeric(12, 2) DEFAULT '0.00',
	"period" varchar DEFAULT 'daily',
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_analytics_per_entity" UNIQUE("entity_id","entity_type","date")
);
--> statement-breakpoint
CREATE TABLE "arena_brackets" (
	"id" serial PRIMARY KEY NOT NULL,
	"contest_id" integer NOT NULL,
	"round" integer NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"streams" integer DEFAULT 0,
	"vote_count" integer DEFAULT 0,
	"eliminated" boolean DEFAULT false,
	"eliminated_at" timestamp,
	"seed_position" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "arena_contests" (
	"id" serial PRIMARY KEY NOT NULL,
	"genre" varchar(100) NOT NULL,
	"week_number" integer NOT NULL,
	"year_number" integer NOT NULL,
	"week_start" timestamp NOT NULL,
	"week_end" timestamp NOT NULL,
	"current_round" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'open',
	"winner_id" integer,
	"bonus_pool_percent" integer DEFAULT 30,
	"total_votes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "arena_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"contest_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"stream_count" integer DEFAULT 0,
	"locked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "arena_votes_unique" UNIQUE("contest_id","user_id","artist_profile_id")
);
--> statement-breakpoint
CREATE TABLE "artisan_communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer,
	"name" varchar(180) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"region" varchar(120) NOT NULL,
	"category" varchar(120) NOT NULL,
	"focus" text NOT NULL,
	"description" text NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb,
	"image_url" text,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "artisan_communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "artisan_community_join_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"message" text,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artisan_community_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "artisan_memberships_unique_member" UNIQUE("community_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "artist_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"tier" integer NOT NULL,
	"badge_name" varchar(50) NOT NULL,
	"lifetime_streams_at_unlock" integer DEFAULT 0,
	"revenue_boost_percent" numeric(4, 2) DEFAULT '0.00',
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artist_collaborations" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"track_title" text,
	"revenue_share" integer DEFAULT 50,
	"message" text,
	"genre" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artist_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer,
	"user_id" integer,
	"email" text NOT NULL,
	"stage_name" text NOT NULL,
	"legal_name" text NOT NULL,
	"genre" varchar(100),
	"country" varchar(100),
	"country_code" varchar(2),
	"biography" text,
	"portfolio_url" text,
	"spotify_url" text,
	"instagram_url" text,
	"website_url" text,
	"sample_track_url" text,
	"motivation" text,
	"monthly_listeners" integer DEFAULT 0,
	"years_active" integer DEFAULT 0,
	"grade" varchar(10) DEFAULT 'pending',
	"revenue_share_artist" integer DEFAULT 0,
	"revenue_share_platform" integer DEFAULT 0,
	"max_downloads_per_month" integer DEFAULT 0,
	"audio_quality" varchar(10) DEFAULT '128',
	"can_be_featured" boolean DEFAULT false,
	"has_analytics_access" boolean DEFAULT false,
	"has_priority_support" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"rejection_reason" text,
	"agreed_to_terms" boolean DEFAULT false,
	"agreed_to_rev_share" boolean DEFAULT false,
	"applied_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"contract_start_date" timestamp,
	"contract_end_date" timestamp,
	"last_modified" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artist_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "artist_follows_unique" UNIQUE("artist_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "artist_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stage_name" text NOT NULL,
	"legal_name" text,
	"genre" jsonb DEFAULT '[]'::jsonb,
	"country" varchar(100),
	"country_code" varchar(2),
	"bio" text,
	"spotify_url" text,
	"instagram_handle" text,
	"profile_image_url" text,
	"artist_code" varchar(50),
	"division" varchar(20) DEFAULT 'discovery',
	"evaluation_score" numeric(4, 1),
	"evaluation_status" varchar(20) DEFAULT 'pending',
	"contract_access" varchar(20) DEFAULT 'none',
	"promotion_eligible_at" timestamp,
	"league_id" integer,
	"lifetime_streams" integer DEFAULT 0,
	"weekly_streams" integer DEFAULT 0,
	"current_badge_tier" integer DEFAULT 1,
	"wallet_balance" numeric(12, 2) DEFAULT '0.00',
	"payout_email" text,
	"payout_method" varchar(20) DEFAULT 'paypal',
	"verified_for_payout" boolean DEFAULT false,
	"revenue_boost_percent" numeric(4, 2) DEFAULT '0.00',
	"contest_participation_rate" numeric(5, 2) DEFAULT '0.00',
	"contests_entered" integer DEFAULT 0,
	"contests_won" integer DEFAULT 0,
	"contests_skipped" integer DEFAULT 0,
	"last_contest_at" timestamp,
	"contest_eligible" boolean DEFAULT false,
	"contest_exempt_until" timestamp,
	"artist_role" varchar(30),
	"music_artist_id" integer,
	"legacy_artist_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "artist_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "artist_profiles_artist_code_unique" UNIQUE("artist_code")
);
--> statement-breakpoint
CREATE TABLE "artist_royalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"year_number" integer NOT NULL,
	"guaranteed_amount" numeric(12, 2) DEFAULT '0.00',
	"performance_amount" numeric(12, 2) DEFAULT '0.00',
	"badge_bonus" numeric(12, 2) DEFAULT '0.00',
	"tip_income" numeric(12, 2) DEFAULT '0.00',
	"total_earnings" numeric(12, 2) DEFAULT '0.00',
	"stream_count" integer DEFAULT 0,
	"pool_share_percent" numeric(8, 4) DEFAULT '0.00',
	"global_rank" integer,
	"regional_rank" integer,
	"paid_out" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "artist_royalties_artist_week_uniq" UNIQUE("artist_profile_id","week_number","year_number")
);
--> statement-breakpoint
CREATE TABLE "artist_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"tier" varchar(20) DEFAULT 'spark' NOT NULL,
	"payment_method" varchar(30) DEFAULT 'none',
	"payment_reference" varchar(255),
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"upload_count_this_period" integer DEFAULT 0,
	"boost_credits_remaining" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "artist_subscriptions_artist_profile_id_unique" UNIQUE("artist_profile_id")
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer,
	"user_id" integer,
	"stage_name" text NOT NULL,
	"genre" varchar(100),
	"label_status" varchar DEFAULT 'unsigned',
	"spotify_url" text,
	"country_code" varchar(2)
);
--> statement-breakpoint
CREATE TABLE "assigned_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contractor_id" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"terms" text,
	"deadline" timestamp,
	"payment_amount" numeric(12, 2),
	"status" varchar(20) DEFAULT 'offered' NOT NULL,
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" varchar,
	"entity_id" text,
	"changes" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_transfer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_id" integer NOT NULL,
	"direction" varchar(10) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"bank_reference" varchar(100),
	"proof_image_url" text,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" integer,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"description" text,
	"main_category" boolean DEFAULT false,
	CONSTRAINT "business_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "business_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"sender_id" integer,
	"sender_name" varchar NOT NULL,
	"sender_role" varchar NOT NULL,
	"message" text NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"rating" integer NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" integer,
	"category_id" integer,
	"city_id" integer,
	"description" text,
	"phone" varchar,
	"email" varchar,
	"address" text,
	"location" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"country_code" varchar,
	"country_id" integer,
	"region_id" integer,
	"city_name" varchar,
	"rating" numeric DEFAULT '0.0',
	"reviews_count" integer DEFAULT 0,
	"popularity_score" integer DEFAULT 0,
	"is_advertiser" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"is_active" boolean DEFAULT true,
	"is_premium" boolean DEFAULT false,
	"featured" boolean DEFAULT false,
	"ad_balance" numeric DEFAULT '0',
	"ad_status" varchar,
	"contact_info" jsonb,
	"website" text,
	"social_links" jsonb,
	"opening_hours" jsonb,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"keywords" jsonb,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"reviews" integer DEFAULT 0,
	"business_type" varchar,
	"migrated_from_table" varchar,
	"search_vector" text,
	"approval_status" varchar DEFAULT 'approved',
	"submitted_by" integer,
	"approved_by" integer,
	"approval_notes" text,
	"pdf_path" text,
	"tier" varchar DEFAULT 'free',
	"tier_expires_at" timestamp,
	"logo_url" text,
	"verification_status" varchar DEFAULT 'unverified',
	"verification_documents" jsonb DEFAULT '[]'::jsonb,
	"avg_response_time_hours" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" varchar(64),
	"item_type" varchar(30) NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	"price_snapshot_cents" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_name" text,
	"region_id" integer,
	"country_id" integer
);
--> statement-breakpoint
CREATE TABLE "collab_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_track_id" integer NOT NULL,
	"requesting_artist_id" integer NOT NULL,
	"owner_artist_id" integer NOT NULL,
	"verse_audio_url" text,
	"message" text,
	"status" varchar(20) DEFAULT 'pending',
	"revenue_split_percent" integer DEFAULT 50,
	"result_track_id" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_operation_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(40) NOT NULL,
	"performed_by" integer,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	CONSTRAINT "unique_connection_pair" UNIQUE("requester_id","receiver_id")
);
--> statement-breakpoint
CREATE TABLE "contest_participation_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"division" varchar(20) NOT NULL,
	"min_participation_rate" numeric(5, 2) DEFAULT '0.00',
	"min_badge_tier" integer DEFAULT 1,
	"contests_per_quarter" integer DEFAULT 0,
	"exemption_period_days" integer DEFAULT 90,
	"revenue_multiplier" numeric(4, 2) DEFAULT '1.00',
	"penalty_multiplier" numeric(4, 2) DEFAULT '1.00',
	"description" text,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contest_participation_requirements_division_unique" UNIQUE("division")
);
--> statement-breakpoint
CREATE TABLE "contest_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contest_id" integer NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"stream_count" integer DEFAULT 0,
	"vote_status" varchar(20) DEFAULT 'soft' NOT NULL,
	"locked_at" timestamp,
	"admin_unlock_reason" text,
	"unlocked_by" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "contest_votes_unique" UNIQUE("user_id","contest_id","artist_profile_id")
);
--> statement-breakpoint
CREATE TABLE "contractor_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"specialization" text,
	"hourly_rate" numeric(10, 2),
	"portfolio_url" text,
	"cover_letter" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer,
	"user_id" integer,
	"name" text NOT NULL,
	"email" varchar,
	"phone" varchar,
	"specialization" text,
	"hourly_rate" numeric,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" char(2) NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid,
	"recipient_email" text NOT NULL,
	"recipient_user_id" integer,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"scheduled_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"email_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"frequency" varchar(30) DEFAULT 'daily_digest',
	"is_active" boolean DEFAULT true,
	"filters" jsonb DEFAULT '{}'::jsonb,
	"unsubscribe_token" text NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_subscriptions_unsubscribe_token_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "email_sub_user_type_uniq" UNIQUE("user_id","type")
);
--> statement-breakpoint
CREATE TABLE "evaluation_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"tracks" jsonb,
	"cover_art_url" text,
	"project_title" text,
	"project_notes" text,
	"status" varchar(20) DEFAULT 'pending',
	"scores" jsonb,
	"ai_score" numeric(4, 1),
	"final_score" numeric(4, 1),
	"reviewer_id" integer,
	"reviewer_notes" text,
	"reviewed_at" timestamp,
	"resubmit_after" timestamp,
	"submission_number" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'GOING' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "event_attendees_unique" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"action" varchar(40) NOT NULL,
	"performed_by" integer,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizer_id" integer,
	"community_id" integer,
	"title" varchar(220) NOT NULL,
	"slug" varchar(260) NOT NULL,
	"description" text NOT NULL,
	"event_type" varchar(40) DEFAULT 'COMMUNITY' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"venue" varchar(220),
	"city" varchar(120),
	"image_url" text,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"published_at" timestamp,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_type" varchar(30) NOT NULL,
	"player1_id" integer NOT NULL,
	"player2_id" integer,
	"wager_amount" numeric(10, 2) DEFAULT '0.00',
	"platform_cut" numeric(10, 2) DEFAULT '0.00',
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"winner_id" integer,
	"game_state" jsonb DEFAULT '{}'::jsonb,
	"round_count" integer DEFAULT 5,
	"current_round" integer DEFAULT 0,
	"player1_score" integer DEFAULT 0,
	"player2_score" integer DEFAULT 0,
	"player1_hold_txn_id" uuid,
	"player2_hold_txn_id" uuid,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"round" integer NOT NULL,
	"move_data" jsonb NOT NULL,
	"is_correct" boolean,
	"points_earned" integer DEFAULT 0,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geo_action_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requested_by" integer NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" text,
	"requested_change" jsonb,
	"delay_hours" integer DEFAULT 24 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inbox_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) DEFAULT 'support' NOT NULL,
	"participant_id" text NOT NULL,
	"participant_name" text NOT NULL,
	"participant_avatar" text,
	"last_message" text,
	"last_message_at" timestamp,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"business_id" integer,
	"priority" varchar(10) DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_avatar" text,
	"content" text NOT NULL,
	"attachment_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_ai" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_post_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"name" text NOT NULL,
	"sku" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'Other' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 10 NOT NULL,
	"reorder_quantity" integer DEFAULT 50,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"supplier" text,
	"warehouse_location" text,
	"daily_sales_rate" numeric(10, 2) DEFAULT '0',
	"last_restocked" date,
	"status" varchar(20) DEFAULT 'In Stock' NOT NULL,
	"sector" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issued_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_card_id" varchar(255) NOT NULL,
	"stripe_cardholder_id" varchar(255) NOT NULL,
	"card_brand" varchar(30) DEFAULT 'Visa',
	"card_last4" varchar(4),
	"card_exp_month" integer,
	"card_exp_year" integer,
	"card_type" varchar(20) DEFAULT 'virtual',
	"card_status" varchar(20) DEFAULT 'active',
	"spending_limit_amount" numeric(12, 2),
	"spending_limit_interval" varchar(20),
	"currency" varchar(3) DEFAULT 'USD',
	"cardholder_name" text,
	"billing_address_line1" text,
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_postal_code" varchar(20),
	"billing_country" varchar(2),
	"tier_at_issuance" varchar(20),
	"points_multiplier" numeric(4, 2) DEFAULT '1.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"canceled_at" timestamp,
	CONSTRAINT "issued_cards_stripe_card_id_unique" UNIQUE("stripe_card_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"company" varchar NOT NULL,
	"location" varchar,
	"type" varchar,
	"business_id" integer,
	"sector" varchar DEFAULT 'general',
	"country_code" varchar(2),
	"salary_min" integer,
	"salary_max" integer,
	"currency" varchar DEFAULT 'USD',
	"description" text,
	"requirements" text,
	"benefits" text,
	"skills" text,
	"experience_level" varchar,
	"education_level" varchar,
	"department" varchar,
	"posted_date" date,
	"application_deadline" date,
	"is_featured" boolean DEFAULT false,
	"is_remote" boolean DEFAULT false,
	"application_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"status" varchar DEFAULT 'active',
	"company_logo" text,
	"company_description" text,
	"apply_url" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "journal_editions" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_date" date NOT NULL,
	"type" varchar(20) NOT NULL,
	"file_path" text NOT NULL,
	"listing_count" integer DEFAULT 0,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listener_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" varchar(30) NOT NULL,
	"description" text,
	"points_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listener_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(10),
	"rarity" varchar(20) DEFAULT 'common',
	"earned_at" timestamp DEFAULT now(),
	CONSTRAINT "listener_badges_unique" UNIQUE("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "listener_bonuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bonus_type" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"expires_at" timestamp,
	"claimed" boolean DEFAULT false,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listener_contest_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contest_id" integer NOT NULL,
	"artist_profile_id" integer,
	"reward_type" varchar(30) NOT NULL,
	"xp_awarded" integer DEFAULT 0,
	"claimed" boolean DEFAULT false,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "listener_contest_rewards_unique" UNIQUE("user_id","contest_id","reward_type")
);
--> statement-breakpoint
CREATE TABLE "listener_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_points" integer DEFAULT 0,
	"total_listen_time" integer DEFAULT 0,
	"tracks_played" integer DEFAULT 0,
	"artists_discovered" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "listener_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "listener_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"boost_credits_remaining" integer DEFAULT 0,
	"streams_used_this_week" integer DEFAULT 0,
	"streams_rollover" integer DEFAULT 0,
	"downloads_used_this_month" integer DEFAULT 0,
	"last_stream_reset" timestamp,
	"last_download_reset" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listening_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"track_id" integer NOT NULL,
	"played_at" timestamp DEFAULT now(),
	"duration" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "marketing_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"tier" varchar(20) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb,
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "marketing_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "marketing_print_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_data" "bytea" NOT NULL,
	"file_size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_data" "bytea" NOT NULL,
	"file_size" integer NOT NULL,
	"media_type" varchar(20) DEFAULT 'image',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_artists" integer DEFAULT 0,
	"total_tracks" integer DEFAULT 0,
	"total_streams" integer DEFAULT 0,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "music_artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"genre" text,
	"biography" text,
	"image_url" text,
	"cover_image_url" text,
	"country" varchar(100),
	"country_code" varchar(2),
	"label_status" varchar(20) DEFAULT 'signed',
	"spotify_url" text,
	"wiki_url" text,
	"instagram_url" text,
	"twitter_url" text,
	"website_url" text,
	"total_streams" integer DEFAULT 0,
	"monthly_listeners" integer DEFAULT 0,
	"followers" integer DEFAULT 0,
	"total_tracks" integer DEFAULT 0,
	"total_albums" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"featured_track_id" integer,
	"artist_role" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist_id" integer,
	"album_id" integer,
	"track_number" integer,
	"duration" integer,
	"streams" integer DEFAULT 0,
	"play_count" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"release_date" timestamp,
	"genre" text,
	"file_path" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"audio_url" text,
	"description" text,
	"price" text DEFAULT '0.99',
	"downloads" integer DEFAULT 0,
	"revenue" text DEFAULT '0.00',
	"status" text DEFAULT 'pending_review',
	"bpm" integer,
	"musical_key" text,
	"mood" text,
	"cover_art" text,
	"wiki_url" text,
	"is_explicit" boolean DEFAULT false,
	"lyrics" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"moderation_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"content" text,
	"editor_type" varchar(20) DEFAULT 'tiptap',
	"status" varchar(20) DEFAULT 'draft',
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" integer,
	"name" text,
	"is_active" boolean DEFAULT true,
	"journal_pdf_preference" varchar(20) DEFAULT 'on_demand',
	"unsubscribe_token" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "newsletter_subscribers_email_uniq" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ngo_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_method_id" integer,
	"user_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"description" text,
	"category" varchar(50),
	"stripe_payment_intent_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending',
	"receipt_url" text,
	"processed_by" integer,
	"refunded_at" timestamp,
	"refund_reason" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar NOT NULL,
	"from_user_id" integer,
	"title" text NOT NULL,
	"message" text,
	"related_entity_type" varchar,
	"related_entity_id" text,
	"is_read" boolean DEFAULT false,
	"action_url" text,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"item_type" varchar(30) NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text,
	"quantity" integer DEFAULT 1,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_session_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending',
	"total_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pack_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pack_id" integer NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "paylist_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"track_id" integer NOT NULL,
	"access_type" varchar(20) DEFAULT 'preview' NOT NULL,
	"accessed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paylist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"min_tier_required" integer DEFAULT 1 NOT NULL,
	"is_exclusive" boolean DEFAULT true,
	"curated_rank" integer DEFAULT 0,
	"release_date" timestamp,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "paylist_items_track_uniq" UNIQUE("track_id")
);
--> statement-breakpoint
CREATE TABLE "payment_card_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_card_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_profile_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"paypal_email" text,
	"bank_details" jsonb,
	"notes" text,
	"processed_at" timestamp,
	"processed_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" jsonb NOT NULL,
	"category" varchar(30) DEFAULT 'general' NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "platform_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0.00',
	"currency" varchar(3) DEFAULT 'USD',
	"total_deposited" numeric(14, 2) DEFAULT '0.00',
	"total_withdrawn" numeric(14, 2) DEFAULT '0.00',
	"total_spent" numeric(14, 2) DEFAULT '0.00',
	"total_earned" numeric(14, 2) DEFAULT '0.00',
	"frozen_balance" numeric(14, 2) DEFAULT '0.00',
	"withdrawal_locked" boolean DEFAULT true,
	"status" varchar(20) DEFAULT 'active',
	"last_transaction_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"playlist_id" integer NOT NULL,
	"track_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "playlist_tracks_unique" UNIQUE("playlist_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_art" text,
	"user_id" integer,
	"is_public" boolean DEFAULT true,
	"is_system" boolean DEFAULT false,
	"total_tracks" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"plays" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"issued_card_id" integer,
	"type" varchar(30) NOT NULL,
	"points" integer NOT NULL,
	"balance" integer NOT NULL,
	"description" text,
	"stripe_transaction_id" varchar(255),
	"transaction_amount" numeric(12, 2),
	"transaction_currency" varchar(3),
	"merchant_name" text,
	"merchant_category" varchar(100),
	"base_points" integer,
	"multiplier" numeric(4, 2),
	"category_bonus" numeric(4, 2),
	"tier_at_earning" varchar(20),
	"expires_at" timestamp,
	"expired_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "points_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"reward_type" varchar(30) NOT NULL,
	"reward_value" jsonb,
	"is_active" boolean DEFAULT true,
	"min_tier" varchar(20),
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer,
	"print_product_id" integer,
	"user_id" integer,
	"file_path" text,
	"file_name" text,
	"validation_report" jsonb,
	"status" varchar(30) DEFAULT 'received',
	"quantity" integer DEFAULT 1,
	"notes" text,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "print_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"description" text,
	"specs" jsonb DEFAULT '{"width_mm":210,"height_mm":297,"dpi_min":300,"bleed_mm":3,"color_space":"CMYK"}'::jsonb,
	"price_cents" integer NOT NULL,
	"turnaround_days" integer DEFAULT 3,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "print_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_approval_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"performed_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_division" varchar(20) NOT NULL,
	"to_division" varchar(20) NOT NULL,
	"league_id" integer,
	"min_streams" integer DEFAULT 10000,
	"min_releases" integer DEFAULT 2,
	"min_active_days" integer DEFAULT 90,
	"min_engagement_rate" numeric(5, 2),
	"min_listener_retention" numeric(5, 2),
	"computed_at" timestamp DEFAULT now(),
	"sample_size" integer,
	"confidence_score" numeric(4, 2)
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" varchar NOT NULL,
	"category" varchar NOT NULL,
	"location" text NOT NULL,
	"city" varchar NOT NULL,
	"country_code" varchar(2),
	"address" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"image" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"price" numeric(12, 2) NOT NULL,
	"rating" numeric(3, 1) DEFAULT '0.0',
	"reviews" integer DEFAULT 0,
	"bedrooms" integer,
	"bathrooms" integer,
	"area" integer,
	"guests" integer,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"verified" boolean DEFAULT false,
	"instant_book" boolean DEFAULT false,
	"free_cancellation" boolean DEFAULT false,
	"discount" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"host_name" text,
	"host_phone" varchar,
	"host_email" varchar,
	"superhost" boolean DEFAULT false,
	"response_rate" integer DEFAULT 100,
	"response_time" varchar DEFAULT '< 1 hour',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"verification_status" varchar DEFAULT 'unverified',
	"trust_score" integer DEFAULT 0,
	"verification_data" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "regional_leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "regional_leagues_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_id" integer
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending',
	"total_price" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_payment_method_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"card_brand" varchar(30),
	"card_last4" varchar(4),
	"card_exp_month" integer,
	"card_exp_year" integer,
	"cardholder_name" text,
	"billing_email" varchar(255),
	"billing_phone" varchar(50),
	"billing_address_line1" text,
	"billing_address_line2" text,
	"billing_city" varchar(100),
	"billing_state" varchar(100),
	"billing_postal_code" varchar(20),
	"billing_country" varchar(2),
	"card_country" varchar(2),
	"card_funding" varchar(20),
	"card_issuer" varchar(100),
	"card_fingerprint" varchar(64),
	"cvc_check" varchar(20),
	"is_default" boolean DEFAULT false,
	"label" varchar(100),
	"preauthorized" boolean DEFAULT false,
	"max_charge_amount" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "saved_payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
);
--> statement-breakpoint
CREATE TABLE "settings_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"sector" varchar(50) NOT NULL,
	"template_data" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_templates_sector_unique" UNIQUE("sector")
);
--> statement-breakpoint
CREATE TABLE "stream_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer,
	"track_id" integer,
	"artist_profile_id" integer,
	"session_id" varchar(64),
	"duration" integer NOT NULL,
	"is_valid" boolean DEFAULT false,
	"is_self_stream" boolean DEFAULT false,
	"boosted" boolean DEFAULT false,
	"boost_multiplier" numeric(4, 2) DEFAULT '1.00',
	"super_stream" boolean DEFAULT false,
	"week_number" integer NOT NULL,
	"year_number" integer NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stream_plays" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"user_id" integer,
	"artist_id" integer,
	"duration" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"session_id" varchar(64),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "streaming_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"monthly_fee" numeric(8, 2) NOT NULL,
	"stream_limit" integer,
	"pool_contribution_percent" integer NOT NULL,
	"boost_credits" integer DEFAULT 0,
	"preview_duration_seconds" integer DEFAULT 30,
	"preview_bitrate" integer DEFAULT 128,
	"stripe_price_id" varchar(255),
	"stripe_product_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "streaming_plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "streaming_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier" varchar(20) DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"monthly_price" numeric(8, 2) DEFAULT '0.00',
	"max_downloads_per_month" integer DEFAULT 0,
	"downloads_used" integer DEFAULT 0,
	"no_ads" boolean DEFAULT false,
	"high_quality" boolean DEFAULT false,
	"offline_access" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "streaming_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"encrypted_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ticket_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"assigned_from" integer,
	"assigned_to" integer,
	"assigned_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_id" integer,
	"author_name" varchar,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'open',
	"priority" varchar DEFAULT 'medium',
	"category" varchar DEFAULT 'general',
	"reporter" text,
	"reporter_id" integer,
	"requester_email" varchar,
	"assignee_id" integer,
	"team" varchar,
	"source" varchar DEFAULT 'portal',
	"sla_target_hours" integer DEFAULT 24,
	"sla_breached" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "track_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "track_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "track_likes_unique" UNIQUE("track_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "track_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"track_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "track_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "track_reactions_unique" UNIQUE("track_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar,
	"type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"payment_method_id" integer,
	"metadata" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "tsr_whitelist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"granted_by" integer,
	"granted_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tsr_whitelist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "unified_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer,
	"account_type" varchar(30) NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"slug" varchar(255),
	"category" varchar(120),
	"description" text,
	"bio" text,
	"email" varchar,
	"phone" varchar,
	"website" text,
	"social_links" jsonb DEFAULT '{}'::jsonb,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"address" text,
	"city_id" integer,
	"region_id" integer,
	"country_id" integer,
	"country_code" varchar(2),
	"city_name" varchar,
	"is_verified" boolean DEFAULT false,
	"verification_status" varchar DEFAULT 'pending',
	"verified_at" timestamp,
	"verified_by" integer,
	"status" varchar(30) DEFAULT 'DRAFT',
	"approved_by" integer,
	"approval_notes" text,
	"logo_url" text,
	"cover_image_url" text,
	"profile_image_url" text,
	"rating" numeric(3, 1),
	"review_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"legacy_business_id" integer,
	"legacy_artist_profile_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unified_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "up_slug_uniq" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_browsing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"business_name" text,
	"sector" text,
	"page_url" text,
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"method" varchar(30) NOT NULL,
	"is_default" boolean DEFAULT false,
	"label" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"available_soon" boolean DEFAULT false,
	"paypal_email" varchar(255),
	"crypto_type" varchar(10),
	"crypto_wallet_address" varchar(255),
	"crypto_network" varchar(20),
	"mobile_provider" varchar(30),
	"mobile_number" varchar(20),
	"mobile_country_code" varchar(2),
	"bank_name" varchar(100),
	"bank_account_number" varchar(50),
	"bank_routing_number" varchar(50),
	"bank_swift_code" varchar(15),
	"bank_iban" varchar(40),
	"bank_country" varchar(2),
	"bank_holder_name" varchar(100),
	"verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sector" varchar(50) NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text,
	"data_type" varchar(20) DEFAULT 'string',
	"description" text,
	"default_value" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_user_sector_key" UNIQUE("user_id","sector","setting_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user',
	"is_verified" boolean DEFAULT false,
	"display_name" text,
	"subscription_tier" varchar DEFAULT 'free',
	"subscription_status" varchar DEFAULT 'active',
	"premium_expires_at" timestamp,
	"trial_tier" varchar,
	"trial_started_at" timestamp,
	"trial_expires_at" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"must_change_password" boolean DEFAULT false,
	"verified_at" timestamp,
	"referral_code" varchar(12),
	"referred_by" integer,
	"stripe_customer_id" varchar(255),
	"oauth_provider" varchar(20),
	"oauth_provider_id" text,
	"gate_username" text,
	"portal_access" jsonb DEFAULT '["general"]'::jsonb,
	"previous_role" varchar(20),
	"date_of_birth" date,
	"age_verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_gate_username_unique" UNIQUE("gate_username")
);
--> statement-breakpoint
CREATE TABLE "vault_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"rule_type" varchar(20) NOT NULL,
	"threshold_value" text NOT NULL,
	"current_progress" integer DEFAULT 0,
	"unlocked_at" timestamp,
	"status" varchar(20) DEFAULT 'locked',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"type" text DEFAULT 'email_verification' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" varchar,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"business_registration_number" text,
	"manager_id" text,
	"operational_proof" text,
	"logo" text,
	"action_photos" jsonb DEFAULT '[]'::jsonb,
	"opening_hours" jsonb DEFAULT '{}'::jsonb,
	"specialties" jsonb DEFAULT '[]'::jsonb,
	"social_links" jsonb DEFAULT '{}'::jsonb,
	"medical_license" text,
	"regulatory_approval" text,
	"hygiene_inspection" text,
	"verification_status" varchar DEFAULT 'pending',
	"admin_notes" text,
	"submitted_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"trust_score_breakdown" jsonb DEFAULT '{"basicInfo":0,"legalDocs":0,"marketingAssets":0,"industryCredentials":0}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "video_briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"visual_style" text,
	"color_palette" text,
	"editing_pace" varchar(30),
	"duration" varchar(30),
	"aspect_ratio" varchar(20) DEFAULT '16:9',
	"resolution" varchar(10) DEFAULT '4K',
	"has_music_track" boolean DEFAULT false,
	"music_track_url" text,
	"needs_sound_design" boolean DEFAULT false,
	"needs_voiceover" boolean DEFAULT false,
	"deliverable_formats" jsonb DEFAULT '["mp4"]'::jsonb,
	"includes_raw_footage" boolean DEFAULT false,
	"includes_project_files" boolean DEFAULT false,
	"reference_links" jsonb DEFAULT '[]'::jsonb,
	"moodboard_url" text,
	"storyboard_url" text,
	"script_text" text,
	"additional_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_deliverables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"videaste_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"file_size" integer,
	"duration" integer,
	"format" varchar(20) DEFAULT 'mp4',
	"resolution" varchar(10),
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"client_feedback" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"license_type" varchar(30) DEFAULT 'standard' NOT NULL,
	"usage_rights" text,
	"territory" varchar(50) DEFAULT 'worldwide',
	"duration" varchar(50) DEFAULT 'perpetual',
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"accepted_by_client" boolean DEFAULT false,
	"accepted_by_videaste" boolean DEFAULT false,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_type" varchar(50) DEFAULT 'music_video' NOT NULL,
	"genre" varchar(50),
	"budget" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"deadline" timestamp,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"claimed_by" integer,
	"claimed_at" timestamp,
	"priority" varchar(10) DEFAULT 'normal',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"reference_urls" jsonb DEFAULT '[]'::jsonb,
	"mood" varchar(100),
	"target_audience" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"deliverable_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"revision_notes" text NOT NULL,
	"priority" varchar(10) DEFAULT 'normal',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"revised_file_url" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"balance_before" numeric(14, 2) NOT NULL,
	"balance_after" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"payment_method" varchar(30),
	"external_reference" varchar(255),
	"description" text,
	"related_entity_type" varchar(30),
	"related_entity_id" text,
	"status" varchar(20) DEFAULT 'completed',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_pools" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"year_number" integer NOT NULL,
	"total_pool" numeric(12, 2) DEFAULT '0.00',
	"guaranteed_fund" numeric(12, 2) DEFAULT '0.00',
	"performance_pool" numeric(12, 2) DEFAULT '0.00',
	"platform_cut" numeric(12, 2) DEFAULT '0.00',
	"total_streams" integer DEFAULT 0,
	"qualifying_artists" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'open',
	"distributed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_pools_week_year_uniq" UNIQUE("week_number","year_number")
);
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_journal_listings" ADD CONSTRAINT "ad_journal_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_music_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."music_artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_brackets" ADD CONSTRAINT "arena_brackets_contest_id_arena_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."arena_contests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_brackets" ADD CONSTRAINT "arena_brackets_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_contests" ADD CONSTRAINT "arena_contests_winner_id_artist_profiles_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."artist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_votes" ADD CONSTRAINT "arena_votes_contest_id_arena_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."arena_contests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_votes" ADD CONSTRAINT "arena_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_votes" ADD CONSTRAINT "arena_votes_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artisan_communities" ADD CONSTRAINT "artisan_communities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artisan_community_join_requests" ADD CONSTRAINT "artisan_community_join_requests_community_id_artisan_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."artisan_communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artisan_community_join_requests" ADD CONSTRAINT "artisan_community_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artisan_community_memberships" ADD CONSTRAINT "artisan_community_memberships_community_id_artisan_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."artisan_communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artisan_community_memberships" ADD CONSTRAINT "artisan_community_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_badges" ADD CONSTRAINT "artist_badges_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_contracts" ADD CONSTRAINT "artist_contracts_artist_id_music_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."music_artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_contracts" ADD CONSTRAINT "artist_contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_contracts" ADD CONSTRAINT "artist_contracts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_artist_id_music_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."music_artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_royalties" ADD CONSTRAINT "artist_royalties_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_subscriptions" ADD CONSTRAINT "artist_subscriptions_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_contracts" ADD CONSTRAINT "assigned_contracts_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_contracts" ADD CONSTRAINT "assigned_contracts_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transfer_requests" ADD CONSTRAINT "bank_transfer_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transfer_requests" ADD CONSTRAINT "bank_transfer_requests_wallet_id_platform_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."platform_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transfer_requests" ADD CONSTRAINT "bank_transfer_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_business_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."business_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_original_track_id_music_tracks_id_fk" FOREIGN KEY ("original_track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_requesting_artist_id_artist_profiles_id_fk" FOREIGN KEY ("requesting_artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_owner_artist_id_artist_profiles_id_fk" FOREIGN KEY ("owner_artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_result_track_id_music_tracks_id_fk" FOREIGN KEY ("result_track_id") REFERENCES "public"."music_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_operation_audit" ADD CONSTRAINT "community_operation_audit_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_votes" ADD CONSTRAINT "contest_votes_unlocked_by_users_id_fk" FOREIGN KEY ("unlocked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_applications" ADD CONSTRAINT "contractor_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_applications" ADD CONSTRAINT "contractor_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_subscription_id_email_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."email_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audit" ADD CONSTRAINT "event_audit_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_audit" ADD CONSTRAINT "event_audit_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_community_id_artisan_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."artisan_communities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_player1_id_users_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_player2_id_users_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_match_id_game_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."game_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_action_requests" ADD CONSTRAINT "geo_action_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_action_requests" ADD CONSTRAINT "geo_action_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_conversation_id_inbox_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."inbox_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_cards" ADD CONSTRAINT "issued_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_activity" ADD CONSTRAINT "listener_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_badges" ADD CONSTRAINT "listener_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_bonuses" ADD CONSTRAINT "listener_bonuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_contest_rewards" ADD CONSTRAINT "listener_contest_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_contest_rewards" ADD CONSTRAINT "listener_contest_rewards_contest_id_arena_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."arena_contests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_contest_rewards" ADD CONSTRAINT "listener_contest_rewards_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_stats" ADD CONSTRAINT "listener_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_subscriptions" ADD CONSTRAINT "listener_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listener_subscriptions" ADD CONSTRAINT "listener_subscriptions_plan_id_streaming_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."streaming_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_print_files" ADD CONSTRAINT "marketing_print_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_media" ADD CONSTRAINT "marketplace_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_charges" ADD CONSTRAINT "ngo_charges_payment_method_id_saved_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."saved_payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_charges" ADD CONSTRAINT "ngo_charges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_charges" ADD CONSTRAINT "ngo_charges_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_pack_id_marketing_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."marketing_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paylist_access_log" ADD CONSTRAINT "paylist_access_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paylist_access_log" ADD CONSTRAINT "paylist_access_log_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paylist_items" ADD CONSTRAINT "paylist_items_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_wallets" ADD CONSTRAINT "platform_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_issued_card_id_issued_cards_id_fk" FOREIGN KEY ("issued_card_id") REFERENCES "public"."issued_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_print_product_id_print_products_id_fk" FOREIGN KEY ("print_product_id") REFERENCES "public"."print_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_approval_actions" ADD CONSTRAINT "profile_approval_actions_profile_id_unified_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."unified_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_approval_actions" ADD CONSTRAINT "profile_approval_actions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_thresholds" ADD CONSTRAINT "promotion_thresholds_league_id_regional_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."regional_leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_artist_profile_id_artist_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."artist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_plays" ADD CONSTRAINT "stream_plays_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_plays" ADD CONSTRAINT "stream_plays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_plays" ADD CONSTRAINT "stream_plays_artist_id_music_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."music_artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_subscriptions" ADD CONSTRAINT "streaming_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_from_users_id_fk" FOREIGN KEY ("assigned_from") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_comments" ADD CONSTRAINT "track_comments_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_comments" ADD CONSTRAINT "track_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_likes" ADD CONSTRAINT "track_likes_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_likes" ADD CONSTRAINT "track_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_reactions" ADD CONSTRAINT "track_reactions_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_reactions" ADD CONSTRAINT "track_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tsr_whitelist" ADD CONSTRAINT "tsr_whitelist_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_profiles" ADD CONSTRAINT "unified_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_browsing_history" ADD CONSTRAINT "user_browsing_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_rules" ADD CONSTRAINT "vault_rules_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_briefs" ADD CONSTRAINT "video_briefs_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_deliverables" ADD CONSTRAINT "video_deliverables_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_deliverables" ADD CONSTRAINT "video_deliverables_videaste_id_users_id_fk" FOREIGN KEY ("videaste_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_licenses" ADD CONSTRAINT "video_licenses_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_revisions" ADD CONSTRAINT "video_revisions_deliverable_id_video_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."video_deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_revisions" ADD CONSTRAINT "video_revisions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_platform_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."platform_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "active_sessions_user_idx" ON "active_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "active_sessions_token_idx" ON "active_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "active_sessions_revoked_idx" ON "active_sessions" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX "ad_journal_status_idx" ON "ad_journal_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_journal_category_idx" ON "ad_journal_listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ad_journal_user_idx" ON "ad_journal_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ad_journal_type_idx" ON "ad_journal_listings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "albums_artist_idx" ON "albums" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "arena_brackets_contest_round_idx" ON "arena_brackets" USING btree ("contest_id","round");--> statement-breakpoint
CREATE INDEX "arena_brackets_artist_idx" ON "arena_brackets" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "arena_contests_week_idx" ON "arena_contests" USING btree ("week_number","year_number");--> statement-breakpoint
CREATE INDEX "arena_contests_genre_idx" ON "arena_contests" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "arena_contests_status_idx" ON "arena_contests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "arena_votes_contest_user_idx" ON "arena_votes" USING btree ("contest_id","user_id");--> statement-breakpoint
CREATE INDEX "arena_votes_artist_idx" ON "arena_votes" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "artisan_communities_status_idx" ON "artisan_communities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "artisan_communities_region_idx" ON "artisan_communities" USING btree ("region");--> statement-breakpoint
CREATE INDEX "artisan_join_requests_community_idx" ON "artisan_community_join_requests" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "artisan_join_requests_user_idx" ON "artisan_community_join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artisan_memberships_community_idx" ON "artisan_community_memberships" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "artisan_memberships_user_idx" ON "artisan_community_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_badges_artist_idx" ON "artist_badges" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "artist_badges_tier_idx" ON "artist_badges" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "collab_requester_idx" ON "artist_collaborations" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "collab_target_idx" ON "artist_collaborations" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "collab_status_idx" ON "artist_collaborations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "artist_contracts_email_idx" ON "artist_contracts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "artist_contracts_status_idx" ON "artist_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "artist_contracts_grade_idx" ON "artist_contracts" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "artist_contracts_artist_idx" ON "artist_contracts" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_follows_artist_idx" ON "artist_follows" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_follows_user_idx" ON "artist_follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_profiles_user_idx" ON "artist_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_profiles_league_idx" ON "artist_profiles" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "artist_profiles_badge_idx" ON "artist_profiles" USING btree ("current_badge_tier");--> statement-breakpoint
CREATE INDEX "artist_profiles_streams_idx" ON "artist_profiles" USING btree ("lifetime_streams");--> statement-breakpoint
CREATE INDEX "artist_profiles_code_idx" ON "artist_profiles" USING btree ("artist_code");--> statement-breakpoint
CREATE INDEX "artist_profiles_division_idx" ON "artist_profiles" USING btree ("division");--> statement-breakpoint
CREATE INDEX "artist_profiles_music_artist_idx" ON "artist_profiles" USING btree ("music_artist_id");--> statement-breakpoint
CREATE INDEX "artist_royalties_week_idx" ON "artist_royalties" USING btree ("week_number","year_number");--> statement-breakpoint
CREATE INDEX "artist_subs_artist_idx" ON "artist_subscriptions" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "artist_subs_tier_idx" ON "artist_subscriptions" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "artist_subs_status_idx" ON "artist_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_transfer_user_idx" ON "bank_transfer_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bank_transfer_status_idx" ON "bank_transfer_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "biz_msg_business_idx" ON "business_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "biz_msg_created_idx" ON "business_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_idx" ON "businesses" USING btree ("search_vector");--> statement-breakpoint
CREATE INDEX "rating_ranking_idx" ON "businesses" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "businesses_created_idx" ON "businesses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cart_items_user_idx" ON "cart_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cart_items_session_idx" ON "cart_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "collab_requests_track_idx" ON "collab_requests" USING btree ("original_track_id");--> statement-breakpoint
CREATE INDEX "collab_requests_requester_idx" ON "collab_requests" USING btree ("requesting_artist_id");--> statement-breakpoint
CREATE INDEX "collab_requests_owner_idx" ON "collab_requests" USING btree ("owner_artist_id");--> statement-breakpoint
CREATE INDEX "collab_requests_status_idx" ON "collab_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "community_audit_entity_idx" ON "community_operation_audit" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "community_audit_actor_idx" ON "community_operation_audit" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "community_audit_created_idx" ON "community_operation_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "connections_status_idx" ON "connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "connections_requester_idx" ON "connections" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "connections_receiver_idx" ON "connections" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "contest_req_division_idx" ON "contest_participation_requirements" USING btree ("division");--> statement-breakpoint
CREATE INDEX "contest_votes_user_contest_idx" ON "contest_votes" USING btree ("user_id","contest_id");--> statement-breakpoint
CREATE INDEX "contest_votes_artist_idx" ON "contest_votes" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "contest_votes_status_idx" ON "contest_votes" USING btree ("vote_status");--> statement-breakpoint
CREATE INDEX "email_queue_status_idx" ON "email_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_queue_scheduled_idx" ON "email_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "email_queue_recipient_idx" ON "email_queue" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "email_sub_user_idx" ON "email_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_sub_type_idx" ON "email_subscriptions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "email_sub_active_idx" ON "email_subscriptions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "email_sub_token_idx" ON "email_subscriptions" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "eval_submissions_artist_idx" ON "evaluation_submissions" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "eval_submissions_status_idx" ON "evaluation_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_attendees_event_idx" ON "event_attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_attendees_user_idx" ON "event_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_audit_event_idx" ON "event_audit" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_audit_actor_idx" ON "event_audit" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_organizer_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "game_matches_p1_idx" ON "game_matches" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "game_matches_p2_idx" ON "game_matches" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "game_matches_status_idx" ON "game_matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "game_matches_type_idx" ON "game_matches" USING btree ("game_type");--> statement-breakpoint
CREATE INDEX "game_moves_match_idx" ON "game_moves" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "game_moves_user_idx" ON "game_moves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_conv_user_idx" ON "inbox_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inbox_conv_type_idx" ON "inbox_conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inbox_conv_updated_idx" ON "inbox_conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "inbox_msg_conv_idx" ON "inbox_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "inbox_msg_created_idx" ON "inbox_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inbox_msg_read_idx" ON "inbox_messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "inv_products_user_idx" ON "inventory_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inv_products_business_idx" ON "inventory_products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "inv_products_sku_idx" ON "inventory_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inv_products_status_idx" ON "inventory_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inv_products_sector_idx" ON "inventory_products" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "issued_cards_user_idx" ON "issued_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "issued_cards_status_idx" ON "issued_cards" USING btree ("card_status");--> statement-breakpoint
CREATE INDEX "journal_editions_type_idx" ON "journal_editions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "journal_editions_date_idx" ON "journal_editions" USING btree ("edition_date");--> statement-breakpoint
CREATE INDEX "listener_activity_user_idx" ON "listener_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_activity_type_idx" ON "listener_activity" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "listener_badges_user_idx" ON "listener_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_bonuses_user_idx" ON "listener_bonuses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_bonuses_claimed_idx" ON "listener_bonuses" USING btree ("claimed");--> statement-breakpoint
CREATE INDEX "listener_contest_rewards_user_idx" ON "listener_contest_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_contest_rewards_contest_idx" ON "listener_contest_rewards" USING btree ("contest_id");--> statement-breakpoint
CREATE INDEX "listener_stats_user_idx" ON "listener_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_subs_user_idx" ON "listener_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listener_subs_status_idx" ON "listener_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listening_history_user_idx" ON "listening_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listening_history_date_idx" ON "listening_history" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "marketing_packs_tier_idx" ON "marketing_packs" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "marketing_packs_active_idx" ON "marketing_packs" USING btree ("active");--> statement-breakpoint
CREATE INDEX "music_artists_name_idx" ON "music_artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "music_artists_genre_idx" ON "music_artists" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "music_artists_country_idx" ON "music_artists" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "music_tracks_artist_idx" ON "music_tracks" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "music_tracks_album_idx" ON "music_tracks" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "music_tracks_genre_idx" ON "music_tracks" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "music_tracks_status_created_idx" ON "music_tracks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_status_idx" ON "newsletter_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_scheduled_idx" ON "newsletter_campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_user_idx" ON "newsletter_subscribers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_active_idx" ON "newsletter_subscribers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_token_idx" ON "newsletter_subscribers" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_stripe_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "pack_items_pack_idx" ON "pack_items" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "paylist_access_user_idx" ON "paylist_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paylist_access_track_idx" ON "paylist_access_log" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "paylist_access_type_idx" ON "paylist_access_log" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "paylist_items_track_idx" ON "paylist_items" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "paylist_items_tier_idx" ON "paylist_items" USING btree ("min_tier_required");--> statement-breakpoint
CREATE INDEX "paylist_items_rank_idx" ON "paylist_items" USING btree ("curated_rank");--> statement-breakpoint
CREATE INDEX "payout_requests_artist_idx" ON "payout_requests" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "payout_requests_status_idx" ON "payout_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_settings_key_idx" ON "platform_settings" USING btree ("setting_key");--> statement-breakpoint
CREATE INDEX "platform_settings_cat_idx" ON "platform_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "platform_wallets_user_idx" ON "platform_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_wallets_status_idx" ON "platform_wallets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "playlist_tracks_playlist_idx" ON "playlist_tracks" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "playlist_tracks_track_idx" ON "playlist_tracks" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "playlists_user_idx" ON "playlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "points_ledger_user_idx" ON "points_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "points_ledger_type_idx" ON "points_ledger" USING btree ("type");--> statement-breakpoint
CREATE INDEX "points_ledger_expiry_idx" ON "points_ledger" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "print_jobs_status_idx" ON "print_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "print_jobs_user_idx" ON "print_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "print_products_category_idx" ON "print_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "print_products_active_idx" ON "print_products" USING btree ("active");--> statement-breakpoint
CREATE INDEX "paa_profile_idx" ON "profile_approval_actions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "paa_admin_idx" ON "profile_approval_actions" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX "properties_type_idx" ON "properties" USING btree ("type");--> statement-breakpoint
CREATE INDEX "properties_rating_idx" ON "properties" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "settings_templates_sector_idx" ON "settings_templates" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "stream_events_user_idx" ON "stream_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stream_events_track_idx" ON "stream_events" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "stream_events_artist_idx" ON "stream_events" USING btree ("artist_profile_id");--> statement-breakpoint
CREATE INDEX "stream_events_week_idx" ON "stream_events" USING btree ("week_number","year_number");--> statement-breakpoint
CREATE INDEX "stream_events_valid_idx" ON "stream_events" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX "stream_plays_track_idx" ON "stream_plays" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "stream_plays_user_idx" ON "stream_plays" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stream_plays_artist_idx" ON "stream_plays" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "stream_plays_date_idx" ON "stream_plays" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "streaming_subs_user_idx" ON "streaming_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "streaming_subs_tier_idx" ON "streaming_subscriptions" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "ticket_assignments_ticket_idx" ON "ticket_assignments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_assignments_assigned_to_idx" ON "ticket_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "ticket_comments_ticket_idx" ON "ticket_comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_assignee_idx" ON "tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "track_comments_track_idx" ON "track_comments" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_comments_user_idx" ON "track_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "track_likes_track_idx" ON "track_likes" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_likes_user_idx" ON "track_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "track_purchases_user_idx" ON "track_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "track_purchases_track_idx" ON "track_purchases" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_purchases_user_track_idx" ON "track_purchases" USING btree ("user_id","track_id");--> statement-breakpoint
CREATE INDEX "track_reactions_track_idx" ON "track_reactions" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_reactions_user_idx" ON "track_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "up_owner_idx" ON "unified_profiles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "up_status_idx" ON "unified_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "up_verification_idx" ON "unified_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "up_account_type_idx" ON "unified_profiles" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "up_published_idx" ON "unified_profiles" USING btree ("status","is_verified");--> statement-breakpoint
CREATE INDEX "up_geo_idx" ON "unified_profiles" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "ubh_user_idx" ON "user_browsing_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ubh_visited_at_idx" ON "user_browsing_history" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "user_pay_methods_user_idx" ON "user_payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_pay_methods_method_idx" ON "user_payment_methods" USING btree ("method");--> statement-breakpoint
CREATE INDEX "user_settings_user_sector_idx" ON "user_settings" USING btree ("user_id","sector");--> statement-breakpoint
CREATE INDEX "user_settings_sector_idx" ON "user_settings" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "user_settings_user_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_rules_track_idx" ON "vault_rules" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "vault_rules_status_idx" ON "vault_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_property_idx" ON "verifications" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "video_brief_project_idx" ON "video_briefs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "video_deliv_project_idx" ON "video_deliverables" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "video_deliv_videaste_idx" ON "video_deliverables" USING btree ("videaste_id");--> statement-breakpoint
CREATE INDEX "video_deliv_status_idx" ON "video_deliverables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_lic_project_idx" ON "video_licenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "video_lic_type_idx" ON "video_licenses" USING btree ("license_type");--> statement-breakpoint
CREATE INDEX "video_proj_client_idx" ON "video_projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "video_proj_status_idx" ON "video_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_proj_claimed_idx" ON "video_projects" USING btree ("claimed_by");--> statement-breakpoint
CREATE INDEX "video_proj_type_idx" ON "video_projects" USING btree ("project_type");--> statement-breakpoint
CREATE INDEX "video_rev_deliv_idx" ON "video_revisions" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "video_rev_requester_idx" ON "video_revisions" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "wallet_txn_wallet_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_user_idx" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_type_idx" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "wallet_txn_date_idx" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallet_txn_status_idx" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "weekly_pools_status_idx" ON "weekly_pools" USING btree ("status");