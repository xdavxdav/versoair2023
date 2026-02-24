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
  date,
  time,
  uuid,
  char,
  primaryKey,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// =======================
// CORE TABLES
// =======================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  phone: varchar("phone"),
  avatarUrl: text("avatar_url"),
  address: jsonb("address"),
  preferences: jsonb("preferences").default({}),
  lastLogin: timestamp("last_login"),
  isVerified: boolean("is_verified").default(false),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender"),
  occupation: varchar("occupation"),
  bio: text("bio"),
});

export const businessCategories = pgTable("business_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  description: text("description"),
  location: text("location"),
  contactInfo: jsonb("contact_info"),
  ownerId: integer("owner_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  rating: decimal("rating").default("0.0"),
  reviews: integer("reviews").default(0),
  tags: jsonb("tags").default([]),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  isAdvertiser: boolean("is_advertiser").default(false),
  adBalance: decimal("ad_balance").default("0"),
  adStatus: text("ad_status").default("inactive"),
  countryCode: char("country_code", { length: 2 }).default("CI"),
  regionId: integer("region_id"),
  cityName: text("city_name"),
});

// =======================
// BUSINESS RELATED TABLES
// =======================

export const businessHours = pgTable("business_hours", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  dayOfWeek: integer("day_of_week").notNull().unique(),
  openTime: time("open_time"),
  closeTime: time("close_time"),
  isClosed: boolean("is_closed").default(false),
  breakStart: time("break_start"),
  breakEnd: time("break_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessServices = pgTable("business_services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price"),
  currency: varchar("currency").default("USD"),
  durationMinutes: integer("duration_minutes"),
  isAvailable: boolean("is_available").default(true),
  category: varchar("category"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const businessReviews = pgTable("business_reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  rating: integer("rating").notNull(),
  title: varchar("title"),
  content: text("content"),
  pros: jsonb("pros"),
  cons: jsonb("cons"),
  isVerified: boolean("is_verified").default(false),
  helpfulCount: integer("helpful_count").default(0),
  images: jsonb("images"),
  status: varchar("status").default("published"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  customerInfo: jsonb("customer_info"),
  reservationDate: timestamp("reservation_date").notNull(),
  status: text("status").default("pending"),
  totalAmount: decimal("total_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id"),
  categoryId: integer("category_id"),
  totalReservations: integer("total_reservations").default(0),
  revenue: decimal("revenue").default("0"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// =======================
// ADVERTISING TABLES
// =======================

export const adCampaigns = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective"),
  dailyBudget: decimal("daily_budget"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adAudiences = pgTable("ad_audiences", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  targetRegionId: integer("target_region_id"),
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  interests: jsonb("interests"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adCreatives = pgTable("ad_creatives", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  creativeType: text("creative_type"),
  headline: text("headline"),
  description: text("description"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adPerformance = pgTable("ad_performance", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  spend: decimal("spend").default("0"),
  reportDate: date("report_date").defaultNow(),
});

export const billingHistory = pgTable("billing_history", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  campaignId: integer("campaign_id"),
  amount: decimal("amount"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  transactionDate: timestamp("transaction_date").defaultNow(),
});

// =======================
// GEOGRAPHY TABLES
// =======================

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  countryId: integer("country_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionId: integer("region_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const targetRegions = pgTable("target_regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  population: integer("population"),
  avgIncome: decimal("avg_income"),
  primaryLanguage: text("primary_language").default("French"),
  isUrban: boolean("is_urban").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// =======================
// JOB BOARD TABLES
// =======================

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  type: varchar("type"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: varchar("currency").default("USD"),
  description: text("description"),
  requirements: jsonb("requirements"),
  benefits: jsonb("benefits"),
  skills: jsonb("skills"),
  experienceLevel: varchar("experience_level"),
  educationLevel: varchar("education_level"),
  department: varchar("department"),
  postedDate: date("posted_date").defaultNow(),
  applicationDeadline: date("application_deadline"),
  isFeatured: boolean("is_featured").default(false),
  isRemote: boolean("is_remote").default(false),
  applicationCount: integer("application_count").default(0),
  viewCount: integer("view_count").default(0),
  status: varchar("status").default("active"),
  companyLogo: text("company_logo"),
  companyDescription: text("company_description"),
  applyUrl: text("apply_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobApplications = pgTable("job_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id),
  applicantId: varchar("applicant_id"),
  status: varchar("status").default("submitted"),
  appliedDate: timestamp("applied_date").defaultNow(),
  coverLetter: text("cover_letter"),
  resumeUrl: text("resume_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedJobs = pgTable("saved_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .unique()
    .references(() => jobs.id),
  userId: varchar("user_id").unique(),
  savedDate: timestamp("saved_date").defaultNow(),
});

// =======================
// MUSIC TABLES
// =======================

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

export const musicTracks = pgTable("music_tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artistId: integer("artist_id").notNull(),
  duration: integer("duration"),
  streams: integer("streams").default(0),
  releaseDate: timestamp("release_date"),
  genre: text("genre"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const musicAnalytics = pgTable("music_analytics", {
  id: serial("id").primaryKey(),
  totalArtists: integer("total_artists").default(0),
  totalTracks: integer("total_tracks").default(0),
  totalStreams: integer("total_streams").default(0),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// =======================
// E-COMMERCE & PAYMENTS
// =======================

export const commerceCategories = pgTable("commerce_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  icon: varchar("icon"),
  color: varchar("color"),
  parentId: integer("parent_id"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  businessId: integer("business_id"),
  type: varchar("type").notNull(),
  provider: varchar("provider"),
  details: jsonb("details").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  reference: varchar("reference").notNull().unique(),
  userId: integer("user_id"),
  businessId: integer("business_id"),
  amount: decimal("amount").notNull(),
  currency: varchar("currency").default("USD"),
  type: varchar("type").notNull(),
  status: varchar("status").notNull(),
  paymentMethodId: integer("payment_method_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =======================
// CONTENT MANAGEMENT
// =======================

export const contentCategories = pgTable("content_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentPages = pgTable("content_pages", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  content: text("content"),
  excerpt: text("excerpt"),
  type: varchar("type").default("page"),
  status: varchar("status").default("draft"),
  authorId: integer("author_id"),
  featuredImage: text("featured_image"),
  seoTitle: varchar("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: jsonb("seo_keywords"),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pageCategories = pgTable(
  "page_categories",
  {
    pageId: integer("page_id")
      .notNull()
      .references(() => contentPages.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => contentCategories.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pageId, t.categoryId] }),
  })
);

// =======================
// NOTIFICATIONS & FAVORITES
// =======================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}),
  status: varchar("status").default("pending"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  businessId: integer("business_id").unique(),
  jobId: uuid("job_id").unique(),
  itemType: varchar("item_type").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// =======================
// VIEWS
// =======================

export const vCampaignPerformance = pgTable("v_campaign_performance", {
  campaignId: integer("campaign_id"),
  campaignName: text("campaign_name"),
  businessName: text("business_name"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  conversions: integer("conversions"),
  totalSpend: decimal("total_spend"),
});

// =======================
// RELATIONS
// =======================

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  businessesOwned: many(businesses, { relationName: "businessOwner" }),
  reservations: many(reservations),
  reviews: many(businessReviews),
  notifications: many(notifications),
  paymentMethods: many(paymentMethods),
  transactions: many(transactions),
}));

// Business Categories Relations
export const businessCategoriesRelations = relations(
  businessCategories,
  ({ many }) => ({
    businesses: many(businesses),
    analytics: many(analytics),
  })
);

// Businesses Relations
export const businessesRelations = relations(businesses, ({ one, many }) => ({
  category: one(businessCategories, {
    fields: [businesses.categoryId],
    references: [businessCategories.id],
  }),
  region: one(regions, {
    fields: [businesses.regionId],
    references: [regions.id],
  }),
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
    relationName: "businessOwner",
  }),
  hours: one(businessHours),
  services: many(businessServices),
  reviews: many(businessReviews),
  analytics: many(analytics),
  reservations: many(reservations),
  adCampaigns: many(adCampaigns),
  billingHistory: many(billingHistory),
  favorites: many(userFavorites),
}));

// Business Hours Relations
export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  business: one(businesses, {
    fields: [businessHours.businessId],
    references: [businesses.id],
  }),
}));

// Business Services Relations
export const businessServicesRelations = relations(
  businessServices,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessServices.businessId],
      references: [businesses.id],
    }),
  })
);

// Business Reviews Relations
export const businessReviewsRelations = relations(
  businessReviews,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessReviews.businessId],
      references: [businesses.id],
    }),
    user: one(users, {
      fields: [businessReviews.userId],
      references: [users.id],
    }),
  })
);

// Ad Campaigns Relations
export const adCampaignsRelations = relations(adCampaigns, ({ one, many }) => ({
  business: one(businesses, {
    fields: [adCampaigns.businessId],
    references: [businesses.id],
  }),
  audiences: many(adAudiences),
  creatives: many(adCreatives),
  performances: many(adPerformance),
  billingRecords: many(billingHistory),
}));

// Ad Audiences Relations
export const adAudiencesRelations = relations(adAudiences, ({ one }) => ({
  campaign: one(adCampaigns, {
    fields: [adAudiences.campaignId],
    references: [adCampaigns.id],
  }),
  targetRegion: one(targetRegions, {
    fields: [adAudiences.targetRegionId],
    references: [targetRegions.id],
  }),
}));

// Ad Creatives Relations
export const adCreativesRelations = relations(adCreatives, ({ one }) => ({
  campaign: one(adCampaigns, {
    fields: [adCreatives.campaignId],
    references: [adCampaigns.id],
  }),
}));

// Ad Performance Relations
export const adPerformanceRelations = relations(adPerformance, ({ one }) => ({
  campaign: one(adCampaigns, {
    fields: [adPerformance.campaignId],
    references: [adCampaigns.id],
  }),
}));

// Billing History Relations
export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  business: one(businesses, {
    fields: [billingHistory.businessId],
    references: [businesses.id],
  }),
  campaign: one(adCampaigns, {
    fields: [billingHistory.campaignId],
    references: [adCampaigns.id],
  }),
}));

