#!/bin/bash

# ============================================================================
# VERSO AIR BUSINESSES SYSTEM - SETUP SCRIPT
# ============================================================================
# This script sets up the complete businesses management system
# Run this ONCE after pulling the new code

set -e

echo "🚀 [SETUP] Starting Verso Air Businesses System Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_USER="${DB_USER:-versoair}"
DB_NAME="${DB_NAME:-versoair_business_intelligence}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST:$DB_PORT"
echo ""

# Step 1: Check PostgreSQL connection
echo -e "${YELLOW}[STEP 1]${NC} Checking PostgreSQL connection..."
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} PostgreSQL connection successful"
else
    echo -e "${RED}❌${NC} PostgreSQL connection failed"
    echo "   Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi
echo ""

# Step 2: Expand database schema
echo -e "${YELLOW}[STEP 2]${NC} Expanding database schema..."
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f scripts/expand_businesses_schema.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Schema expansion completed"
else
    echo -e "${RED}❌${NC} Schema expansion failed"
    echo "   Check scripts/expand_businesses_schema.sql for errors"
    exit 1
fi
echo ""

# Step 3: Seed business data
echo -e "${YELLOW}[STEP 3]${NC} Seeding business data..."
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f scripts/seed_comprehensive_businesses.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Business data seeded successfully"
else
    echo -e "${RED}❌${NC} Business data seeding failed"
    echo "   Check scripts/seed_comprehensive_businesses.sql for errors"
    exit 1
fi
echo ""

# Step 4: Verify data
echo -e "${YELLOW}[STEP 4]${NC} Verifying data..."
COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -t -c "SELECT COUNT(*) FROM businesses;")
echo -e "${GREEN}✅${NC} Found $COUNT businesses in database"
echo ""

# Step 5: Display summary
echo "============================================================================"
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "============================================================================"
echo ""
echo "📊 Database Statistics:"
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" <<EOF
SELECT 
  COUNT(*) as total_businesses,
  COUNT(DISTINCT category_id) as categories,
  ROUND(AVG(rating)::numeric, 2) as avg_rating,
  COUNT(CASE WHEN is_active THEN 1 END) as active
FROM businesses;
EOF

echo ""
echo "🚀 Next Steps:"
echo "   1. Start the dev server: npm run dev"
echo "   2. Navigate to: http://localhost:5003/countries"
echo "   3. Click on the 'Businesses' tab"
echo "   4. Start managing your businesses!"
echo ""
echo "📚 For more information, see BUSINESSES_MANAGEMENT_GUIDE.md"
echo ""
