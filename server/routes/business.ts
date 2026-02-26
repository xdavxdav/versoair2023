// routes/business.ts
import express from "express";
import { db } from "../db";
import { businesses } from "@shared/schema";
import { ilike, or, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = express.Router();

// Zod schema for search validation
const searchParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  range: z.string().optional(),
  lat: z.string().transform(Number).optional(),
  lng: z.string().transform(Number).optional(),
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
});

// Search endpoint matching your frontend
router.get("/search", async (req, res) => {
  try {
    // Validate and parse query parameters
    const params = searchParamsSchema.parse(req.query);

    // Start building the query
    let query: any = db.select().from(businesses);
    const conditions = [];

    // Text search across multiple fields
    if (params.query && params.query.trim()) {
      const searchTerm = `%${params.query.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(businesses.name, searchTerm),
          ilike(businesses.description, searchTerm),
          ilike(businesses.address, searchTerm),
          // If you have a tags array field, you'd handle it differently
          // ilike(businesses.tags, searchTerm)
        ),
      );
    }

    // Category filter
    if (params.category) {
      // categoryId is numeric; for a quick filter match we check name/address fields
      conditions.push(ilike(businesses.name, `%${params.category}%`));
    }

    // Location filter
    if (params.location) {
      conditions.push(ilike(businesses.location, `%${params.location}%`));
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Distance calculation (if lat/lng provided)
    if (params.lat && params.lng) {
      // Add distance calculation to the query
      const distanceCalculation = sql`
        (6371 * acos(
          cos(radians(${params.lat})) * 
          cos(radians(${businesses.latitude})) * 
          cos(radians(${businesses.longitude}) - radians(${params.lng})) + 
          sin(radians(${params.lat})) * 
          sin(radians(${businesses.latitude}))
        ))
      `.as("distance");

      // Use a loose typing for these computed fields to avoid Drizzle overload complexities
      const selectFields: any = {
        ...(businesses as any),
        distance: distanceCalculation,
      };
      query = db.select(selectFields).from(businesses) as any;

      if (
        params.range &&
        params.range !== "any" &&
        params.range !== "near-me"
      ) {
        const maxDistance = parseFloat(params.range);
        conditions.push(sql`${distanceCalculation} <= ${maxDistance}`);
      }
    }

    // Pagination
    const offset = (params.page - 1) * params.limit;
    query = query.limit(params.limit).offset(offset);

    // Execute the query
    const results = await query;

    // Get total count for pagination info
    const countQuery = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countQuery[0]?.count || 0;

    // Format response to match your frontend interface
    const formattedResults = results.map((business: any) => ({
      id: business.id.toString(),
      title: business.name,
      description: business.description,
      category: business.categoryId ? String(business.categoryId) : "",
      location: business.location,
      address: business.address,
      phone: business.phone,
      email: business.email,
      rating:
        typeof business.rating === "number"
          ? business.rating
          : parseFloat(business.rating) || 0,
      reviews:
        typeof business.reviews === "number"
          ? business.reviews
          : parseInt(business.reviews) || 0,
      tags: Array.isArray(business.tags)
        ? business.tags
        : typeof business.tags === "string"
          ? business.tags.split(",").map((t: string) => t.trim())
          : [],
      latitude:
        typeof business.latitude === "number"
          ? business.latitude
          : parseFloat(business.latitude) || 0,
      longitude:
        typeof business.longitude === "number"
          ? business.longitude
          : parseFloat(business.longitude) || 0,
      distance: business.distance
        ? parseFloat(business.distance.toFixed(2))
        : undefined,
      created_at: business.created_at || new Date().toISOString(),
    }));

    res.json({
      success: true,
      data: formattedResults,
      total: total,
      totalInDatabase: total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      total: 0,
      totalInDatabase: 0,
    });
  }
});

// Test connection endpoint (matches your frontend's test endpoint)
router.get("/test-connection", async (req, res) => {
  try {
    const result = await db.execute(
      sql`SELECT NOW() as time, current_database() as db`,
    );

    res.json({
      success: true,
      database: {
        connected: true,
        database: result.rows[0]?.db,
        time: result.rows[0]?.time,
      },
    });
  } catch (error: any) {
    console.error("Test connection failed:", error);
    res.json({
      success: false,
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

// Optional: Endpoint to create a test business (for development)
router.post("/test-business", async (req, res) => {
  try {
    const testBusiness = {
      name: "Test Artisan Shop",
      description: "A test business for development",
      categoryId: 1,
      location: "abidjan",
      address: "Test Address, Abidjan",
      phone: "+225 00 00 00 00",
      email: "test@example.com",
      rating: "4.5",
      reviews: 10,
      tags: ["test", "development"],
      latitude: "5.35995",
      longitude: "-4.00824",
    };

    const [result] = await (db
      .insert(businesses)
      .values(testBusiness as any)
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
      }) as any);

    res.json({
      success: true,
      message: "Test business created",
      business: result,
    });
  } catch (error: any) {
    console.error("Create test business error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
