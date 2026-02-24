// GET /api/business/search - Search businesses with filters
app.get("/api/business/search", async (req, res) => {
  try {
    const { query, category, location, range, lat, lng } = req.query;

    console.log("🔍 [BUSINESS SEARCH] Query params:", {
      query,
      category,
      location,
      range,
      lat,
      lng,
    });

    // Import sql here since it's used conditionally in your file
    const { sql } = await import("drizzle-orm");

    // Start building the SQL query
    let sqlQuery = db.select().from(businesses);
    const conditions = [];

    // Add text search if query exists
    if (query) {
      conditions.push(
        sql`(${businesses.name} ILIKE ${"%" + query + "%"} 
            OR ${businesses.description} ILIKE ${"%" + query + "%"})`
      );
    }

    // Add category filter
    if (category) {
      // First get category ID from slug
      const categoryRecord = await db
        .select()
        .from(businessCategories)
        .where(sql`${businessCategories.slug} = ${category}`)
        .limit(1);

      if (categoryRecord.length > 0) {
        conditions.push(
          sql`${businesses.categoryId} = ${categoryRecord[0].id}`
        );
      }
    }

    // Add location filter
    if (location) {
      conditions.push(
        sql`${businesses.location} ILIKE ${"%" + location + "%"}`
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(
        sql`${conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)}`
      );
    }

    // Get the businesses
    const businessResults = await sqlQuery;

    // Get total count from database
    const totalInDatabase = await db
      .select({ count: sql < number > `count(*)` })
      .from(businesses);

    // For now, return limited results
    const limitedResults = businessResults.slice(0, 5);

    res.json({
      success: true,
      data: limitedResults,
      total: limitedResults.length,
      totalInDatabase: totalInDatabase[0]?.count || 0,
    });
  } catch (error) {
    console.error("Business search error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
      details: error.message,
    });
  }
});
