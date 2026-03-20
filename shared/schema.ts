import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  varchar,
  uuid,
  char,
  index,
  unique,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// --- 1. GEOGRAPHY & IDENTITY ---
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: char("code", { length: 2 }).notNull().unique(),
});

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  countryId: integer("country_id").references(() => countries.id),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionName: text("region_name"),
  regionId: integer("region_id").references(() => regions.id),
  countryId: integer("country_id").references(() => countries.id),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt-hashed
  role: text("role").default("user"),
  isVerified: boolean("is_verified").default(false),

  // Premium & Subscription Tier Logic
  // 🛸 Growth Engine tiers: 'free' | 'essential' | 'verified' | 'max' | 'enterprise'
  subscriptionTier: varchar("subscription_tier").default("free"),
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active', 'cancelled', 'past_due', 'trialing'
  premiumExpiresAt: timestamp("premium_expires_at"),

  // Trial management
  trialTier: varchar("trial_tier"), // The tier being trialed (e.g., 'verified')
  trialStartedAt: timestamp("trial_started_at"),
  trialExpiresAt: timestamp("trial_expires_at"),

  // Security — account lockout
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),

  // Security — password reset
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),

  // Email verification
  verifiedAt: timestamp("verified_at"),

  // Referral tracking
  referralCode: varchar("referral_code", { length: 12 }).unique(),
  referredBy: integer("referred_by").references((): any => users.id),

  // Stripe customer
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

  // OAuth / SSO
  oauthProvider: varchar("oauth_provider", { length: 20 }), // 'google' | 'microsoft' | 'apple'
  oauthProviderId: text("oauth_provider_id"),

  // GeoAdmin gate access — nullable, unique alias for admin-gate login
  gateUsername: text("gate_username").unique(),

  // Portal access — JSONB array tracking which portals the user can access
  // Possible values: "general", "artist", "geo-admin", "contractor", "community"
  portalAccess: jsonb("portal_access").$type<string[]>().default(["general"]),

  // Role switching — stores original staff role when user switches to artist mode
  previousRole: varchar("previous_role", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow(),
});

// --- EMAIL VERIFICATION TOKENS ---
export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  type: text("type").notNull().default("email_verification"), // 'email_verification' | 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 2. THE DIRECTORY CORE (Yellow Pages) ---
export const businessCategories = pgTable("business_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id"),
  description: text("description"), // Added for better UI
  mainCategory: boolean("main_category").default(false), // CRITICAL FIX: Identifies the "Big 9"
});

export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: integer("owner_id").references(() => users.id),
    categoryId: integer("category_id").references(() => businessCategories.id),
    cityId: integer("city_id").references(() => cities.id),
    description: text("description"),
    phone: varchar("phone"),
    email: varchar("email"),

    // Geographic Location
    address: text("address"),
    location: text("location"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    countryCode: varchar("country_code"),
    countryId: integer("country_id"),
    regionId: integer("region_id"),
    cityName: varchar("city_name"),

    // Performance Indexing
    rating: decimal("rating").default("0.0"),
    reviewsCount: integer("reviews_count").default(0),
    popularityScore: integer("popularity_score").default(0),
    isAdvertiser: boolean("is_advertiser").default(false),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),
    isActive: boolean("is_active").default(true),
    isPremium: boolean("is_premium").default(false),
    featured: boolean("featured").default(false),
    adBalance: decimal("ad_balance").default("0"),
    adStatus: varchar("ad_status"),

    // Contact & Web
    contactInfo: jsonb("contact_info"),
    website: text("website"),
    socialLinks: jsonb("social_links"),
    openingHours: jsonb("opening_hours"),

    // Flexible Sector Data (JSONB)
    attributes: jsonb("attributes")
      .$type<{
        type?: string;
        license?: string;
        delivery?: boolean;
        products?: string[];
        brands?: string[];
        price?: number;
        services?: string[];
        capacity?: number;
      }>()
      .default({}),
    tags: jsonb("tags").default([]),
    keywords: jsonb("keywords"),

    // Sector-specific fields
    amenities: jsonb("amenities").$type<string[]>().default([]),
    reviews: integer("reviews").default(0),
    businessType: varchar("business_type"),
    migratedFromTable: varchar("migrated_from_table"),

    // Search Engine Vector
    searchVector: text("search_vector"),

    // ── Approval Workflow ──
    approvalStatus: varchar("approval_status").default("approved"), // 'pending' | 'approved' | 'rejected'  (existing rows default approved)
    submittedBy: integer("submitted_by").references(() => users.id),
    approvedBy: integer("approved_by").references(() => users.id),
    approvalNotes: text("approval_notes"),
    pdfPath: text("pdf_path"), // path to auto-generated registration PDF

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    searchIdx: index("search_idx").on(t.searchVector),
    ratingIdx: index("rating_ranking_idx").on(t.rating),
    createdAtIdx: index("businesses_created_idx").on(t.createdAt),
  }),
);

// --- 3. MUSIC & JOBS EXTENSIONS ---
export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").references(() => users.id),
  stageName: text("stage_name").notNull(),
  genre: varchar("genre", { length: 100 }),
  labelStatus: varchar("label_status").default("unsigned"),
  spotifyUrl: text("spotify_url"),
  countryCode: varchar("country_code", { length: 2 }),
});

export const contractors = pgTable("contractors", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id, {
    onDelete: "cascade",
  }),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  specialization: text("specialization"),
  hourlyRate: decimal("hourly_rate"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentCardTypes = pgTable("payment_card_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- SAVED PAYMENT METHODS (Stripe tokenized cards) ---
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 })
    .notNull()
    .unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  cardBrand: varchar("card_brand", { length: 30 }), // visa, mastercard, amex, etc.
  cardLast4: varchar("card_last4", { length: 4 }),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardholderName: text("cardholder_name"),
  billingEmail: varchar("billing_email", { length: 255 }),
  billingPhone: varchar("billing_phone", { length: 50 }),
  billingAddressLine1: text("billing_address_line1"),
  billingAddressLine2: text("billing_address_line2"),
  billingCity: varchar("billing_city", { length: 100 }),
  billingState: varchar("billing_state", { length: 100 }),
  billingPostalCode: varchar("billing_postal_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 2 }), // ISO 3166-1 alpha-2
  cardCountry: varchar("card_country", { length: 2 }), // issuing country
  cardFunding: varchar("card_funding", { length: 20 }), // credit, debit, prepaid
  cardIssuer: varchar("card_issuer", { length: 100 }), // issuing bank name
  cardFingerprint: varchar("card_fingerprint", { length: 64 }), // Stripe unique card fingerprint
  cvcCheck: varchar("cvc_check", { length: 20 }), // pass, fail, unavailable, unchecked
  isDefault: boolean("is_default").default(false),
  label: varchar("label", { length: 100 }), // e.g. "NGO Donation Card", "Business Card"
  preauthorized: boolean("preauthorized").default(false), // pre-authorized for NGO charges
  maxChargeAmount: decimal("max_charge_amount", { precision: 12, scale: 2 }), // max per charge if set
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status", { length: 20 }).default("active"), // active, expired, revoked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- NGO CHARGE RECORDS (POS-style charges against saved cards) ---
export const ngoCharges = pgTable("ngo_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentMethodId: integer("payment_method_id").references(
    () => savedPaymentMethods.id,
  ),
  userId: integer("user_id").references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  description: text("description"),
  category: varchar("category", { length: 50 }), // donation, activity_fee, membership, event, supplies
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, succeeded, failed, refunded
  receiptUrl: text("receipt_url"),
  processedBy: integer("processed_by").references(() => users.id), // admin who initiated charge
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  metadata: text("metadata"), // JSON string for extra context
  createdAt: timestamp("created_at").defaultNow(),
});