// Geography Relations
export const countriesRelations = relations(countries, ({ many }) => ({
  regions: many(regions),
}));

export const regionsRelations = relations(regions, ({ one, many }) => ({
  country: one(countries, {
    fields: [regions.countryId],
    references: [countries.id],
  }),
  cities: many(cities),
  businesses: many(businesses),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  region: one(regions, {
    fields: [cities.regionId],
    references: [regions.id],
  }),
}));

// Jobs Relations
export const jobsRelations = relations(jobs, ({ many }) => ({
  applications: many(jobApplications),
  savedBy: many(savedJobs),
  favorites: many(userFavorites),
}));

export const jobApplicationsRelations = relations(
  jobApplications,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobApplications.jobId],
      references: [jobs.id],
    }),
  })
);

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  job: one(jobs, {
    fields: [savedJobs.jobId],
    references: [jobs.id],
  }),
}));

// Music Relations
export const musicArtistsRelations = relations(musicArtists, ({ many }) => ({
  tracks: many(musicTracks),
}));

export const musicTracksRelations = relations(musicTracks, ({ one }) => ({
  artist: one(musicArtists, {
    fields: [musicTracks.artistId],
    references: [musicArtists.id],
  }),
}));

// Payment Methods Relations
export const paymentMethodsRelations = relations(
  paymentMethods,
  ({ one, many }) => ({
    user: one(users, {
      fields: [paymentMethods.userId],
      references: [users.id],
    }),
    business: one(businesses, {
      fields: [paymentMethods.businessId],
      references: [businesses.id],
    }),
    transactions: many(transactions),
  })
);

