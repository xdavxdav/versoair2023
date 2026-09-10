#!/usr/bin/env node
const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function one(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] || null;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const admin = await one(
      client,
      `SELECT id, email FROM users
       WHERE role IN ('superuser', 'admin')
       ORDER BY CASE WHEN role = 'superuser' THEN 0 ELSE 1 END, id
       LIMIT 1`,
    );
    const category =
      (await one(
        client,
        `SELECT id FROM business_categories WHERE slug = $1 LIMIT 1`,
        ["test-enterprise"],
      )) ||
      (await one(
        client,
        `INSERT INTO business_categories (name, slug, description, main_category)
       VALUES ($1,$2,$3,$4) RETURNING id`,
        [
          "TEST Enterprise Category",
          "test-enterprise",
          "TEST category",
          "TEST",
        ],
      ));
    const city = await one(
      client,
      `SELECT c.id, c.name, c.region_id, r.country_id, co.code AS country_code
       FROM cities c
       LEFT JOIN regions r ON r.id = c.region_id
       LEFT JOIN countries co ON co.id = r.country_id
       ORDER BY c.id LIMIT 1`,
    );
    if (!admin || !category || !city) {
      throw new Error("Required admin, category, or city seed data is missing");
    }

    const testUser =
      (await one(client, `SELECT id FROM users WHERE username = $1 LIMIT 1`, [
        "test_geo_user",
      ])) ||
      (await one(
        client,
        `INSERT INTO users (username,email,password,role,is_verified,created_at)
         VALUES ($1,$2,$3,'user',true,NOW()) RETURNING id`,
        [
          "test_geo_user",
          "test-geo-user@example.invalid",
          await bcrypt.hash("TestOnly2026", 10),
        ],
      ));

    const testRole =
      (await one(client, `SELECT id FROM admin_roles WHERE name = $1 LIMIT 1`, [
        "TEST Content Manager",
      ])) ||
      (await one(
        client,
        `INSERT INTO admin_roles (name,description,permissions,color,is_system,created_at,updated_at)
         VALUES ($1,$2,$3,$4,false,NOW(),NOW()) RETURNING id`,
        [
          "TEST Content Manager",
          "TEST role for permissions workflow",
          JSON.stringify(["users.read", "businesses.read", "jobs.write"]),
          "#64748b",
        ],
      ));

    const business =
      (await one(client, `SELECT id FROM businesses WHERE name = $1 LIMIT 1`, [
        "TEST Enterprise Verso Air",
      ])) ||
      (await one(
        client,
        `INSERT INTO businesses
       (name, owner_id, category_id, city_id, description, email, address,
        location, country_code, country_id, region_id, city_name, website,
        opening_hours, tags, is_active, approval_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,'approved',NOW(),NOW())
       RETURNING id`,
        [
          "TEST Enterprise Verso Air",
          admin.id,
          category.id,
          city.id,
          "TEST record for enterprise creation workflow.",
          "test-enterprise@example.invalid",
          `TEST Avenue, ${city.name}`,
          city.name,
          city.country_code || "CI",
          city.country_id,
          city.region_id,
          city.name,
          "https://example.invalid/test-enterprise",
          JSON.stringify({ weekday: "08:00-18:00" }),
          JSON.stringify(["TEST", "enterprise"]),
        ],
      ));

    const job =
      (await one(client, `SELECT id FROM jobs WHERE title = $1 LIMIT 1`, [
        "TEST Job - Operations Manager",
      ])) ||
      (await one(
        client,
        `INSERT INTO jobs
       (id,title,company,business_id,location,type,sector,country_code,
        description,requirements,benefits,is_remote,is_featured,status,
        posted_date,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,'full-time','general',$6,$7,$8,$9,false,false,'active',CURRENT_DATE,NOW(),NOW())
       RETURNING id`,
        [
          randomUUID(),
          "TEST Job - Operations Manager",
          "TEST Enterprise Verso Air",
          business.id,
          city.name,
          city.country_code || "CI",
          "TEST job listing for creation and applicant workflow.",
          JSON.stringify(["2 years experience"]),
          JSON.stringify(["Health coverage"]),
        ],
      ));

    const campaign =
      (await one(
        client,
        `SELECT id FROM ad_campaigns WHERE name = $1 LIMIT 1`,
        ["TEST Campaign - Enterprise Launch"],
      )) ||
      (await one(
        client,
        `INSERT INTO ad_campaigns
             (business_id,name,objective,daily_budget,status,start_date,end_date,created_at)
             VALUES ($1,$2,$3,100.00,'active',CURRENT_DATE,CURRENT_DATE+30,NOW())
       RETURNING id`,
        [
          business.id,
          "TEST Campaign - Enterprise Launch",
          "TEST advertising campaign",
        ],
      ));

    const contract =
      (await one(
        client,
        `SELECT id FROM artist_contracts WHERE email = $1 LIMIT 1`,
        ["test-artist-contract@example.invalid"],
      )) ||
      (await one(
        client,
        `INSERT INTO artist_contracts
       (user_id,email,stage_name,legal_name,genre,country,country_code,biography,
        motivation,status,agreed_to_terms,agreed_to_rev_share,applied_at,last_modified)
         VALUES ($1,$2,$3,$4,'TEST',$5,'CI',$6,$7,'pending',true,true,NOW(),NOW())
       RETURNING id`,
        [
          admin.id,
          "test-artist-contract@example.invalid",
          "TEST Artist",
          "TEST Legal Name",
          "Cote d'Ivoire",
          "TEST contract application",
          "TEST contract workflow record",
        ],
      ));

    const listing =
      (await one(
        client,
        `SELECT id FROM ad_journal_listings WHERE title = $1 LIMIT 1`,
        ["TEST Classified Listing"],
      )) ||
      (await one(
        client,
        `INSERT INTO ad_journal_listings
       (user_id,title,description,category,type,status,contact_email,business_name,location,created_at,updated_at)
       VALUES ($1,$2,$3,'services','free','active',$4,$5,$6,NOW(),NOW())
       RETURNING id`,
        [
          admin.id,
          "TEST Classified Listing",
          "TEST marketing and journal listing.",
          "test-listing@example.invalid",
          "TEST Enterprise Verso Air",
          city.name,
        ],
      ));

    const contractor =
      (await one(
        client,
        `SELECT id FROM contractors WHERE email = $1 LIMIT 1`,
        ["test-contractor@example.invalid"],
      )) ||
      (await one(
        client,
        `INSERT INTO contractors
       (business_id,user_id,name,email,specialization,hourly_rate,is_available,created_at)
       VALUES ($1,$2,$3,$4,'TEST services',25.00,true,NOW())
       RETURNING id`,
        [
          business.id,
          admin.id,
          "TEST Contractor",
          "test-contractor@example.invalid",
        ],
      ));

    const assignedContract =
      (await one(
        client,
        `SELECT id FROM assigned_contracts WHERE title = $1 LIMIT 1`,
        ["TEST Assigned Contract"],
      )) ||
      (await one(
        client,
        `INSERT INTO assigned_contracts
       (contractor_id,assigned_by,title,description,terms,payment_amount,status,created_at)
       VALUES ($1,$2,$3,$4,$5,250.00,'offered',NOW())
       RETURNING id`,
        [
          contractor.id,
          admin.id,
          "TEST Assigned Contract",
          "TEST contractor assignment workflow.",
          "TEST terms",
        ],
      ));

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          createdOrFound: {
            category: category.id,
            business: business.id,
            job: job.id,
            campaign: campaign.id,
            artistContract: contract.id,
            listing: listing.id,
            contractor: contractor.id,
            assignedContract: assignedContract.id,
            user: testUser.id,
            role: testRole.id,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("TEST seed failed:", error.message);
  process.exitCode = 1;
});