export const musicTracks = pgTable(
  "music_tracks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    artistId: integer("artist_id"),
    albumId: integer("album_id"), // FK to albums table
    trackNumber: integer("track_number"), // position in album
    duration: integer("duration"),
    streams: integer("streams").default(0),
    playCount: integer("play_count").default(0),
    likes: integer("likes").default(0),
    releaseDate: timestamp("release_date"),
    genre: text("genre"),
    // ── Upload / monetization fields ──
    filePath: text("file_path"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    audioUrl: text("audio_url"), // external audio URL (for demo/placeholder)
    description: text("description"),
    price: text("price").default("0.99"),
    downloads: integer("downloads").default(0),
    revenue: text("revenue").default("0.00"),
    status: text("status").default("published"),
    bpm: integer("bpm"),
    musicalKey: text("musical_key"),
    mood: text("mood"),
    coverArt: text("cover_art"),
    wikiUrl: text("wiki_url"), // Wikipedia link for the track
    isExplicit: boolean("is_explicit").default(false),
    lyrics: text("lyrics"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    artistIdx: index("music_tracks_artist_idx").on(t.artistId),
    albumIdx: index("music_tracks_album_idx").on(t.albumId),
    genreIdx: index("music_tracks_genre_idx").on(t.genre),
  }),
);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey(),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  type: varchar("type"),
  businessId: integer("business_id").references(() => businesses.id, {
    onDelete: "set null",
  }),
  // Sector classification — aligns with Annuaire directory categories
  sector: varchar("sector").default("general"), // communication, tech, immobilier, conseil-juridique, sante, alimentation, animaux, artisans, maison-deco, mode-textile, telecom, agroalimentaire, administrations, associations, bien-etre, emploi, commerce, hotellerie, batiment, automobile, finances, divertissement, autres, general
  countryCode: varchar("country_code", { length: 2 }),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: varchar("currency").default("USD"),
  description: text("description"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  skills: text("skills"),
  experienceLevel: varchar("experience_level"),
  educationLevel: varchar("education_level"),
  department: varchar("department"),
  postedDate: date("posted_date"),
  applicationDeadline: date("application_deadline"),
  isFeatured: boolean("is_featured").default(false),
  isRemote: boolean("is_remote").default(false),
  applicationCount: integer("application_count").default(0),
  viewCount: integer("view_count").default(0),
  status: varchar("status").default("active"),
  companyLogo: text("company_logo"),
  companyDescription: text("company_description"),
  applyUrl: text("apply_url"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- 4. SOCIAL NETWORKING (LinkedIn System) ---
export const connections = pgTable(
  "connections",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .references(() => users.id)
      .notNull(),
    receiverId: integer("receiver_id")
      .references(() => users.id)
      .notNull(),
    status: varchar("status").default("pending"), // 'pending', 'accepted', 'blocked'
    createdAt: timestamp("created_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
  },
  (t) => ({
    connectionIdx: index("connections_status_idx").on(t.status),
    requesterIdx: index("connections_requester_idx").on(t.requesterId),
    receiverIdx: index("connections_receiver_idx").on(t.receiverId),
    // CRITICAL: Prevents duplicate connection requests
    uniqueConnection: unique("unique_connection_pair").on(
      t.requesterId,
      t.receiverId,
    ),
  }),
);

// --- 5. FINANCES & REVIEWS ---
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: integer("business_id").references(() => businesses.id),
  userId: integer("user_id").references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: varchar("type"), // 'ad_topup', 'subscription_fee'
  status: varchar("status").default("pending"),
  reference: varchar("reference").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessReviews = pgTable("business_reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .references(() => businesses.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  rating: integer("rating").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 6A. AUDIT & ADMIN ---
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: varchar("entity_type"),
  entityId: text("entity_id"), // Supports both integer and UUID types
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 6B. ADVERTISING ---
export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: integer("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status").default("active"), // 'active', 'paused', 'ended'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 6B. PROPERTIES & HOSPITALITY ---
export const properties = pgTable(
  "properties",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: varchar("type").notNull(), // 'hotel', 'apartment', 'villa', 'resort', 'guesthouse'
    category: varchar("category").notNull(), // 'luxury', 'standard', 'budget'
    location: text("location").notNull(),
    city: varchar("city").notNull(),
    countryCode: varchar("country_code", { length: 2 }),
    address: text("address"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    image: text("image"), // Primary image
    images: jsonb("images").default([]), // Gallery of images
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    rating: decimal("rating", { precision: 3, scale: 1 }).default("0.0"),
    reviews: integer("reviews").default(0),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    area: integer("area"), // sqm
    guests: integer("guests"),
    amenities: jsonb("amenities").default([]), // ['wifi', 'parking', 'pool', 'ac']
    verified: boolean("verified").default(false),
    instantBook: boolean("instant_book").default(false),
    freeCancellation: boolean("free_cancellation").default(false),
    discount: integer("discount").default(0), // percentage
    featured: boolean("featured").default(false),
    tags: jsonb("tags").default([]),
    hostName: text("host_name"),
    hostPhone: varchar("host_phone"),
    hostEmail: varchar("host_email"),
    superhost: boolean("superhost").default(false),
    responseRate: integer("response_rate").default(100),
    responseTime: varchar("response_time").default("< 1 hour"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    // Verification & Digital Passport Fields
    verificationStatus: varchar("verification_status").default("unverified"), // 'unverified' | 'pending_verification' | 'verified' | 'rejected'
    trustScore: integer("trust_score").default(0), // 0-100 based on credentials submitted
    verificationData: jsonb("verification_data").default({}), // Stores submitted credentials metadata
  },
  (t) => ({
    cityIdx: index("properties_city_idx").on(t.city),
    typeIdx: index("properties_type_idx").on(t.type),
    ratingIdx: index("properties_rating_idx").on(t.rating),
  }),
);

// --- 6C. RESERVATIONS & ANALYTICS ---
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: integer("business_id")
    .references(() => businesses.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'cancelled'
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analytics = pgTable(
  "analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type").notNull(), // 'business', 'category'
    entityId: integer("entity_id").notNull(),
    pageViews: integer("page_views").default(0),
    uniqueVisitors: integer("unique_visitors").default(0),
    clicks: integer("clicks").default(0),
    conversions: integer("conversions").default(0),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0.00"),
    period: varchar("period").default("daily"), // 'daily', 'weekly', 'monthly'
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // Prevent double-counting: unique combination of entity, type, and date
    uniqueAnalytics: unique("unique_analytics_per_entity").on(
      t.entityId,
      t.entityType,
      t.date,
    ),
  }),
);

export const musicAnalytics = pgTable("music_analytics", {
  id: serial("id").primaryKey(),
  totalArtists: integer("total_artists").default(0),
  totalTracks: integer("total_tracks").default(0),
  totalStreams: integer("total_streams").default(0),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Dedicated music_artists table (separate from the legacy 'artists' table)
export const musicArtists = pgTable(
  "music_artists",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    genre: text("genre"),
    biography: text("biography"),
    imageUrl: text("image_url"),
    coverImageUrl: text("cover_image_url"), // banner image
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    labelStatus: varchar("label_status", { length: 20 }).default("signed"),
    spotifyUrl: text("spotify_url"),
    wikiUrl: text("wiki_url"),
    instagramUrl: text("instagram_url"),
    twitterUrl: text("twitter_url"),
    websiteUrl: text("website_url"),
    totalStreams: integer("total_streams").default(0),
    monthlyListeners: integer("monthly_listeners").default(0),
    followers: integer("followers").default(0),
    totalTracks: integer("total_tracks").default(0),
    totalAlbums: integer("total_albums").default(0),
    verified: boolean("verified").default(false),
    featuredTrackId: integer("featured_track_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    nameIdx: index("music_artists_name_idx").on(t.name),
    genreIdx: index("music_artists_genre_idx").on(t.genre),
    countryIdx: index("music_artists_country_idx").on(t.countryCode),
  }),
);

// --- 6b. BUSINESS ADMIN MESSAGES (Teams-style thread per business) ---
export const businessMessages = pgTable(
  "business_messages",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    senderId: integer("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    senderName: varchar("sender_name").notNull(), // display name at send-time
    senderRole: varchar("sender_role").notNull(), // 'superuser' | 'admin' | 'moderator' | 'owner'
    message: text("message").notNull(),
    messageType: varchar("message_type").default("text"), // 'text' | 'status_change' | 'system'
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    businessIdx: index("biz_msg_business_idx").on(t.businessId),
    createdIdx: index("biz_msg_created_idx").on(t.createdAt),
  }),
);

export type BusinessMessage = typeof businessMessages.$inferSelect;

// --- 7. NOTIFICATIONS & REAL-TIME ---
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type").notNull(), // 'connection_request', 'connection_accepted', 'profile_update', 'message'
  fromUserId: integer("from_user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message"),
  relatedEntityType: varchar("related_entity_type"), // 'user', 'business', 'job', etc.
  relatedEntityId: text("related_entity_id"),
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"), // Link to navigate to related content
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// --- 8. RELATION MAPS (Drizzle Query API) ---
export const userRelations = relations(users, ({ many }) => ({
  businessesOwned: many(businesses),
  connectionsSent: many(connections, { relationName: "requester" }),
  connectionsReceived: many(connections, { relationName: "receiver" }),
  reviews: many(businessReviews),
}));

export const businessRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  category: one(businessCategories, {
    fields: [businesses.categoryId],
    references: [businessCategories.id],
  }),
  jobs: many(jobs),
  artists: many(artists),
  reviews: many(businessReviews),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  receiver: one(users, {
    fields: [connections.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// --- 7. ZOD & TYPES ---
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertConnectionSchema = createInsertSchema(connections);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;
export type BusinessCategory = typeof businessCategories.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Country = typeof countries.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;
export type MusicTrack = typeof musicTracks.$inferSelect;
export type MusicArtist = typeof musicArtists.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;
export type MusicAnalytics = typeof musicAnalytics.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
// --- 🪪 DIGITAL PASSPORT VERIFICATION TABLE ---
export const verifications = pgTable(
  "verifications",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    // Step 1: Basic Information
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: varchar("contact_phone"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    // Step 2: Legal Documents
    businessRegistrationNumber: text("business_registration_number"), // SIRET/RC
    managerId: text("manager_id"), // ID file path/link
    operationalProof: text("operational_proof"), // Utility bill or lease
    // Step 3: Marketing Assets
    logo: text("logo"), // High-res logo URL
    actionPhotos: jsonb("action_photos").default([]), // Array of 3 photos
    openingHours: jsonb("opening_hours").default({}), // { monday: "09:00-18:00", ... }
    specialties: jsonb("specialties").default([]), // Industry-specific specialties
    socialLinks: jsonb("social_links").default({}), // { facebook, instagram, etc }
    // Industry-Specific Credentials
    medicalLicense: text("medical_license"), // For Santé
    regulatoryApproval: text("regulatory_approval"), // For Finance
    hygieneInspection: text("hygiene_inspection"), // For Alimentation
    // Status & Audit
    verificationStatus: varchar("verification_status").default("pending"), // 'pending' | 'approved' | 'rejected'
    adminNotes: text("admin_notes"),
    submittedAt: timestamp("submitted_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
    trustScoreBreakdown: jsonb("trust_score_breakdown").default({
      // Tracks what contributes to trust score
      basicInfo: 0,
      legalDocs: 0,
      marketingAssets: 0,
      industryCredentials: 0,
    }),
  },
  (t) => ({
    propertyVerificationIdx: index("verification_property_idx").on(
      t.propertyId,
    ),
  }),
);

export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;

// --- 20. TICKETING & SUPPORT SYSTEM ---
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: varchar("status").default("open"), // 'open' | 'in-progress' | 'resolved' | 'closed'
    priority: varchar("priority").default("medium"), // 'critical' | 'high' | 'medium' | 'low'
    category: varchar("category").default("general"), // 'bug' | 'infrastructure' | 'ui-ux' | 'enhancement' | 'general'
    reporter: text("reporter"), // Original reporter name or ID
    reporterId: integer("reporter_id").references(() => users.id),
    requesterEmail: varchar("requester_email"),
    assigneeId: integer("assignee_id").references(() => users.id),
    team: varchar("team"), // Team/department assignment
    source: varchar("source").default("portal"), // 'portal' | 'email' | 'phone' | 'api'
    slaTargetHours: integer("sla_target_hours").default(24),
    slaBreached: boolean("sla_breached").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => ({
    statusIdx: index("tickets_status_idx").on(t.status),
    priorityIdx: index("tickets_priority_idx").on(t.priority),
    assigneeIdx: index("tickets_assignee_idx").on(t.assigneeId),
    createdAtIdx: index("tickets_created_at_idx").on(t.createdAt),
  }),
);

export const ticketAssignments = pgTable(
  "ticket_assignments",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    assignedFrom: integer("assigned_from").references(() => users.id), // Manager/admin who made the assignment
    assignedTo: integer("assigned_to").references(() => users.id), // User being assigned to
    assignedAt: timestamp("assigned_at").defaultNow(),
    notes: text("notes"),
  },
  (t) => ({
    ticketIdx: index("ticket_assignments_ticket_idx").on(t.ticketId),
    assignedToIdx: index("ticket_assignments_assigned_to_idx").on(t.assignedTo),
  }),
);

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;
export type TicketAssignment = typeof ticketAssignments.$inferSelect;
export type InsertTicketAssignment = typeof ticketAssignments.$inferInsert;

// ── USER SETTINGS (Sector-Specific Preferences) ─────────────────────────────
export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sector: varchar("sector", { length: 50 }).notNull(), // 'commerce', 'hotellerie', 'batiment', 'automobile', 'finances', 'divertissement', 'careers', 'music', 'realestate', 'annuaire'
    settingKey: varchar("setting_key", { length: 100 }).notNull(), // 'show_in_search', 'email_notifications', etc
    settingValue: text("setting_value"), // Stored as JSON string for flexibility
    dataType: varchar("data_type", { length: 20 }).default("string"), // 'boolean', 'string', 'number', 'json'
    description: text("description"), // Helpful description of the setting
    defaultValue: text("default_value"), // Default value for this setting
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userSectorIdx: index("user_settings_user_sector_idx").on(
      t.userId,
      t.sector,
    ),
    sectorIdx: index("user_settings_sector_idx").on(t.sector),
    userIdx: index("user_settings_user_idx").on(t.userId),
    uniqueUserSetting: unique("user_settings_user_sector_key").on(
      t.userId,
      t.sector,
      t.settingKey,
    ),
  }),
);

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ── SETTINGS TEMPLATES (Predefined Settings for Each Sector) ────────────────
export const settingsTemplates = pgTable(
  "settings_templates",
  {
    id: serial("id").primaryKey(),
    sector: varchar("sector", { length: 50 }).notNull().unique(), // One template per sector
    templateData: jsonb("template_data").notNull(), // JSON with all default settings
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    sectorIdx: index("settings_templates_sector_idx").on(t.sector),
  }),
);

