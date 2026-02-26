import {
  users,
  businesses,
  businessCategories,
  analytics,
  reservations,
  musicArtists,
  musicTracks,
  musicAnalytics,
  countries,
  regions,
  cities,
  type User,
  type InsertUser,
  type Business,
  type InsertBusiness,
  type BusinessCategory,
  type Analytics,
  type Reservation,
  type InsertReservation,
  type MusicArtist,
  type MusicTrack,
  type MusicAnalytics,
  type Country,
  type Region,
  type City,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

  // Business Categories
  getBusinessCategories(): Promise<BusinessCategory[]>;
  getBusinessCategoryBySlug(
    slug: string,
  ): Promise<BusinessCategory | undefined>;

  // Businesses
  getBusinesses(categoryId?: number): Promise<Business[]>;
  createBusiness(insertBusiness: InsertBusiness): Promise<Business>;

  // Analytics
  getAnalyticsByCategory(categorySlug: string): Promise<Analytics>;
  getAnalyticsByBusiness(businessId: number): Promise<Analytics>;

  // Reservations
  getReservations(): Promise<Reservation[]>;
  createReservation(insertReservation: InsertReservation): Promise<Reservation>;

  // Music
  getMusicArtists(): Promise<MusicArtist[]>;
  getMusicTracks(): Promise<MusicTrack[]>;
  getMusicAnalytics(): Promise<MusicAnalytics>;

  // Location Data
  getCountries(): Promise<Country[]>;
  getRegions(countryId?: number): Promise<Region[]>;
  getCities(regionId?: number): Promise<City[]>;
}

export class DatabaseStorage implements IStorage {
  // =======================
  // USERS
  // =======================
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Drizzle's insert typing is strict about required fields. Cast to any here
      // because upstream validation ensures required fields are present at runtime.
      const [user] = await db
        .insert(users)
        .values(insertUser as any)
        .returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // =======================
  // BUSINESS CATEGORIES
  // =======================
  async getBusinessCategories(): Promise<BusinessCategory[]> {
    try {
      return await db.select().from(businessCategories);
    } catch (error) {
      console.error("Error getting business categories:", error);
      throw error;
    }
  }

  async getBusinessCategoryBySlug(
    slug: string,
  ): Promise<BusinessCategory | undefined> {
    try {
      const [category] = await db
        .select()
        .from(businessCategories)
        .where(eq(businessCategories.slug, slug));
      return category;
    } catch (error) {
      console.error("Error getting business category by slug:", error);
      throw error;
    }
  }

  // =======================
  // BUSINESSES
  // =======================
  async getBusinesses(categoryId?: number): Promise<Business[]> {
    try {
      // DEBUG: Check current database user and permissions
      const userResult = await db.execute(
        sql`SELECT current_user, current_database()`,
      );
      console.log(
        "=== DEBUG: Current DB User:",
        userResult.rows[0].current_user,
      );
      console.log(
        "=== DEBUG: Current Database:",
        userResult.rows[0].current_database,
      );

      if (categoryId) {
        return await db
          .select()
          .from(businesses)
          .where(eq(businesses.categoryId, categoryId));
      }
      return await db.select().from(businesses);
    } catch (error) {
      console.error("Error getting businesses:", error);
      throw error;
    }
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    try {
      const [business] = await db
        .insert(businesses)
        .values(insertBusiness as any)
        .returning({
          id: businesses.id,
          name: businesses.name,
          categoryId: businesses.categoryId,
          description: businesses.description,
          email: businesses.email,
          phone: businesses.phone,
          address: businesses.address,
          isActive: businesses.isActive,
          rating: businesses.rating,
          createdAt: businesses.createdAt,
        });
      return business;
    } catch (error) {
      console.error("Error creating business:", error);
      throw error;
    }
  }