// Transactions Relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [transactions.businessId],
    references: [businesses.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [transactions.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

// Content Pages Relations
export const contentPagesRelations = relations(
  contentPages,
  ({ one, many }) => ({
    author: one(users, {
      fields: [contentPages.authorId],
      references: [users.id],
    }),
    categories: many(pageCategories),
  })
);

// Page Categories Relations (junction table)
export const pageCategoriesRelations = relations(pageCategories, ({ one }) => ({
  page: one(contentPages, {
    fields: [pageCategories.pageId],
    references: [contentPages.id],
  }),
  category: one(contentCategories, {
    fields: [pageCategories.categoryId],
    references: [contentCategories.id],
  }),
}));

// Content Categories Relations
export const contentCategoriesRelations = relations(
  contentCategories,
  ({ one, many }) => ({
    parent: one(contentCategories, {
      fields: [contentCategories.parentId],
      references: [contentCategories.id],
    }),
    children: many(contentCategories),
    pages: many(pageCategories),
  })
);

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// User Favorites Relations
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [userFavorites.businessId],
    references: [businesses.id],
  }),
  job: one(jobs, {
    fields: [userFavorites.jobId],
    references: [jobs.id],
  }),
}));

// =======================
// ZOD SCHEMAS (Using drizzle-zod for automatic inference)
// =======================