export type SettingsTemplate = typeof settingsTemplates.$inferSelect;
export type InsertSettingsTemplate = typeof settingsTemplates.$inferInsert;

// ── EMAIL SUBSCRIPTIONS (Follow-Up Channels) ───────────────────────────────
// Drives the 4-channel email follow-up system:
//   job_alerts, contract_alerts, reservation_tracking, geoadmin_reports, platform_updates
export const emailSubscriptions = pgTable(
  "email_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Subscription channel
    type: varchar("type", { length: 50 }).notNull(), // 'job_alerts' | 'contract_alerts' | 'reservation_tracking' | 'geoadmin_reports' | 'platform_updates'
    // Delivery frequency
    frequency: varchar("frequency", { length: 30 }).default("daily_digest"), // 'instant' | 'daily_digest' | 'weekly_digest'
    // Active toggle (soft-delete / pause)
    isActive: boolean("is_active").default(true),
    // Filter criteria stored as JSON — { sectors: [], locations: [], keywords: [], salaryMin: N, salaryMax: N }
    filters: jsonb("filters").default({}),
    // One-click unsubscribe (CAN-SPAM compliance)
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    // When the last digest/alert was sent for this subscription
    lastSentAt: timestamp("last_sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("email_sub_user_idx").on(t.userId),
    typeIdx: index("email_sub_type_idx").on(t.type),
    userTypeIdx: unique("email_sub_user_type_uniq").on(t.userId, t.type),
    activeIdx: index("email_sub_active_idx").on(t.isActive),
    tokenIdx: index("email_sub_token_idx").on(t.unsubscribeToken),
  }),
);

