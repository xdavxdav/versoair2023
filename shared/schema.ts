import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
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
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id"),
  categoryId: integer("category_id"),
  metricType: text("metric_type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  period: text("period"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  customerInfo: jsonb("customer_info"),
  reservationDate: timestamp("reservation_date").notNull(),
  status: text("status").default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  trackId: integer("track_id"),
  artistId: integer("artist_id"),
  metricType: text("metric_type").notNull(),
  value: integer("value"),
  period: text("period"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Relations
export const businessCategoriesRelations = relations(businessCategories, ({ many }) => ({
  businesses: many(businesses),
  analytics: many(analytics),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  category: one(businessCategories, {
    fields: [businesses.categoryId],
    references: [businessCategories.id],
  }),
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  analytics: many(analytics),
  reservations: many(reservations),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  business: one(businesses, {
    fields: [analytics.businessId],
    references: [businesses.id],
  }),
  category: one(businessCategories, {
    fields: [analytics.categoryId],
    references: [businessCategories.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  business: one(businesses, {
    fields: [reservations.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

export const musicArtistsRelations = relations(musicArtists, ({ many }) => ({
  tracks: many(musicTracks),
  analytics: many(musicAnalytics),
}));

export const musicTracksRelations = relations(musicTracks, ({ one, many }) => ({
  artist: one(musicArtists, {
    fields: [musicTracks.artistId],
    references: [musicArtists.id],
  }),
  analytics: many(musicAnalytics),
}));

export const musicAnalyticsRelations = relations(musicAnalytics, ({ one }) => ({
  track: one(musicTracks, {
    fields: [musicAnalytics.trackId],
    references: [musicTracks.id],
  }),
  artist: one(musicArtists, {
    fields: [musicAnalytics.artistId],
    references: [musicArtists.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).pick({
  name: true,
  categoryId: true,
  description: true,
  location: true,
  contactInfo: true,
});

export const insertReservationSchema = createInsertSchema(reservations).pick({
  businessId: true,
  customerInfo: true,
  reservationDate: true,
  totalAmount: true,
});

export const insertMusicArtistSchema = createInsertSchema(musicArtists).pick({
  name: true,
  genre: true,
  biography: true,
  imageUrl: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

export type InsertMusicArtist = z.infer<typeof insertMusicArtistSchema>;
export type MusicArtist = typeof musicArtists.$inferSelect;

export type BusinessCategory = typeof businessCategories.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;
export type MusicTrack = typeof musicTracks.$inferSelect;
export type MusicAnalytics = typeof musicAnalytics.$inferSelect;