// Core schemas
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertBusinessCategorySchema =
  createInsertSchema(businessCategories);

// Advertising schemas
export const insertAdCampaignSchema = createInsertSchema(adCampaigns);
export const insertAdAudienceSchema = createInsertSchema(adAudiences);
export const insertAdCreativeSchema = createInsertSchema(adCreatives);

// Job schemas
export const insertJobSchema = createInsertSchema(jobs);
export const insertJobApplicationSchema = createInsertSchema(jobApplications);

// Music schemas
export const insertMusicArtistSchema = createInsertSchema(musicArtists);
export const insertMusicTrackSchema = createInsertSchema(musicTracks);

// Transaction schemas
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);

// Content schemas
export const insertContentPageSchema = createInsertSchema(contentPages);

// Custom schemas with additional validation
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
});

export const campaignPerformanceQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  businessId: z.number().int().optional(),
});

// =======================
// FILTER & SEARCH TYPES
// =======================

// Filter types
export interface FilterItem {
  id: string;
  label: string;
  value: any;
  category?: string;
  location?: string;
  range?: number;
  lat?: number;
  lng?: number;
}

// Location types
export interface LocationCoords {
  lat: number;
  lng: number;
}

// Search params
export interface SearchParams {
  query: string;
  category?: string;
  location?: string;
  range?: string;
  lat?: number;
  lng?: number;
}

// Search results
export interface SearchResult<T = any> {
  data: T[];
  total: number;
  totalInDatabase: number;
  success: boolean;
}

// Modal props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Cookie consent props
export interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

// Magnetic input props
export interface MagneticInputProps {
  children: React.ReactNode;
  className?: string;
}

// Business search result type
export interface BusinessSearchResult extends Business {
  categoryName?: string;
  distance?: number;
  isOpen?: boolean;
}

// Job search result type
export interface JobSearchResult extends Job {
  companyLogoUrl?: string;
  daysAgo?: number;
  isSaved?: boolean;
}

// =======================
// COMPOSITE TYPES
// =======================

// Business with related data
export type BusinessWithRelations = Business & {
  category?: BusinessCategory;
  hours?: typeof businessHours.$inferSelect;
  services?: (typeof businessServices.$inferSelect)[];
  reviews?: (typeof businessReviews.$inferSelect)[];
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
};

// User with related data
export type UserWithRelations = User & {
  businessesOwned?: Business[];
  favorites?: (typeof userFavorites.$inferSelect)[];
  notifications?: (typeof notifications.$inferSelect)[];
};

// Ad campaign with related data
export type AdCampaignWithRelations = AdCampaign & {
  business?: Business;
  audiences?: (typeof adAudiences.$inferSelect)[];
  creatives?: (typeof adCreatives.$inferSelect)[];
  performance?: (typeof adPerformance.$inferSelect)[];
};

// Job with related data
export type JobWithRelations = Job & {
  applications?: (typeof jobApplications.$inferSelect)[];
  savedCount?: number;
  applicationCount?: number;
};

// =======================
// API RESPONSE TYPES
// =======================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =======================
// FILTER OPTIONS
// =======================

