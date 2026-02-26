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

export const musicTracks = pgTable("music_tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artistId: integer("artist_id"),
  duration: integer("duration"),
  streams: integer("streams").default(0),
  playCount: integer("play_count").default(0), // Alias for streams in some contexts
  releaseDate: timestamp("release_date"),
  genre: text("genre"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey(),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  type: varchar("type"),
  businessId: integer("business_id").references(() => businesses.id, {
    onDelete: "set null",
  }),
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
export const musicArtists = pgTable("music_artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genre: text("genre"),
  biography: text("biography"),
  imageUrl: text("image_url"),
  totalStreams: integer("total_streams").default(0),
  monthlyListeners: integer("monthly_listeners").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

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