export const insertEmailSubscriptionSchema =
  createInsertSchema(emailSubscriptions);
export type EmailSubscription = typeof emailSubscriptions.$inferSelect;
export type InsertEmailSubscription = typeof emailSubscriptions.$inferInsert;

// ── EMAIL QUEUE (Reliable Async Delivery) ───────────────────────────────────
// Decouples email sending from request handling. Digest worker processes this.
export const emailQueue = pgTable(
  "email_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Optional link to the subscription that triggered this email
    subscriptionId: uuid("subscription_id").references(
      () => emailSubscriptions.id,
      { onDelete: "set null" },
    ),
    recipientEmail: text("recipient_email").notNull(),
    recipientUserId: integer("recipient_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    subject: text("subject").notNull(),
    htmlBody: text("html_body").notNull(),
    // Delivery state
    status: varchar("status", { length: 20 }).default("pending"), // 'pending' | 'sent' | 'failed' | 'skipped'
    scheduledAt: timestamp("scheduled_at").defaultNow(),
    sentAt: timestamp("sent_at"),
    error: text("error"),
    retryCount: integer("retry_count").default(0),
    // Categorisation for analytics
    emailType: varchar("email_type", { length: 50 }), // 'job_alert' | 'contract_alert' | 'reservation_update' | 'geoadmin_report' | 'digest'
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("email_queue_status_idx").on(t.status),
    scheduledIdx: index("email_queue_scheduled_idx").on(t.scheduledAt),
    recipientIdx: index("email_queue_recipient_idx").on(t.recipientUserId),
  }),
);

export const insertEmailQueueSchema = createInsertSchema(emailQueue);
export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type InsertEmailQueueItem = typeof emailQueue.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// 💳 VERSO AIR CARD — Stripe Issuing Virtual Cards + Points Rewards
// ═══════════════════════════════════════════════════════════════════════════════

// --- ISSUED VIRTUAL CARDS (Stripe Issuing) ---
export const issuedCards = pgTable(
  "issued_cards",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    stripeCardId: varchar("stripe_card_id", { length: 255 }).notNull().unique(), // ic_xxxxx
    stripeCardholderId: varchar("stripe_cardholder_id", {
      length: 255,
    }).notNull(), // ich_xxxxx
    cardBrand: varchar("card_brand", { length: 30 }).default("Visa"),
    cardLast4: varchar("card_last4", { length: 4 }),
    cardExpMonth: integer("card_exp_month"),
    cardExpYear: integer("card_exp_year"),
    cardType: varchar("card_type", { length: 20 }).default("virtual"), // virtual | physical
    cardStatus: varchar("card_status", { length: 20 }).default("active"), // active, inactive, canceled
    spendingLimitAmount: decimal("spending_limit_amount", {
      precision: 12,
      scale: 2,
    }),
    spendingLimitInterval: varchar("spending_limit_interval", { length: 20 }), // per_authorization, daily, weekly, monthly, yearly, all_time
    currency: varchar("currency", { length: 3 }).default("USD"),
    cardholderName: text("cardholder_name"),
    billingAddressLine1: text("billing_address_line1"),
    billingCity: varchar("billing_city", { length: 100 }),
    billingState: varchar("billing_state", { length: 100 }),
    billingPostalCode: varchar("billing_postal_code", { length: 20 }),
    billingCountry: varchar("billing_country", { length: 2 }),
    tierAtIssuance: varchar("tier_at_issuance", { length: 20 }), // which tier user had when card was issued
    pointsMultiplier: decimal("points_multiplier", {
      precision: 4,
      scale: 2,
    }).default("1.00"), // tier-based
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    canceledAt: timestamp("canceled_at"),
  },
  (t) => ({
    userIdx: index("issued_cards_user_idx").on(t.userId),
    statusIdx: index("issued_cards_status_idx").on(t.cardStatus),
  }),
);

// --- VERSO AIR POINTS LEDGER ---
export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    issuedCardId: integer("issued_card_id").references(() => issuedCards.id),
    type: varchar("type", { length: 30 }).notNull(), // earn, redeem, bonus, tier_upgrade, expiry, adjustment
    points: integer("points").notNull(), // positive = earn, negative = spend
    balance: integer("balance").notNull(), // running balance after this txn
    description: text("description"),
    // Transaction link (for earn from card spend)
    stripeTransactionId: varchar("stripe_transaction_id", { length: 255 }),
    transactionAmount: decimal("transaction_amount", {
      precision: 12,
      scale: 2,
    }),
    transactionCurrency: varchar("transaction_currency", { length: 3 }),
    merchantName: text("merchant_name"),
    merchantCategory: varchar("merchant_category", { length: 100 }),
    // Points calculation
    basePoints: integer("base_points"), // before multiplier
    multiplier: decimal("multiplier", { precision: 4, scale: 2 }), // tier multiplier applied
    categoryBonus: decimal("category_bonus", { precision: 4, scale: 2 }), // extra category bonus
    tierAtEarning: varchar("tier_at_earning", { length: 20 }),
    // Expiry
    expiresAt: timestamp("expires_at"), // points expire after 12 months
    expiredAt: timestamp("expired_at"), // actual expiry date
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("points_ledger_user_idx").on(t.userId),
    typeIdx: index("points_ledger_type_idx").on(t.type),
    expiryIdx: index("points_ledger_expiry_idx").on(t.expiresAt),
  }),
);

// --- POINTS REDEMPTION OPTIONS ---
export const pointsRedemptions = pgTable("points_redemptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "1 Month Essential Upgrade", "$10 Ad Credit"
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  rewardType: varchar("reward_type", { length: 30 }).notNull(), // tier_upgrade, ad_credit, feature_unlock, merch, donation
  rewardValue: jsonb("reward_value"), // { tier: "essential", months: 1 } or { credit: 10 }
  isActive: boolean("is_active").default(true),
  minTier: varchar("min_tier", { length: 20 }), // minimum tier required to redeem
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIssuedCardSchema = createInsertSchema(issuedCards);
export const insertPointsLedgerSchema = createInsertSchema(pointsLedger);
export const insertPointsRedemptionSchema =
  createInsertSchema(pointsRedemptions);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎵 STREAMROYALE — Competition Streaming Platform
// ═══════════════════════════════════════════════════════════════════════════════

// --- ARTIST PROFILES (StreamRoyale competition data) ---
export const artistProfiles = pgTable(
  "artist_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    stageName: text("stage_name").notNull(),
    legalName: text("legal_name"),
    genre: jsonb("genre").$type<string[]>().default([]), // max 3 genres
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    bio: text("bio"),
    spotifyUrl: text("spotify_url"),
    instagramHandle: text("instagram_handle"),
    profileImageUrl: text("profile_image_url"),

    // ── Artist Division & Code ──
    // Permanent unique code: VA_[prefix]_[division]_[YYYYMMDD]_[6-hex]
    // Staff override: VA_JOE_SYS_MASTER
    artistCode: varchar("artist_code", { length: 50 }).unique(),
    // Division: discovery | indie | pro | elite | signed | legend
    division: varchar("division", { length: 20 }).default("discovery"),
    // A&R evaluation
    evaluationScore: decimal("evaluation_score", { precision: 4, scale: 1 }), // avg 0.0–10.0
    evaluationStatus: varchar("evaluation_status", { length: 20 }).default(
      "pending",
    ), // pending | approved | rejected | resubmit
    // Contract access level tied to division
    contractAccess: varchar("contract_access", { length: 20 }).default("none"), // none | view | standard | priority | full
    // Next quarterly promotion review date
    promotionEligibleAt: timestamp("promotion_eligible_at"),

    // League & competition
    leagueId: integer("league_id"),
    lifetimeStreams: integer("lifetime_streams").default(0),
    weeklyStreams: integer("weekly_streams").default(0),
    currentBadgeTier: integer("current_badge_tier").default(1), // 1=Initiate → 7=Legendary Titan
    // Wallet & payouts
    walletBalance: decimal("wallet_balance", {
      precision: 12,
      scale: 2,
    }).default("0.00"),
    payoutEmail: text("payout_email"),
    payoutMethod: varchar("payout_method", { length: 20 }).default("paypal"), // paypal, bank, credits
    verifiedForPayout: boolean("verified_for_payout").default(false),
    revenueBoostPercent: decimal("revenue_boost_percent", {
      precision: 4,
      scale: 2,
    }).default("0.00"), // badge bonus
    // Status
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("artist_profiles_user_idx").on(t.userId),
    leagueIdx: index("artist_profiles_league_idx").on(t.leagueId),
    badgeIdx: index("artist_profiles_badge_idx").on(t.currentBadgeTier),
    streamsIdx: index("artist_profiles_streams_idx").on(t.lifetimeStreams),
    codeIdx: index("artist_profiles_code_idx").on(t.artistCode),
    divisionIdx: index("artist_profiles_division_idx").on(t.division),
  }),
);

