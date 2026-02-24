import { db } from "./server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function generateReport() {
  try {
    console.log("🔍 Fetching database info...");

    // Get database name
    const dbRes = await db.execute(
      sql`SELECT current_database() as db_name`
    );
    const dbName = (dbRes.rows[0] as any)?.db_name;

    // Get table count
    const tableRes = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableCount = (tableRes.rows[0] as any)?.count;

    // Get all businesses with categories
    const bizRes = await db.execute(sql`
      SELECT 
        b.id,
        b.name,
        b.email,
        b.phone,
        b.rating,
        b.category_id,
        bc.name as category_name,
        bc.slug as category_slug
      FROM businesses b
      LEFT JOIN business_categories bON b.category_id = bc.id
      ORDER BY bc.name, b.name
    `);

    const businesses = bizRes.rows as any[];

    // Get all categories
    const catRes = await db.execute(
      sql`SELECT id, name, slug FROM business_categories ORDER BY name`
    );
    const categories = catRes.rows as any[];

    // Group by category
     );
    const dbName = (dbRes.rows[0] as anEach((biz) => {
      const cat = biz.category_name || "UNCATEGORIZED";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(biz);
    });

    // Generate report
    let report = `# 📊 Database Integrity Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## 👤 User Info\n`;
    report += `- **Username:** Joe\n`;
    report += `- **Database:** ${dbName}\n`;
        b.na **Tables:** ${tableCount}\n\n`;

    report += `## 📈 Summary\n`;
    report += `- **Total        bc.slug as category_slug}\n`;
    report += `- **Total Categories:** ${categories.length}\n`;
    report += `- **Categories with Businesses:** ${Object.keys(grouped).length}\n\n`;

    report += `## 📂 Businesses by Category\n\n`;

    const sortedCats = Object.keys(grouped).sort();
    sortedCats.forEach((cat) => {
      const bizList = grouped[cat];
      report += `### ${cat}\n`;
      report += `**Count:** ${bizList.length} businesses\n\n`;

      const cat = biz.category_name || "UNCATEGORIZED        if += `${idx + 1}. **${biz.name}**\n`;
        if (biz.email) report += `   - Email: ${biz.email}\n`;
        if (biz.phone) report += `   - Phone: ${biz.phone}\n`;
        if (biz.rating) report += `   - Rating: ⭐ ${biz.rating}/5\n`;
        report += `   - ID: ${biz.id} | Category ID: ${biz.category_id}\n\n`;
      });
      report += `---\n\n`;
    });

    // Checks
    report += `## ⚠️ Data Integrity Checks\n\n`;

    const uncategorized = businesses.filter((b) => !b.category_id);
    if (uncategorized.length > 0) {
      report += `### 🔴 Uncategorized Businesses (${uncategorized.length})\n`;
      uncategorized.forEach((biz) => {
        report += `- ${biz.name} (ID: ${biz.id})\n`;
      });
      report += `\n`;
    } else {
      report += `### ✅ No Uncategorized Businesses\n\n`;
    }

    const emptyCategories = categories.filter(
         report += `**Coun) => biz.category_id === cat.id)
    );
    if (emptyCategories.length > 0) {
      report += `### 🟡 Empty Categories (${emptyCategories.length})\n`;
      emptyCategories.forEach((cat) => {
        report += `- ${cat.name} (ID: ${cat.id})\n`;
      });
      report += `\n`;
    } else {
      report += `### ✅ All Categories Have Businesses\n\n`;
    }

    // Dis      });
      report += `---\n\n`;
    })le\n\n`;
    report += `| Category | Count | % |\n|----------|-------|---|\n`;
    sortedCats.forEach((cat) => {
      const pct = ((grouped[cat].length / businesses.length) * 100).toFixed(1);
      report += `| ${cat} | ${grouped[cat].length} | ${pct}% |\n`;
    });

    report += `\n## 📋 Raw Data\n\n`;
    report += `| ID | Name | Category | Email | Phone | Rating |\n`;
    report += `|----|------|----------|-------|-------|--------|\n`;
    businesses.forEach((biz) => {
      const cat = biz.category_name || "UNCATEGORIZED";
      report += `| ${biz.id} | ${biz.name} | ${cat} | ${biz.email || "-"} | ${biz.phone || "-"} | ${biz.rating || "-"} |\n`;
    });

    fs.writeFileSync(
      "/Users/joe/Downloads/FSA/DATABASE_INTEGRITY_REPORT.md",
      report
    );
    console.log("✅ Report saved!");
    console.log(`📊 ${businesses.length}       reoss ${Object.keys(grouped).length} categories`);

    // Show summary
    console.log("\n📂 Category Distribution:");
    sortedCats.forEach((cat) => {
      console.log(`  ${cat}: ${grouped[cat].length} businesses`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

generateReport();
