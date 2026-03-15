import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { properties } from "@shared/schema";
import { eq, and, gte, lte, like, desc, asc, or } from "drizzle-orm";

const router = Router();

// ============================================================================
// PROPERTIES ENDPOINTS
// ============================================================================

// GET all properties with pagination, filtering, and sorting
router.get("/api/properties", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      city = "",
      type = "",
      category = "",
      minPrice = "",
      maxPrice = "",
      minRating = "",
      countryCode = "",
      sortBy = "featured",
      order = "DESC",
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters = [];

    // Search by name or description
    if (search) {
      filters.push(
        or(
          like(properties.name, `${search}%`),
          like(properties.description, `${search}%`),
        ),
      );
    }

    // Filter by city
    if (city) {
      filters.push(eq(properties.city, String(city)));
    }

    // Filter by property type
    if (type) {
      filters.push(eq(properties.type, String(type)));
    }

    // Filter by category
    if (category) {
      filters.push(eq(properties.category, String(category)));
    }

    // Price range filter
    if (minPrice) {
      filters.push(gte(properties.price, String(minPrice)));
    }
    if (maxPrice) {
      filters.push(lte(properties.price, String(maxPrice)));
    }

    // Rating filter
    if (minRating) {
      filters.push(gte(properties.rating, String(minRating)));
    }

    // Country code filter
    if (countryCode) {
      filters.push(eq(properties.countryCode, String(countryCode)));
    }

    // Build sort
    let orderBy: any = desc(properties.featured);
    if (sortBy === "price") {
      orderBy =
        order === "ASC" ? asc(properties.price) : desc(properties.price);
    } else if (sortBy === "rating") {
      orderBy =
        order === "ASC" ? asc(properties.rating) : desc(properties.rating);
    } else if (sortBy === "newest") {
      orderBy =
        order === "ASC"
          ? asc(properties.createdAt)
          : desc(properties.createdAt);
    }

    // Execute query
    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(properties)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(orderBy)
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: properties.id })
        .from(properties)
        .where(filters.length > 0 ? and(...filters) : undefined),
    ]);

    const total = countResult.length;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch properties",
    });
  }
});

// GET single property by ID
router.get("/api/properties/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const property = await db
      .select()
      .from(properties)
      .where(eq(properties.id, Number(id)));

    if (!property || property.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    res.json({
      success: true,
      data: property[0],
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch property",
    });
  }
});

// POST create a new property listing
router.post("/api/properties", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      type,
      category = "rent",
      city,
      location,
      address,
      price,
      bedrooms,
      bathrooms,
      area,
      amenities,
      hostName,
      hostPhone,
      hostEmail,
    } = req.body;

    // Validate required fields
    if (!name || !type || !city || !price) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: name, type, city, and price are required",
      });
    }

    const result = await db
      .insert(properties)
      .values({
        name,
        description: description || "",
        type,
        category,
        city,
        location: location || city,
        address: address || "",
        price: String(price),
        bedrooms: bedrooms ? parseInt(String(bedrooms)) : 0,
        bathrooms: bathrooms ? parseInt(String(bathrooms)) : 0,
        area: area ? parseInt(String(area)) : 0,
        amenities: Array.isArray(amenities) ? amenities : [],
        hostName: hostName || "Owner",
        hostPhone: hostPhone || "",
        hostEmail: hostEmail || "",
        verified: false,
        featured: false,
        rating: "0.0",
        reviews: 0,
      })
      .returning();

    console.log(`✅ [PROPERTIES] New listing created: "${name}" in ${city}`);

    res.status(201).json({
      success: true,
      message: "Property listing created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create property listing",
    });
  }
});

// GET properties by city
router.get(
  "/api/properties/city/:city",
  async (req: Request, res: Response) => {
    try {
      const { city } = req.params;
      const { limit = 50 } = req.query;

      const props = await db
        .select()
        .from(properties)
        .where(eq(properties.city, city))
        .limit(Number(limit));

      res.json({
        success: true,
        data: props,
      });
    } catch (error) {
      console.error("Error fetching properties by city:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch properties",
      });
    }
  },
);

// GET unverified properties (for admin verification)
router.get(
  "/api/admin/verification/pending",
  async (req: Request, res: Response) => {
    try {
      const pendingProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.verified, false))
        .orderBy(desc(properties.createdAt));

      res.json({
        success: true,
        data: pendingProperties,
        count: pendingProperties.length,
      });
    } catch (error) {
      console.error("Error fetching pending properties:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch pending properties",
      });
    }
  },
);