// --- A&R EVALUATION SUBMISSIONS ---
// Artists submit demo projects for review before getting streaming access
export const evaluationSubmissions = pgTable(
  "evaluation_submissions",
  {
    id: serial("id").primaryKey(),
    artistId: integer("artist_id")
      .references(() => artistProfiles.id, { onDelete: "cascade" })
      .notNull(),
    // Submission content
    tracks:
      jsonb("tracks").$type<
        Array<{ title: string; url: string; durationSec?: number }>
      >(),
    coverArtUrl: text("cover_art_url"),
    projectTitle: text("project_title"),
    projectNotes: text("project_notes"),
    // Review status
    status: varchar("status", { length: 20 }).default("pending"), // pending | under_review | approved | rejected | resubmit
    // Scoring — 4 axes, each 1–10
    scores: jsonb("scores").$type<{
      production?: number;
      originality?: number;
      craft?: number;
      marketReadiness?: number;
    }>(),
    aiScore: decimal("ai_score", { precision: 4, scale: 1 }), // AI pre-score
    finalScore: decimal("final_score", { precision: 4, scale: 1 }), // human-confirmed
    reviewerId: integer("reviewer_id").references(() => users.id),
    reviewerNotes: text("reviewer_notes"),
    reviewedAt: timestamp("reviewed_at"),
    // Resubmission tracking
    resubmitAfter: timestamp("resubmit_after"), // earliest resubmit date (30 days after rejection)
    submissionNumber: integer("submission_number").default(1), // 1st, 2nd, 3rd attempt
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    artistIdx: index("eval_submissions_artist_idx").on(t.artistId),
    statusIdx: index("eval_submissions_status_idx").on(t.status),
  }),
);

// --- PROMOTION THRESHOLDS (adaptive, ML-updated) ---
// Stores current division promotion thresholds per league, updated by Python ML service
export const promotionThresholds = pgTable("promotion_thresholds", {
  id: serial("id").primaryKey(),
  fromDivision: varchar("from_division", { length: 20 }).notNull(), // discovery → indie, indie → pro, etc.
  toDivision: varchar("to_division", { length: 20 }).notNull(),
  leagueId: integer("league_id").references(() => regionalLeagues.id),
  // Thresholds (adaptive — seed values, ML adjusts)
  minStreams: integer("min_streams").default(10000),
  minReleases: integer("min_releases").default(2),
  minActiveDays: integer("min_active_days").default(90),
  minEngagementRate: decimal("min_engagement_rate", { precision: 5, scale: 2 }), // saves+shares / streams
  minListenerRetention: decimal("min_listener_retention", {
    precision: 5,
    scale: 2,
  }), // % full-track listens
  // ML metadata
  computedAt: timestamp("computed_at").defaultNow(),
  sampleSize: integer("sample_size"), // how many artists in this division were analyzed
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }), // 0–1, how confident ML is
});

// --- REGIONAL LEAGUES ---
export const regionalLeagues = pgTable("regional_leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Africa, Americas, Asia-Pacific, Europe, Middle East
  description: text("description"),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- STREAMING PLANS (Listener subscriptions) ---
export const streamingPlans = pgTable("streaming_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // Supporter, Champion, Patron
  monthlyFee: decimal("monthly_fee", { precision: 8, scale: 2 }).notNull(), // 4.99, 9.99, 19.99
  streamLimit: integer("stream_limit"), // null = unlimited
  poolContributionPercent: integer("pool_contribution_percent").notNull(), // 70, 75, 80
  boostCredits: integer("boost_credits").default(0), // 0, 5, 20
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- LISTENER SUBSCRIPTIONS ---
export const listenerSubscriptions = pgTable(
  "listener_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    planId: integer("plan_id")
      .references(() => streamingPlans.id)
      .notNull(),
    status: varchar("status", { length: 20 }).default("active"), // active, cancelled, past_due, trialing
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    boostCreditsRemaining: integer("boost_credits_remaining").default(0),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("listener_subs_user_idx").on(t.userId),
    statusIdx: index("listener_subs_status_idx").on(t.status),
  }),
);

// --- STREAM EVENTS (Individual validated stream records) ---
export const streamEvents = pgTable(
  "stream_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id").references(() => users.id),
    trackId: integer("track_id").references(() => musicTracks.id),
    artistProfileId: integer("artist_profile_id").references(
      () => artistProfiles.id,
    ),
    sessionId: varchar("session_id", { length: 64 }), // nanoid per play session
    duration: integer("duration").notNull(), // seconds listened
    isValid: boolean("is_valid").default(false), // true if ≥30s
    isSelfStream: boolean("is_self_stream").default(false),
    boosted: boolean("boosted").default(false),
    boostMultiplier: decimal("boost_multiplier", {
      precision: 4,
      scale: 2,
    }).default("1.00"),
    superStream: boolean("super_stream").default(false), // 5x multiplier
    weekNumber: integer("week_number").notNull(),
    yearNumber: integer("year_number").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("stream_events_user_idx").on(t.userId),
    trackIdx: index("stream_events_track_idx").on(t.trackId),
    artistIdx: index("stream_events_artist_idx").on(t.artistProfileId),
    weekIdx: index("stream_events_week_idx").on(t.weekNumber, t.yearNumber),
    validIdx: index("stream_events_valid_idx").on(t.isValid),
  }),
);

// --- WEEKLY POOLS (Competition cycle) ---
export const weeklyPools = pgTable(
  "weekly_pools",
  {
    id: serial("id").primaryKey(),
    weekNumber: integer("week_number").notNull(),
    yearNumber: integer("year_number").notNull(),
    totalPool: decimal("total_pool", { precision: 12, scale: 2 }).default(
      "0.00",
    ),
    guaranteedFund: decimal("guaranteed_fund", {
      precision: 12,
      scale: 2,
    }).default("0.00"), // 20%
    performancePool: decimal("performance_pool", {
      precision: 12,
      scale: 2,
    }).default("0.00"), // 70%
    platformCut: decimal("platform_cut", { precision: 12, scale: 2 }).default(
      "0.00",
    ), // 10%
    totalStreams: integer("total_streams").default(0),
    qualifyingArtists: integer("qualifying_artists").default(0),
    status: varchar("status", { length: 20 }).default("open"), // open, locked, distributed
    distributedAt: timestamp("distributed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    weekYearIdx: unique("weekly_pools_week_year_uniq").on(
      t.weekNumber,
      t.yearNumber,
    ),
    statusIdx: index("weekly_pools_status_idx").on(t.status),
  }),
);

