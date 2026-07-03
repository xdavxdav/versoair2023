import { pool } from "../db";

export interface CategoryValidationResult {
  isValid: boolean;
  categoryId: number;
  categoryName: string;
  warnings: string[];
  errors: string[];
}

/**
 * Comprehensive category validation
 * Checks if a business can be assigned to a category
 */
export async function validateBusinessCategory(businessData: {
  id?: number;
  name: string;
  description: string;
  category_id: number;
}): Promise<CategoryValidationResult> {
  const result: CategoryValidationResult = {
    isValid: true,
    categoryId: businessData.category_id,
    categoryName: "",
    warnings: [],
    errors: [],
  };

  // 1. Check category exists
  const categoryResult = await pool.query(
    "SELECT id, name, slug, is_active FROM business_categories WHERE id = $1 LIMIT 1",
    [businessData.category_id],
  );

  if (categoryResult.rows.length === 0) {
    result.isValid = false;
    result.errors.push(
      `Category ID ${businessData.category_id} does not exist`,
    );
    return result;
  }

  const category = categoryResult.rows[0];
  result.categoryName = category.name;

  // 2. Validate category is active
  if (category.is_active === false) {
    result.isValid = false;
    result.errors.push(`Category "${result.categoryName}" is inactive`);
    return result;
  }

  // 3. Check for description-category mismatch
  const mismatchCheck = checkDescriptionCategoryMatch(
    businessData.description,
    result.categoryName,
  );

  if (mismatchCheck.isSuspicious) {
    result.warnings.push(
      `⚠️ Business description may not match category "${result.categoryName}"`,
    );
    result.warnings.push(
      `Expected keywords: ${mismatchCheck.expectedKeywords.join(", ")}`,
    );
  }

  // 4. Check for duplicate names in same category
  const duplicateResult = await pool.query(
    `SELECT id FROM businesses 
     WHERE category_id = $1 
     AND LOWER(name) = LOWER($2)
     ${businessData.id ? `AND id != $3` : ""}`,
    businessData.id
      ? [businessData.category_id, businessData.name, businessData.id]
      : [businessData.category_id, businessData.name],
  );

  if (duplicateResult.rows.length > 0) {
    result.warnings.push(
      `⚠️ Business with same name already exists in this category`,
    );
  }

  return result;
}

/**
 * Check if business description matches its category
 */
export function checkDescriptionCategoryMatch(
  description: string,
  categoryName: string,
): { isSuspicious: boolean; expectedKeywords: string[] } {
  const desc = description.toLowerCase();
  const cat = categoryName.toLowerCase();

  // Define category-to-keywords mapping
  const categoryKeywords: Record<string, string[]> = {
    plumb: ["plumb", "water", "pipe", "drain", "faucet", "sewer"],
    electric: ["electric", "electrician", "wiring", "circuit", "power"],
    telecom: ["telecom", "phone", "mobile", "voip", "call", "communication"],
    beauty: ["beauty", "salon", "hair", "cosmetic", "aesthetic", "styling"],
    health: ["health", "hospital", "clinic", "doctor", "medical", "nursing"],
    restaurant: ["restaurant", "food", "dining", "cuisine", "meal", "chef"],
    "real estate": ["property", "real estate", "house", "apartment", "rent"],
    retail: ["shop", "store", "retail", "sale", "purchase", "commercial"],
    cloud: ["cloud", "hosting", "server", "data", "infrastructure"],
    fitness: ["gym", "fitness", "exercise", "training", "sports", "workout"],
    school: ["school", "education", "student", "teacher", "learning"],
    "it & internet": ["software", "it", "computer", "tech", "dev", "coding"],
  };

  // Find matching category keywords
  let matchedKeywords: string[] = [];
  for (const [categoryKey, keywords] of Object.entries(categoryKeywords)) {
    if (cat.includes(categoryKey)) {
      matchedKeywords = keywords;
      break;
    }
  }

  // If no keywords defined for category, assume valid
  if (matchedKeywords.length === 0) {
    return { isSuspicious: false, expectedKeywords: [] };
  }

  // Check if description contains any expected keywords
  const hasMatch = matchedKeywords.some((kw) => desc.includes(kw));

  return {
    isSuspicious: !hasMatch,
    expectedKeywords: matchedKeywords,
  };
}

/**
 * Get all categories that match the business description
 * Useful for suggesting categories
 */
export async function suggestCategoriesForBusiness(
  description: string,
  limit: number = 5,
): Promise<
  Array<{ id: number; name: string; slug: string; match_score: number }>
> {
  try {
    const categories = await pool.query(
      "SELECT id, name, slug FROM business_categories WHERE is_active = true ORDER BY name",
    );

    const withScores = categories.rows.map((cat) => {
      const match = checkDescriptionCategoryMatch(description, cat.name);
      const match_score = match.isSuspicious ? 0 : 100;
      return { ...cat, match_score };
    });

    return withScores
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);
  } catch (error) {
    console.error("Error suggesting categories:", error);
    return [];
  }
}
