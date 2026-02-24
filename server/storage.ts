import {
  users, type User, type InsertUser,
  businesses, type Business, type InsertBusiness,
  businessCategories, type BusinessCategory,
  analytics, type Analytics,
  reservations, type Reservation, type InsertReservation,
  musicArtists, type MusicArtist,
  musicTracks, type MusicTrack,
  musicAnalytics, type MusicAnalytics,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Categories
  getBusinessCategories(): Promise<BusinessCategory[]>;
  getBusinessCategoryBySlug(slug: string): Promise<BusinessCategory | undefined>;
  // Businesses
  getBusinesses(categoryId?: number): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  // Analytics
  getAnalyticsByCategory(categorySlug: string): Promise<Analytics[]>;
  getAnalyticsByBusiness(businessId: number): Promise<Analytics[]>;
  // Reservations
  getReservations(): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  // Music
  getMusicArtists(): Promise<MusicArtist[]>;
  getMusicTracks(): Promise<MusicTrack[]>;
  getMusicAnalytics(): Promise<MusicAnalytics[]>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ── Categories ──
  async getBusinessCategories(): Promise<BusinessCategory[]> {
    return db.select().from(businessCategories);
  }

  async getBusinessCategoryBySlug(slug: string): Promise<BusinessCategory | undefined> {
    const [cat] = await db.select().from(businessCategories).where(eq(businessCategories.slug, slug));
    return cat || undefined;
  }

  // ── Businesses ──
  async getBusinesses(categoryId?: number): Promise<Business[]> {
    if (categoryId) {
      return db.select().from(businesses).where(eq(businesses.categoryId, categoryId));
    }
    return db.select().from(businesses);
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [biz] = await db.insert(businesses).values(business).returning();
    return biz;
  }

  // ── Analytics ──
  async getAnalyticsByCategory(categorySlug: string): Promise<Analytics[]> {
    const cat = await this.getBusinessCategoryBySlug(categorySlug);
    if (!cat) return [];
    return db.select().from(analytics).where(eq(analytics.categoryId, cat.id));
  }

  async getAnalyticsByBusiness(businessId: number): Promise<Analytics[]> {
    return db.select().from(analytics).where(eq(analytics.businessId, businessId));
  }

  // ── Reservations ──
  async getReservations(): Promise<Reservation[]> {
    return db.select().from(reservations);
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [res] = await db.insert(reservations).values(reservation).returning();
    return res;
  }

  // ── Music ──
  async getMusicArtists(): Promise<MusicArtist[]> {
    return db.select().from(musicArtists);
  }

  async getMusicTracks(): Promise<MusicTrack[]> {
    return db.select().from(musicTracks);
  }

  async getMusicAnalytics(): Promise<MusicAnalytics[]> {
    return db.select().from(musicAnalytics);
  }
}

export const storage = new DatabaseStorage();