// --- ARTIST ROYALTIES (Per-artist per-week earnings) ---
export const artistRoyalties = pgTable(
  "artist_royalties",
  {
    id: serial("id").primaryKey(),
    artistProfileId: integer("artist_profile_id")
      .references(() => artistProfiles.id, { onDelete: "cascade" })
      .notNull(),
    weekNumber: integer("week_number").notNull(),
    yearNumber: integer("year_number").notNull(),
    guaranteedAmount: decimal("guaranteed_amount", {
      precision: 12,
      scale: 2,
    }).default("0.00"),
    performanceAmount: decimal("performance_amount", {
      precision: 12,
      scale: 2,
    }).default("0.00"),
    badgeBonus: decimal("badge_bonus", { precision: 12, scale: 2 }).default(
      "0.00",
    ),
    tipIncome: decimal("tip_income", { precision: 12, scale: 2 }).default(
      "0.00",
    ),
    totalEarnings: decimal("total_earnings", {
      precision: 12,
      scale: 2,
    }).default("0.00"),
    streamCount: integer("stream_count").default(0),
    poolSharePercent: decimal("pool_share_percent", {
      precision: 8,
      scale: 4,
    }).default("0.00"),
    globalRank: integer("global_rank"),
    regionalRank: integer("regional_rank"),
    paidOut: boolean("paid_out").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    artistWeekIdx: unique("artist_royalties_artist_week_uniq").on(
      t.artistProfileId,
      t.weekNumber,
      t.yearNumber,
    ),
    weekIdx: index("artist_royalties_week_idx").on(t.weekNumber, t.yearNumber),
  }),
);

// --- ARTIST BADGES (Warrior experience tiers) ---
export const artistBadges = pgTable(
  "artist_badges",
  {
    id: serial("id").primaryKey(),
    artistProfileId: integer("artist_profile_id")
      .references(() => artistProfiles.id, { onDelete: "cascade" })
      .notNull(),
    tier: integer("tier").notNull(), // 1-7
    badgeName: varchar("badge_name", { length: 50 }).notNull(),
    lifetimeStreamsAtUnlock: integer("lifetime_streams_at_unlock").default(0),
    revenueBoostPercent: decimal("revenue_boost_percent", {
      precision: 4,
      scale: 2,
    }).default("0.00"),
    unlockedAt: timestamp("unlocked_at").defaultNow(),
  },
  (t) => ({
    artistIdx: index("artist_badges_artist_idx").on(t.artistProfileId),
    tierIdx: index("artist_badges_tier_idx").on(t.tier),
  }),
);

// --- PAYOUT REQUESTS ---
export const payoutRequests = pgTable(
  "payout_requests",
  {
    id: serial("id").primaryKey(),
    artistProfileId: integer("artist_profile_id")
      .references(() => artistProfiles.id, { onDelete: "cascade" })
      .notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    method: varchar("method", { length: 20 }).notNull(), // paypal, bank, credits
    status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, rejected
    paypalEmail: text("paypal_email"),
    bankDetails: jsonb("bank_details"),
    notes: text("notes"),
    processedAt: timestamp("processed_at"),
    processedBy: integer("processed_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    artistIdx: index("payout_requests_artist_idx").on(t.artistProfileId),
    statusIdx: index("payout_requests_status_idx").on(t.status),
  }),
);

// StreamRoyale insert schemas & types
export const insertArtistProfileSchema = createInsertSchema(artistProfiles);
export const insertStreamEventSchema = createInsertSchema(streamEvents);
export const insertWeeklyPoolSchema = createInsertSchema(weeklyPools);
export const insertArtistRoyaltySchema = createInsertSchema(artistRoyalties);
export const insertArtistBadgeSchema = createInsertSchema(artistBadges);
export const insertPayoutRequestSchema = createInsertSchema(payoutRequests);

export type ArtistProfile = typeof artistProfiles.$inferSelect;
export type InsertArtistProfile = typeof artistProfiles.$inferInsert;
export type StreamEvent = typeof streamEvents.$inferSelect;
export type WeeklyPool = typeof weeklyPools.$inferSelect;
export type ArtistRoyalty = typeof artistRoyalties.$inferSelect;
export type ArtistBadge = typeof artistBadges.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

// ══════════════════════════════════════════════════════════════════
// VERSO AIR STREAMING PLATFORM TABLES
// ══════════════════════════════════════════════════════════════════

// --- ALBUMS ---
export const albums = pgTable(
  "albums",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    artistId: integer("artist_id").references(() => musicArtists.id, {
      onDelete: "cascade",
    }),
    coverArt: text("cover_art"),
    releaseDate: timestamp("release_date"),
    genre: text("genre"),
    description: text("description"),
    albumType: varchar("album_type", { length: 20 }).default("album"), // album, single, ep
    totalTracks: integer("total_tracks").default(0),
    totalDuration: integer("total_duration").default(0), // seconds
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    artistIdx: index("albums_artist_idx").on(t.artistId),
  }),
);

// --- PLAYLISTS ---
export const playlists = pgTable(
  "playlists",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    coverArt: text("cover_art"),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    isPublic: boolean("is_public").default(true),
    isSystem: boolean("is_system").default(false), // for "Liked Songs" etc.
    totalTracks: integer("total_tracks").default(0),
    totalDuration: integer("total_duration").default(0),
    plays: integer("plays").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("playlists_user_idx").on(t.userId),
  }),
);

// --- PLAYLIST TRACKS (join table with ordering) ---
export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: serial("id").primaryKey(),
    playlistId: integer("playlist_id")
      .references(() => playlists.id, { onDelete: "cascade" })
      .notNull(),
    trackId: integer("track_id")
      .references(() => musicTracks.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at").defaultNow(),
  },
  (t) => ({
    playlistIdx: index("playlist_tracks_playlist_idx").on(t.playlistId),
    trackIdx: index("playlist_tracks_track_idx").on(t.trackId),
    uniqueEntry: unique("playlist_tracks_unique").on(t.playlistId, t.trackId),
  }),
);

// --- STREAM PLAYS (individual play records for analytics — distinct from StreamRoyale competition) ---
export const streamPlays = pgTable(
  "stream_plays",
  {
    id: serial("id").primaryKey(),
    trackId: integer("track_id")
      .references(() => musicTracks.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id").references(() => users.id),
    artistId: integer("artist_id").references(() => musicArtists.id),
    duration: integer("duration").default(0), // seconds listened
    completed: boolean("completed").default(false), // listened ≥30s
    sessionId: varchar("session_id", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    trackIdx: index("stream_plays_track_idx").on(t.trackId),
    userIdx: index("stream_plays_user_idx").on(t.userId),
    artistIdx: index("stream_plays_artist_idx").on(t.artistId),
    dateIdx: index("stream_plays_date_idx").on(t.createdAt),
  }),
);

// --- TRACK LIKES ---
export const trackLikes = pgTable(
  "track_likes",
  {
    id: serial("id").primaryKey(),
    trackId: integer("track_id")
      .references(() => musicTracks.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqueLike: unique("track_likes_unique").on(t.trackId, t.userId),
    trackIdx: index("track_likes_track_idx").on(t.trackId),
    userIdx: index("track_likes_user_idx").on(t.userId),
  }),
);

// --- TRACK COMMENTS ---
export const trackComments = pgTable(
  "track_comments",
  {
    id: serial("id").primaryKey(),
    trackId: integer("track_id")
      .references(() => musicTracks.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    parentId: integer("parent_id"), // for replies
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    trackIdx: index("track_comments_track_idx").on(t.trackId),
    userIdx: index("track_comments_user_idx").on(t.userId),
  }),
);

// --- ARTIST FOLLOWS ---
export const artistFollows = pgTable(
  "artist_follows",
  {
    id: serial("id").primaryKey(),
    artistId: integer("artist_id")
      .references(() => musicArtists.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqueFollow: unique("artist_follows_unique").on(t.artistId, t.userId),
    artistIdx: index("artist_follows_artist_idx").on(t.artistId),
    userIdx: index("artist_follows_user_idx").on(t.userId),
  }),
);

// --- USER SUBSCRIPTION TIERS (for the streaming platform) ---
export const streamingSubscriptions = pgTable(
  "streaming_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    tier: varchar("tier", { length: 20 }).default("free").notNull(), // free, premium, artist
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    monthlyPrice: decimal("monthly_price", { precision: 8, scale: 2 }).default(
      "0.00",
    ),
    maxDownloadsPerMonth: integer("max_downloads_per_month").default(0),
    downloadsUsed: integer("downloads_used").default(0),
    noAds: boolean("no_ads").default(false),
    highQuality: boolean("high_quality").default(false),
    offlineAccess: boolean("offline_access").default(false),
    status: varchar("status", { length: 20 }).default("active"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("streaming_subs_user_idx").on(t.userId),
    tierIdx: index("streaming_subs_tier_idx").on(t.tier),
  }),
);

