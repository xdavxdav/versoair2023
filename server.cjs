const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection - USE YOUR ACTUAL CREDENTIALS HERE!
const pool = new Pool({
  user: "versoair",
  host: "localhost",
  database: "versoair_business_intelligence",
  password: "versoair2025",
  port: 5432,
});

// Simple test endpoint
app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time");
    res.json({
      success: true,
      message: "✅ Database connected!",
      time: result.rows[0].time,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      tip: "Check PostgreSQL connection settings above",
    });
  }
});

// Search endpoint compatible with your home.tsx
app.get("/api/business/search", async (req, res) => {
  try {
    console.log("Search request:", req.query);

    const { query, category, location, limit = 10 } = req.query;

    let sql = `
      SELECT 
        b.id,
        b.name as title,
        b.description,
        bc.name as category,
        b.location,
        b.rating,
        b.reviews,
        b.tags,
        b.latitude,
        b.longitude
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `;

    const params = [];

    if (query && query.trim() !== "") {
      sql += ` AND (b.name ILIKE $${
        params.length + 1
      } OR b.description ILIKE $${params.length + 1})`;
      params.push(`%${query}%`);
    }

    if (category && category.trim() !== "") {
      sql += ` AND bc.name ILIKE $${params.length + 1}`;
      params.push(`%${category}%`);
    }

    if (location && location.trim() !== "") {
      sql += ` AND b.location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    sql += ` ORDER BY b.rating DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    console.log("SQL:", sql);
    console.log("Params:", params);

    const result = await pool.query(sql, params);

    // Format the response to match your home.tsx structure
    const formattedData = result.rows.map((business) => ({
      id: business.id.toString(),
      title: business.title || "No Name",
      description: business.description || "No description",
      category: business.category || "Uncategorized",
      location: business.location || "Unknown",
      rating: parseFloat(business.rating) || 0,
      reviews: parseInt(business.reviews) || 0,
      tags: Array.isArray(business.tags) ? business.tags : [],
      latitude: parseFloat(business.latitude) || 0,
      longitude: parseFloat(business.longitude) || 0,
      created_at: new Date().toISOString(),
    }));

    const totalCount = await pool.query("SELECT COUNT(*) FROM businesses");
    const totalInDatabase = parseInt(totalCount.rows[0].count);

    res.json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      totalInDatabase: totalInDatabase,
      message: `Found ${formattedData.length} businesses`,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
    });
  }
});

// Get all businesses
app.get("/api/businesses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        bc.name as category_name
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      ORDER BY b.rating DESC
      LIMIT 20
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Ivory Coast Advertising API",
  });
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 Ivory Coast Advertising API");
  console.log("=".repeat(50));
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log("");
  console.log("📊 Available Endpoints:");
  console.log(`   🔗 http://localhost:${PORT}/api/test`);
  console.log(`   🔗 http://localhost:${PORT}/api/business/search`);
  console.log(`   🔗 http://localhost:${PORT}/api/businesses`);
  console.log(`   🔗 http://localhost:${PORT}/health`);
  console.log("");
  console.log("💡 Testing:");
  console.log(`   curl http://localhost:${PORT}/api/test`);
  console.log(
    `   curl "http://localhost:${PORT}/api/business/search?query=hotel"`
  );
  console.log("=".repeat(50));
});