  // =======================
  // ANALYTICS
  // =======================
  async getAnalyticsByCategory(categorySlug: string): Promise<Analytics> {
    try {
      const category = await this.getBusinessCategoryBySlug(categorySlug);

      if (!category) {
        return {
          id: 0,
          categoryId: 0,
          businessId: null,
          totalReservations: 0,
          revenue: "0",
          recordedAt: new Date(),
        };
      }

      const result = await db
        .select()
        .from(analytics)
        .where(eq(analytics.categoryId, category.id))
        .orderBy(desc(analytics.recordedAt))
        .limit(1);

      const analyticsData = result[0];

      return (
        analyticsData || {
          id: 0,
          categoryId: category.id,
          businessId: null,
          totalReservations: 0,
          revenue: "0",
          recordedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Error getting analytics by category:", error);
      throw error;
    }
  }

  async getAnalyticsByBusiness(businessId: number): Promise<Analytics> {
    try {
      const result = await db
        .select()
        .from(analytics)
        .where(eq(analytics.businessId, businessId))
        .orderBy(desc(analytics.recordedAt))
        .limit(1);

      const analyticsData = result[0];

      return (
        analyticsData || {
          id: 0,
          categoryId: 0,
          businessId,
          totalReservations: 0,
          revenue: "0",
          recordedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Error getting analytics by business:", error);
      throw error;
    }
  }

  // =======================
  // RESERVATIONS
  // =======================
  async getReservations(): Promise<Reservation[]> {
    try {
      return await db
        .select()
        .from(reservations)
        .orderBy(desc(reservations.createdAt));
    } catch (error) {
      console.error("Error getting reservations:", error);
      throw error;
    }
  }

  async createReservation(
    insertReservation: InsertReservation,
  ): Promise<Reservation> {
    try {
      const [reservation] = await db
        .insert(reservations)
        .values(insertReservation as any)
        .returning();
      return reservation;
    } catch (error) {
      console.error("Error creating reservation:", error);
      throw error;
    }
  }

  // =======================
  // MUSIC
  // =======================
  async getMusicArtists(): Promise<MusicArtist[]> {
    try {
      return await db
        .select()
        .from(musicArtists)
        .orderBy(desc(musicArtists.totalStreams));
    } catch (error) {
      console.error("Error getting music artists:", error);
      throw error;
    }
  }

  async getMusicTracks(): Promise<MusicTrack[]> {
    try {
      return await db
        .select()
        .from(musicTracks)
        .orderBy(desc(musicTracks.streams));
    } catch (error) {
      console.error("Error getting music tracks:", error);
      throw error;
    }
  }

  async getMusicAnalytics(): Promise<MusicAnalytics> {
    try {
      const result = await db
        .select()
        .from(musicAnalytics)
        .orderBy(desc(musicAnalytics.recordedAt))
        .limit(1);

      const analyticsData = result[0];

      return (
        analyticsData || {
          id: 0,
          totalArtists: 0,
          totalTracks: 0,
          totalStreams: 0,
          recordedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Error getting music analytics:", error);
      throw error;
    }
  }

  // =======================
  // LOCATION DATA
  // =======================
  async getCountries(): Promise<Country[]> {
    try {
      const dbCountries = await db
        .select()
        .from(countries)
        .orderBy(countries.name);

      console.log("✅ [DEBUG] Countries length:", dbCountries.length);
      return dbCountries;
    } catch (error) {
      console.error("Error fetching countries:", error);
      // Return mock data as fallback ONLY for countries since we know this works
      console.log("Using mock countries data as fallback");
      return [
        { id: 1, name: "United States", code: "US", createdAt: new Date() },
        { id: 2, name: "Canada", code: "CA", createdAt: new Date() },
        { id: 3, name: "France", code: "FR", createdAt: new Date() },
        { id: 4, name: "Germany", code: "DE", createdAt: new Date() },
        { id: 5, name: "United Kingdom", code: "GB", createdAt: new Date() },
      ] as Country[];
    }
  }

  async getRegions(countryId?: number): Promise<Region[]> {
    try {
      if (countryId) {
        return await db
          .select()
          .from(regions)
          .where(eq(regions.countryId, countryId));
      }
      return await db.select().from(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      throw error;
    }
  }

  async getCities(regionId?: number): Promise<City[]> {
    try {
      if (regionId) {
        return await db
          .select()
          .from(cities)
          .where(eq(cities.regionId, regionId));
      }
      return await db.select().from(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