// --- LISTENING HISTORY (for "Recently Played") ---
export const listeningHistory = pgTable(
  "listening_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    trackId: integer("track_id")
      .references(() => musicTracks.id, { onDelete: "cascade" })
      .notNull(),
    playedAt: timestamp("played_at").defaultNow(),
    duration: integer("duration").default(0),
  },
  (t) => ({
    userIdx: index("listening_history_user_idx").on(t.userId),
    dateIdx: index("listening_history_date_idx").on(t.playedAt),
  }),
);

// Streaming platform insert schemas & types
export const insertAlbumSchema = createInsertSchema(albums);
export const insertPlaylistSchema = createInsertSchema(playlists);
export const insertPlaylistTrackSchema = createInsertSchema(playlistTracks);
export const insertStreamPlaySchema = createInsertSchema(streamPlays);
export const insertTrackLikeSchema = createInsertSchema(trackLikes);
export const insertTrackCommentSchema = createInsertSchema(trackComments);
export const insertArtistFollowSchema = createInsertSchema(artistFollows);
export const insertStreamingSubscriptionSchema = createInsertSchema(
  streamingSubscriptions,
);
export const insertListeningHistorySchema =
  createInsertSchema(listeningHistory);

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = typeof playlists.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type StreamPlay = typeof streamPlays.$inferSelect;
export type TrackLike = typeof trackLikes.$inferSelect;
export type TrackComment = typeof trackComments.$inferSelect;
export type ArtistFollow = typeof artistFollows.$inferSelect;
export type StreamingSubscription = typeof streamingSubscriptions.$inferSelect;
export type ListeningHistory = typeof listeningHistory.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════
// ARTIST CONTRACT APPLICATION & GRADE SYSTEM
// Artists submit applications → admin reviews → approve with grade → benefits unlock
// ═══════════════════════════════════════════════════════════════════════

/**
 * Grade tiers determine revenue share and platform benefits:
 *  S  — Elite / Exclusive  → 85% artist share, featured homepage, priority support, FLAC, unlimited
 *  A  — Established        → 75% artist share, featured rotation, analytics pro, 320kbps, 50 downloads/mo
 *  B  — Rising             → 65% artist share, standard featuring, basic analytics, 256kbps, 20 downloads/mo
 *  C  — Entry              → 55% artist share, catalog listing only, 128kbps, 5 downloads/mo
 *  pending — Application submitted, awaiting review
 *  rejected — Application denied (can reapply after cooldown)
 */
export const artistContracts = pgTable(
  "artist_contracts",
  {
    id: serial("id").primaryKey(),
    // Link to the music_artists row (nullable until approved/created)
    artistId: integer("artist_id").references(() => musicArtists.id, {
      onDelete: "cascade",
    }),
    // Applicant identity
    userId: integer("user_id").references(() => users.id),
    email: text("email").notNull(),
    stageName: text("stage_name").notNull(),
    legalName: text("legal_name").notNull(),
    // Application details
    genre: varchar("genre", { length: 100 }),
    country: varchar("country", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    biography: text("biography"),
    portfolioUrl: text("portfolio_url"), // link to existing work (Spotify, YouTube, SoundCloud, etc.)
    spotifyUrl: text("spotify_url"),
    instagramUrl: text("instagram_url"),
    websiteUrl: text("website_url"),
    sampleTrackUrl: text("sample_track_url"), // uploaded demo or link
    motivation: text("motivation"), // why they want to join Verso Air
    monthlyListeners: integer("monthly_listeners").default(0), // self-reported
    yearsActive: integer("years_active").default(0),
    // Contract terms
    grade: varchar("grade", { length: 10 }).default("pending"), // S, A, B, C, pending, rejected
    revenueShareArtist: integer("revenue_share_artist").default(0), // percentage (0-100)
    revenueSharePlatform: integer("revenue_share_platform").default(0),
    maxDownloadsPerMonth: integer("max_downloads_per_month").default(0),
    audioQuality: varchar("audio_quality", { length: 10 }).default("128"), // 128, 256, 320, flac
    canBeFeatured: boolean("can_be_featured").default(false),
    hasAnalyticsAccess: boolean("has_analytics_access").default(false),
    hasPrioritySupport: boolean("has_priority_support").default(false),
    // Workflow
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, under_review, approved, rejected, suspended, expired
    reviewedBy: integer("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    // Terms acceptance
    agreedToTerms: boolean("agreed_to_terms").default(false),
    agreedToRevShare: boolean("agreed_to_rev_share").default(false),
    // Dates
    appliedAt: timestamp("applied_at").defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
    contractStartDate: timestamp("contract_start_date"),
    contractEndDate: timestamp("contract_end_date"), // null = indefinite
    lastModified: timestamp("last_modified").defaultNow(),
  },
  (t) => ({
    emailIdx: index("artist_contracts_email_idx").on(t.email),
    statusIdx: index("artist_contracts_status_idx").on(t.status),
    gradeIdx: index("artist_contracts_grade_idx").on(t.grade),
    artistIdx: index("artist_contracts_artist_idx").on(t.artistId),
  }),
);

export const insertArtistContractSchema = createInsertSchema(artistContracts);
export type ArtistContract = typeof artistContracts.$inferSelect;
export type InsertArtistContract = typeof artistContracts.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// 📢 MARKETING PLATFORM — Journal, Packs, Print Services, Orders, Newsletters
// ═══════════════════════════════════════════════════════════════════════════════

// --- AD JOURNAL LISTINGS (Free & Premium classifieds) ---
export const adJournalListings = pgTable(
  "ad_journal_listings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"), // HTML from rich-text editor
    category: varchar("category", { length: 100 }).notNull(), // promotions, services, events, jobs, real-estate
    type: varchar("type", { length: 20 }).default("free"), // 'free' | 'premium'
    status: varchar("status", { length: 20 }).default("draft"), // 'draft' | 'pending' | 'active' | 'expired' | 'rejected'
    images: jsonb("images").$type<string[]>().default([]),
    contactEmail: varchar("contact_email"),
    contactPhone: varchar("contact_phone"),
    businessName: text("business_name"),
    location: text("location"),
    expiresAt: timestamp("expires_at"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("ad_journal_status_idx").on(t.status),
    categoryIdx: index("ad_journal_category_idx").on(t.category),
    userIdx: index("ad_journal_user_idx").on(t.userId),
    typeIdx: index("ad_journal_type_idx").on(t.type),
  }),
);

// --- JOURNAL EDITIONS (Generated PDF archive) ---
export const journalEditions = pgTable(
  "journal_editions",
  {
    id: serial("id").primaryKey(),
    editionDate: date("edition_date").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'weekly' | 'monthly' | 'on_demand'
    filePath: text("file_path").notNull(),
    listingCount: integer("listing_count").default(0),
    generatedAt: timestamp("generated_at").defaultNow(),
  },
  (t) => ({
    typeIdx: index("journal_editions_type_idx").on(t.type),
    dateIdx: index("journal_editions_date_idx").on(t.editionDate),
  }),
);

// --- MARKETING PACKS (Bundled marketing products) ---
export const marketingPacks = pgTable(
  "marketing_packs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    tier: varchar("tier", { length: 20 }).notNull(), // 'basic' | 'standard' | 'premium' | 'pro'
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    features: jsonb("features").$type<string[]>().default([]),
    active: boolean("active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    tierIdx: index("marketing_packs_tier_idx").on(t.tier),
    activeIdx: index("marketing_packs_active_idx").on(t.active),
  }),
);

