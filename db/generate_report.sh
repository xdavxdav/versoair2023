#!/usr/bin/env bash
OUT=db/VAO_report.txt
DB_HOST=localhost
DB_PORT=5432
DB_USER=versoair
DB_NAME=versoair_business_intelligence
export PGPASSWORD=versoair2025

echo "VAO Database Report - $(date)" > "$OUT"
# shellcheck disable=SC2129
echo "" >> "$OUT"
echo "Counts:" >> "$OUT"
echo -n "businesses: " >> "$OUT"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT count(*) FROM businesses;" >> "$OUT"
echo -n "categories: " >> "$OUT"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT count(*) FROM categories;" >> "$OUT"
echo -n "business_category_links: " >> "$OUT"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT count(*) FROM business_category_links;" >> "$OUT"

echo "" >> "$OUT"
echo "Top businesses with linked categories (up to 200):" >> "$OUT"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F ' | ' -A -c "SELECT b.id, b.name, b.address, COALESCE(string_agg(c.name, ', '), '') AS categories FROM business_category_links l JOIN businesses b ON b.id = l.business_id JOIN categories c ON c.id = l.category_id GROUP BY b.id,b.name,b.address ORDER BY b.id LIMIT 200;" >> "$OUT"

echo "" >> "$OUT"
echo "Source table counts:" >> "$OUT"
for t in automobile_businesses finance_businesses healthcare_businesses restaurants_businesses retail_businesses technology_businesses hotels_businesses hotellerie_businesses commerce_businesses divertissement_businesses batiment_businesses; do
  echo -n "$t: " >> "$OUT"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT count(*) FROM \"$t\";" >> "$OUT"
done

echo "" >> "$OUT"
echo "Report saved to $OUT"
