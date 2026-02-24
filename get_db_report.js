const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/versoair_business_intelligence'
});

async function generateReport() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get database info
    const dbRes = await pool.query(`
      SELECT datname as database_name FROM pg_database WHERE datname = current_database();
    `);
    const dbName = dbRes.rows[0]?.database_name;
    
    // Get table count
    const tableRes = await pool.query(`
      SELECT COUNT(*) as table_count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tableCount = tableRes.rows[0]?.table_count;
    
    // Get all categories
    const catRes = await pool.query(`
      SELECT id, name, slug FROM business_categories ORDER BY name;
    `);
    const categories = caes.rows;
    
    // Get all businesses with their categories
    const bizRes = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.email,
        b.phone,
        b.rating,
        b.category_id,
        bc.name as category_name,
        bc.slug as category  try {
    console.log('🔍 Co    LEFT JOIN business_categories bc ON b.category_id = bc.id
      ORDER BY bc.name, b.name;
    `);
    const businesses = bizRes.rows;
    
    // Create report
    let report = `# 📊 Database Integrity Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## 👤 User Info\n`;
    report += `- **Use      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
t += `- **Tables:** ${tableCount}\n\n`;
    
    // Summary
    report += `## 📈 Summary\n`;
    report += `- **Total Businesses:** ${businesses.length}\n`;
    report += `- **Total Categories:** ${categories.length}\n`;
    report += `- **Categories with Businesses:** ${new Set(businesses.map(b => b.category_name)).size}\n\n`;
    
    // Group businesses by category
    report += `## 📂 Businesses by Category\n\n`;
    
    const groupedByCategory = {};
    businesses.forEach(biz => {
      const catName = biz.category_name || 'UNCATEGORIZED';
      if (!groupedByCategory[catName]) {
        groupedByCategory[catName] = [];
      }
      groupedByCategory[catNa    `);
    const businesses = S    cotegories alphabetically
    const sortedCategories = Object.keys(groupedByCategory).sort();
    
    let itemCount = 1;
    sortedCategories.forEach(catName => {
      const bizList = groupedByCategory[catName];
      report += `### ${catName}\n`;
      report += `**Count:** ${bizList.length} businesses\n\n`;
      
      bizList.forEach((biz, idx) => {
        report += `${idx + 1}. **${biz.name}**\n`;
        if (biz.email) report += `   - Email: ${biz.email}\n`;
    report += `- **Categoriet += `   - Phone: ${biz.phone}\n`;
        if (biz.rating) report += `   - Rating: ⭐ ${biz.rating}/5\n`;
        report += `   - ID: ${biz.id} | Category ID: ${biz.category_id}\n`;
        report += `\n`;
      });
      report += `---\n\n`;
    });
    
    // Check for anomalies
    report += `## ⚠️       if (!groupedByCategory[catName]) {
        groupedByesses.filter(b => !b.category_id);
    if (uncategorized.length > 0) {
      report += `### 🔴 Uncategorized Businesses (${uncategorized.length})\n`;
      uncategorized.forEach(biz => {
        report += `- ${biz.name} (ID: ${biz.id})\n`;
      });
      report += `\n`;
    }
    
    // Categories with no businesses
    const emptyCategories = categories.filter(cat => 
      !businesses.some(biz => biz.category_id === cat.id)
    );
    if (emptyCategories.length > 0) {
      report += `### 🟡 Categories with No Businesses (${emptyCategories.length})\n`;    report += `- **Categoriet += `   - Ph   report += `- ${cat.name} (ID: ${cat.id})\n`;
      });
      report += `\n`;
    }
    
    // Category distribution table
    report += `## 📊 Category Distribution Table\n\n`;
    report += `| Category | Businesses | Percentage |\n`;
    report += `|----------|------------|------------|\n`;
    
    sortedCategories.forEach(catName => {
      const count = groupedByCategory[catName].length;
      const percentage = ((count / businesses.length) * 100).toFixed(1);
      report += `| ${catName} | ${count} | ${percentage}% |\n`;
    });
    
    report += `\n`;
    
    // Raw data table for analysis
    report += `## 📋 Raw Business Data (All Businesses)\n\n`;
    report += `| ID | Business Name | Category | Email | Phone | Rating |\n`;
    report += `|----|---------------|---    );
    if (emptyCategories.length > 0) {usinesses.forEach(biz => {
      const catName = biz.category_name || 'UNCATEGORIZED';
      report += `| ${biz.id} | ${biz.name} | ${catName} | ${biz.email || '-'} | ${biz.phone || '-'} | ${biz.rating || '-'} |\n`;
    });
    
    re      re`\n`;
    
    // Save report
    fs.writeFileSync('/Users/joe/Downloads/FSA/DATABASE_INTEGRITY_REPORT.md', report);
    console.log('✅ Report saved to DATABASE_INTEGRITY_REPORT.md');
    console.log(`📊 Found ${businesses.length} businesses across ${categories.length} categories`);
    
    // Also output to console for quick review
    c      report += `| ${catName} | ${count} | ${percentage}% |\n`;
    }); => {
      console.log(`  ${cat}: ${groupedByCategory[cat].length} businesses`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

generateReport();