// --- PACK ITEMS (Individual items within a marketing pack) ---
export const packItems = pgTable(
  "pack_items",
  {
    id: serial("id").primaryKey(),
    packId: integer("pack_id")
      .references(() => marketingPacks.id, { onDelete: "cascade" })
      .notNull(),
    itemType: varchar("item_type", { length: 50 }).notNull(), // 'journal_insertion', 'flyer', 'poster', 'newsletter', 'training'
    description: text("description"),
    quantity: integer("quantity").default(1),
  },
  (t) => ({
    packIdx: index("pack_items_pack_idx").on(t.packId),
  }),
);

// --- PRINT PRODUCTS (Catalog of print services) ---
export const printProducts = pgTable(
  "print_products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    category: varchar("category", { length: 30 }).notNull(), // 'flyer' | 'card' | 'brochure' | 'poster' | 'catalog'
    description: text("description"),
    specs: jsonb("specs")
      .$type<{
        width_mm: number;
        height_mm: number;
        dpi_min: number;
        bleed_mm: number;
        color_space: string;
      }>()
      .default({
        width_mm: 210,
        height_mm: 297,
        dpi_min: 300,
        bleed_mm: 3,
        color_space: "CMYK",
      }),
    priceCents: integer("price_cents").notNull(),
    turnaroundDays: integer("turnaround_days").default(3),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    categoryIdx: index("print_products_category_idx").on(t.category),
    activeIdx: index("print_products_active_idx").on(t.active),
  }),
);

// --- PRINT JOBS (Production queue) ---
export const printJobs = pgTable(
  "print_jobs",
  {
    id: serial("id").primaryKey(),
    orderItemId: integer("order_item_id"), // linked after order
    printProductId: integer("print_product_id").references(
      () => printProducts.id,
    ),
    userId: integer("user_id").references(() => users.id),
    filePath: text("file_path"),
    fileName: text("file_name"),
    validationReport: jsonb("validation_report").$type<{
      checks: Array<{
        name: string;
        status: "pass" | "warn" | "fail" | "skip";
        detail: string;
      }>;
    }>(),
    status: varchar("status", { length: 30 }).default("received"), // 'received' | 'layout' | 'sent_to_printer' | 'printing' | 'printed' | 'distributed' | 'complete'
    quantity: integer("quantity").default(1),
    notes: text("notes"),
    assignedAt: timestamp("assigned_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("print_jobs_status_idx").on(t.status),
    userIdx: index("print_jobs_user_idx").on(t.userId),
  }),
);

// --- CART ITEMS (Shared cart — polymorphic) ---
export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    sessionId: varchar("session_id", { length: 64 }), // for anonymous cart merge
    itemType: varchar("item_type", { length: 30 }).notNull(), // 'pack' | 'print' | 'ad_upgrade' | 'journal_premium'
    itemId: integer("item_id").notNull(), // FK to the relevant product table
    quantity: integer("quantity").default(1),
    priceSnapshotCents: integer("price_snapshot_cents").notNull(), // price at time of add
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("cart_items_user_idx").on(t.userId),
    sessionIdx: index("cart_items_session_idx").on(t.sessionId),
  }),
);

// --- ORDERS (Completed purchases) ---
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    status: varchar("status", { length: 20 }).default("pending"), // 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    paidAt: timestamp("paid_at"),
  },
  (t) => ({
    userIdx: index("orders_user_idx").on(t.userId),
    statusIdx: index("orders_status_idx").on(t.status),
    stripeIdx: index("orders_stripe_idx").on(t.stripeSessionId),
  }),
);

// --- ORDER ITEMS (Line items in an order) ---
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    itemType: varchar("item_type", { length: 30 }).notNull(), // 'pack' | 'print' | 'ad_upgrade' | 'journal_premium'
    itemId: integer("item_id").notNull(),
    itemName: text("item_name"), // denormalized for display
    quantity: integer("quantity").default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

// --- NEWSLETTER CAMPAIGNS (Rich content campaigns) ---
export const newsletterCampaigns = pgTable(
  "newsletter_campaigns",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    subject: text("subject"),
    content: text("content"), // HTML from editor
    editorType: varchar("editor_type", { length: 20 }).default("tiptap"), // 'tiptap' | 'quill'
    status: varchar("status", { length: 20 }).default("draft"), // 'draft' | 'scheduled' | 'sending' | 'sent'
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    recipientCount: integer("recipient_count").default(0),
    openCount: integer("open_count").default(0),
    clickCount: integer("click_count").default(0),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("newsletter_campaigns_status_idx").on(t.status),
    scheduledIdx: index("newsletter_campaigns_scheduled_idx").on(t.scheduledAt),
  }),
);

// --- NEWSLETTER SUBSCRIBERS (Public opt-in list) ---
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name"),
    isActive: boolean("is_active").default(true),
    journalPdfPreference: varchar("journal_pdf_preference", {
      length: 20,
    }).default("on_demand"), // 'on_demand' | 'weekly' | 'monthly' | 'both'
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    subscribedAt: timestamp("subscribed_at").defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at"),
  },
  (t) => ({
    emailIdx: unique("newsletter_subscribers_email_uniq").on(t.email),
    userIdx: index("newsletter_subscribers_user_idx").on(t.userId),
    activeIdx: index("newsletter_subscribers_active_idx").on(t.isActive),
    tokenIdx: index("newsletter_subscribers_token_idx").on(t.unsubscribeToken),
  }),
);

// --- Marketing Platform Relations ---
export const marketingPackRelations = relations(marketingPacks, ({ many }) => ({
  items: many(packItems),
}));

export const packItemRelations = relations(packItems, ({ one }) => ({
  pack: one(marketingPacks, {
    fields: [packItems.packId],
    references: [marketingPacks.id],
  }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

// --- Marketing Platform Zod Schemas & Types ---
export const insertAdJournalListingSchema =
  createInsertSchema(adJournalListings);
export const insertJournalEditionSchema = createInsertSchema(journalEditions);
export const insertMarketingPackSchema = createInsertSchema(marketingPacks);
export const insertPackItemSchema = createInsertSchema(packItems);
export const insertPrintProductSchema = createInsertSchema(printProducts);
export const insertPrintJobSchema = createInsertSchema(printJobs);
export const insertCartItemSchema = createInsertSchema(cartItems);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertNewsletterCampaignSchema =
  createInsertSchema(newsletterCampaigns);
export const insertNewsletterSubscriberSchema = createInsertSchema(
  newsletterSubscribers,
);

export type AdJournalListing = typeof adJournalListings.$inferSelect;
export type InsertAdJournalListing = typeof adJournalListings.$inferInsert;
export type JournalEdition = typeof journalEditions.$inferSelect;
export type MarketingPack = typeof marketingPacks.$inferSelect;
export type InsertMarketingPack = typeof marketingPacks.$inferInsert;
export type PackItem = typeof packItems.$inferSelect;
export type PrintProduct = typeof printProducts.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;
export type InsertPrintJob = typeof printJobs.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
export type InsertNewsletterCampaign = typeof newsletterCampaigns.$inferInsert;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// ─── User Browsing History ────────────────────────────────────────────────────
export const userBrowsingHistory = pgTable(
  "user_browsing_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: integer("business_id"),
    businessName: text("business_name"),
    sector: text("sector"), // batiment | commerce | hotellerie | automobile | finance | divertissement
    pageUrl: text("page_url"),
    visitedAt: timestamp("visited_at").defaultNow().notNull(),
    metadata: jsonb("metadata"), // search query, filters, duration, etc.
  },
  (t) => ({
    userIdx: index("ubh_user_idx").on(t.userId),
    visitedAtIdx: index("ubh_visited_at_idx").on(t.visitedAt),
  }),
);

export const userBrowsingHistoryRelations = relations(
  userBrowsingHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [userBrowsingHistory.userId],
      references: [users.id],
    }),
  }),
);

export const insertUserBrowsingHistorySchema =
  createInsertSchema(userBrowsingHistory);
export type UserBrowsingHistory = typeof userBrowsingHistory.$inferSelect;
export type InsertUserBrowsingHistory = typeof userBrowsingHistory.$inferInsert;