export const businessCategoryOptions = [
  { id: "restaurant", label: "Restaurants", value: "restaurant" },
  { id: "hotel", label: "Hotels", value: "hotel" },
  { id: "shop", label: "Shops", value: "shop" },
  { id: "service", label: "Services", value: "service" },
  { id: "entertainment", label: "Entertainment", value: "entertainment" },
  { id: "health", label: "Health & Beauty", value: "health" },
  { id: "education", label: "Education", value: "education" },
  { id: "transport", label: "Transport", value: "transport" },
];

export const jobTypeOptions = [
  { id: "full-time", label: "Full Time", value: "full-time" },
  { id: "part-time", label: "Part Time", value: "part-time" },
  { id: "contract", label: "Contract", value: "contract" },
  { id: "internship", label: "Internship", value: "internship" },
  { id: "remote", label: "Remote", value: "remote" },
];

export const experienceLevelOptions = [
  { id: "entry", label: "Entry Level", value: "entry" },
  { id: "mid", label: "Mid Level", value: "mid" },
  { id: "senior", label: "Senior Level", value: "senior" },
  { id: "executive", label: "Executive", value: "executive" },
];

export const adCampaignStatusOptions = [
  { id: "draft", label: "Draft", value: "draft" },
  { id: "active", label: "Active", value: "active" },
  { id: "paused", label: "Paused", value: "paused" },
  { id: "completed", label: "Completed", value: "completed" },
  { id: "archived", label: "Archived", value: "archived" },
];

// =======================
// TYPES
// =======================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type BusinessCategory = typeof businessCategories.$inferSelect;
export type InsertBusinessCategory = z.infer<
  typeof insertBusinessCategorySchema
>;

export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = z.infer<typeof insertAdCampaignSchema>;

export type AdAudience = typeof adAudiences.$inferSelect;
export type InsertAdAudience = z.infer<typeof insertAdAudienceSchema>;

export type AdCreative = typeof adCreatives.$inferSelect;
export type InsertAdCreative = z.infer<typeof insertAdCreativeSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

export type MusicArtist = typeof musicArtists.$inferSelect;
export type InsertMusicArtist = z.infer<typeof insertMusicArtistSchema>;

export type MusicTrack = typeof musicTracks.$inferSelect;
export type InsertMusicTrack = z.infer<typeof insertMusicTrackSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type ContentPage = typeof contentPages.$inferSelect;
export type InsertContentPage = z.infer<typeof insertContentPageSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =======================
// CONSTANTS
// =======================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_SEARCH_RANGE_KM = 50;
export const DEFAULT_COUNTRY_CODE = "CI";
export const DEFAULT_CURRENCY = "USD";

// =======================
// HELPER FUNCTIONS
// =======================

export function formatCurrency(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Export everything as default object for easy imports
export default {
  // Tables
  users,
  businesses,
  businessCategories,
  businessHours,
  businessServices,
  businessReviews,
  reservations,
  analytics,
  adCampaigns,
  adAudiences,
  adCreatives,
  adPerformance,
  billingHistory,
  countries,
  regions,
  cities,
  targetRegions,
  jobs,
  jobApplications,
  savedJobs,
  musicArtists,
  musicTracks,
  musicAnalytics,
  commerceCategories,
  paymentMethods,
  transactions,
  contentCategories,
  contentPages,
  pageCategories,
  notifications,
  userFavorites,
  vCampaignPerformance,

  // Relations
  usersRelations,
  businessCategoriesRelations,
  businessesRelations,
  businessHoursRelations,
  businessServicesRelations,
  businessReviewsRelations,
  adCampaignsRelations,
  adAudiencesRelations,
  adCreativesRelations,
  adPerformanceRelations,
  billingHistoryRelations,
  countriesRelations,
  regionsRelations,
  citiesRelations,
  jobsRelations,
  jobApplicationsRelations,
  savedJobsRelations,
  musicArtistsRelations,
  musicTracksRelations,
  paymentMethodsRelations,
  transactionsRelations,
  contentPagesRelations,
  pageCategoriesRelations,
  contentCategoriesRelations,
  notificationsRelations,
  userFavoritesRelations,

  // (Types are exported as TypeScript types, not runtime values)

  // Constants
  DEFAULT_PAGE_SIZE,
  MAX_SEARCH_RANGE_KM,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_CURRENCY,

  // Helper functions
  formatCurrency,
  calculateDistance,
};
