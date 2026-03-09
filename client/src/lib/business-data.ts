/**
 * Unified Business Data Fetching
 * Uses the public /api/businesses endpoint (no auth required)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface Business {
  business_type?: any;
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  rating?: number;
  reviews?: number;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  created_at?: string;
  revenue?: number;
  employees?: number;
  status?: "active" | "inactive" | "popular" | "verified" | "premium";
  countryCode?: string;
  specialization?: string[];
  years_experience?: number;
  distance?: number;
  services?: string[];
  annual_growth?: number;
  certifications?: string[];
  assets_under_management?: number;
  daily_volume?: number;
  is_verified?: boolean;
  verified_at?: string;
}

export interface BusinessResponse {
  data: Business[];
  total: number;
  success: boolean;
  message?: string;
}

/**
 * Normalize a raw DB row into a Business object
 */
function normalizeRow(row: any): Business {
  return {
    id: row.id?.toString() || "",
    title: row.name || row.title || "",
    description: row.description || "",
    category: row.category_name || row.category || "",
    location: row.location || row.city_name || "",
    address: row.address || "",
    phone: row.phone || "",
    email: row.email || "",
    rating: parseFloat(row.rating) || undefined,
    reviews: parseInt(row.reviews) || undefined,
    tags:
      typeof row.tags === "string"
        ? JSON.parse(row.tags || "[]")
        : row.tags || [],
    latitude: parseFloat(row.latitude) || undefined,
    longitude: parseFloat(row.longitude) || undefined,
    created_at: row.created_at,
    revenue: row.revenue ? parseFloat(row.revenue) : undefined,
    employees: row.employees ? parseInt(row.employees) : undefined,
    status: row.is_active === false ? "inactive" : "active",
    countryCode: row.country_code || undefined,
    is_verified:
      row.is_verified === true ||
      row.is_verified === "true" ||
      row.isVerified === true,
    verified_at: row.verified_at || undefined,
  };
}

/**
 * Fetch ALL businesses from database (public endpoint, no auth needed)
 */
export async function fetchAllBusinesses(
  limit: number = 1000,
): Promise<Business[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/businesses?limit=${limit}&sortBy=rating&order=DESC`,
    );

    if (!response.ok) {
      console.error(`[fetchAllBusinesses] API error: ${response.status}`);
      return [];
    }

    const json = await response.json();
    const rows = Array.isArray(json) ? json : json.data || [];
    return rows.map(normalizeRow);
  } catch (error) {
    console.error("[fetchAllBusinesses] Error:", error);
    return [];
  }
}

/**
 * Fetch businesses by category
 */
export async function fetchBusinessesByCategory(
  category: string,
  limit: number = 100,
): Promise<Business[]> {
  try {
    const all = await fetchAllBusinesses(limit);
    if (!category) return all;
    return all.filter((biz) =>
      biz.category?.toLowerCase().includes(category.toLowerCase()),
    );
  } catch (error) {
    console.error(`[fetchBusinessesByCategory] Error:`, error);
    return [];
  }
}

/**
 * Search businesses with multiple criteria
 * Both search (name) and location are handled server-side via
 * the /api/businesses endpoint with exact character matching (ILIKE).
 */
export async function searchBusinesses(params: {
  query?: string;
  category?: string;
  sectorId?: number;
  categoryId?: number;
  categoryIds?: number[];
  location?: string;
  status?: string;
  countryCode?: string;
  limit?: number;
  page?: number;
}): Promise<Business[]> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("limit", String(params.limit || 50));
    if (params.page) queryParams.append("page", String(params.page));
    if (params.query) queryParams.append("search", params.query);
    if (params.location) queryParams.append("location", params.location);
    if (params.countryCode)
      queryParams.append("countryCode", params.countryCode);

    // Priority: categoryIds > categoryId > sectorId > category text fallback
    if (params.categoryIds && params.categoryIds.length > 0) {
      queryParams.append("categoryIds", params.categoryIds.join(","));
    } else if (params.categoryId) {
      queryParams.append("categoryId", String(params.categoryId));
    } else if (params.sectorId) {
      queryParams.append("sectorId", String(params.sectorId));
    } else if (params.category) {
      // category is a text name (e.g. "IT Services"); use it as a text search
      // since the API categoryId expects a numeric ID, not a name
      if (!params.query) {
        queryParams.append("search", params.category);
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/api/businesses?${queryParams.toString()}`,
    );
    if (!response.ok) {
      console.error(`[searchBusinesses] API error: ${response.status}`);
      return [];
    }

    const json = await response.json();
    const rows: any[] = Array.isArray(json) ? json : json.data || [];
    let results = rows.map(normalizeRow);

    // Client-side status filter (not supported server-side)
    if (params.status) {
      results = results.filter((biz) => biz.status === params.status);
    }

    return results;
  } catch (error) {
    console.error("[searchBusinesses] Error:", error);
    return [];
  }
}

/**
 * Get health status of API
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true || data.status === "ok";
  } catch (error) {
    console.error("[checkDatabaseConnection] Error:", error);
    return false;
  }
}

/**
 * Get count of businesses by category
 */
export async function getBusinessCountByCategory(
  category: string,
): Promise<number> {
  try {
    const businesses = await fetchBusinessesByCategory(category);
    return businesses.length;
  } catch (error) {
    console.error(`[getBusinessCountByCategory] Error:`, error);
    return 0;
  }
}

/**
 * Get all unique categories from businesses
 */
export async function getAvailableCategories(): Promise<string[]> {
  try {
    const businesses = await fetchAllBusinesses();
    const categories = new Set(
      businesses.map((b) => b.category).filter(Boolean),
    );
    return Array.from(categories).sort();
  } catch (error) {
    console.error("[getAvailableCategories] Error:", error);
    return [];
  }
}

/**
 * Get businesses for home page (featured/top)
 */
export async function getFeaturedBusinesses(
  limit: number = 12,
): Promise<Business[]> {
  try {
    const businesses = await fetchAllBusinesses(limit);
    return businesses
      .sort((a, b) => {
        if ((b.rating || 0) !== (a.rating || 0))
          return (b.rating || 0) - (a.rating || 0);
        if ((b.reviews || 0) !== (a.reviews || 0))
          return (b.reviews || 0) - (a.reviews || 0);
        return (a.title || "").localeCompare(b.title || "");
      })
      .slice(0, limit);
  } catch (error) {
    console.error("[getFeaturedBusinesses] Error:", error);
    return [];
  }
}