// POST verify a property
router.post(
  "/api/admin/verification/:id/verify",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db
        .update(properties)
        .set({ verified: true })
        .where(eq(properties.id, parseInt(id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      res.json({
        success: true,
        message: "Property verified successfully",
        data: result[0],
      });
    } catch (error) {
      console.error("Error verifying property:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify property",
      });
    }
  },
);

// POST reject a property
router.post(
  "/api/admin/verification/:id/reject",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db
        .update(properties)
        .set({ verified: false })
        .where(eq(properties.id, parseInt(id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      res.json({
        success: true,
        message: "Property rejected",
        data: result[0],
      });
    } catch (error) {
      console.error("Error rejecting property:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reject property",
      });
    }
  },
);

// GET unique cities and property types (for filters)
router.get(
  "/api/properties/filters/metadata",
  async (req: Request, res: Response) => {
    try {
      const [cities, types, categories] = await Promise.all([
        db.selectDistinct({ city: properties.city }).from(properties),
        db.selectDistinct({ type: properties.type }).from(properties),
        db.selectDistinct({ category: properties.category }).from(properties),
      ]);

      res.json({
        success: true,
        data: {
          cities: cities.map((c) => c.city).filter(Boolean),
          types: types.map((t) => t.type).filter(Boolean),
          categories: categories.map((c) => c.category).filter(Boolean),
        },
      });
    } catch (error) {
      console.error("Error fetching filter metadata:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch filter metadata",
      });
    }
  },
);

// POST submit verification (Digital Passport)
router.post(
  "/api/verifications/submit",
  async (req: Request, res: Response) => {
    try {
      const {
        contactName,
        contactEmail,
        contactPhone,
        latitude,
        longitude,
        businessRegistrationNumber,
        openingHours,
        specialties,
        socialLinks,
      } = req.body;

      // Validate required fields
      if (!contactName || !contactEmail || !businessRegistrationNumber) {
        return res.status(400).json({
          success: false,
          error: "Missing required verification fields",
        });
      }

      // Calculate trust score
      let trustScore = 0;
      const scoreBreakdown = {
        basicInfo: 0,
        legalDocs: 0,
        marketingAssets: 0,
        industryCredentials: 0,
      };

      // Basic info scoring
      if (contactName && contactEmail && contactPhone)
        scoreBreakdown.basicInfo += 25;
      if (latitude && longitude) scoreBreakdown.basicInfo += 10;

      // Legal docs scoring (35%)
      if (businessRegistrationNumber) scoreBreakdown.legalDocs += 15;
      // Files would add 20 more points (30% split)

      // Marketing (25%)
      if (specialties && specialties.length > 0)
        scoreBreakdown.marketingAssets += 10;
      if (openingHours && Object.keys(openingHours).length > 0)
        scoreBreakdown.marketingAssets += 10;
      if (socialLinks && Object.keys(socialLinks).length > 0)
        scoreBreakdown.marketingAssets += 5;

      trustScore = Math.min(
        100,
        Object.values(scoreBreakdown).reduce((a, b) => a + b, 0),
      );

      // Create verification record
      const verificationRecord = {
        contactName,
        contactEmail,
        contactPhone,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        businessRegistrationNumber,
        verificationStatus: "pending",
        trustScore,
        scoreBreakdown,
        submittedAt: new Date(),
      };

      // Persist to database
      let savedRecord = verificationRecord;
      try {
        const insertResult = await pool.query(
          `INSERT INTO business_verifications (contact_name, contact_email, contact_phone, latitude, longitude, business_registration_number, verification_status, trust_score, score_breakdown, submitted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            verificationRecord.contactName,
            verificationRecord.contactEmail,
            verificationRecord.contactPhone,
            verificationRecord.latitude,
            verificationRecord.longitude,
            verificationRecord.businessRegistrationNumber,
            verificationRecord.verificationStatus,
            verificationRecord.trustScore,
            JSON.stringify(verificationRecord.scoreBreakdown),
            verificationRecord.submittedAt,
          ],
        );
        if (insertResult.rows[0]) {
          savedRecord = insertResult.rows[0];
        }
      } catch (dbErr: any) {
        // Table may not exist yet — log and continue (don't fail the request)
        console.warn(
          "⚠️ Could not persist verification (table may not exist yet):",
          dbErr.message,
        );
      }

      res.json({
        success: true,
        message: "Verification submitted successfully",
        data: {
          ...savedRecord,
          trustScore,
        },
      });
    } catch (error) {
      console.error("Error submitting verification:", error);
      res.status(500).json({
        success: false,
        error: "Failed to submit verification",
      });
    }
  },
);

export default router;
