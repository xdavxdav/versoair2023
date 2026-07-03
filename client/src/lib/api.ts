const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Business {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviews: number;
  tags: string[];
  latitude: number;
  longitude: number;
  distance?: number;
  created_at?: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  location?: string;
  range?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  data: Business[];
  total: number;
  totalInDatabase: number;
  query?: string;
  availableColumns?: string[];
  error?: string;
  details?: string;
}

// Main search function
export async function searchBusinesses(
  params: SearchParams,
): Promise<SearchResponse> {
  try {
    // Fetch all businesses from correct endpoint
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/businesses?limit=1000`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    let allData = Array.isArray(responseData)
      ? responseData
      : responseData.data || [];

    // Client-side filtering
    let filtered = allData;

    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(
        (b: any) =>
          b.title?.toLowerCase().startsWith(query) ||
          b.description?.toLowerCase().startsWith(query) ||
          b.email?.toLowerCase().startsWith(query) ||
          b.phone?.toLowerCase().startsWith(query) ||
          b.tags?.some((tag: string) => tag.toLowerCase().startsWith(query)),
      );
    }

    if (params.category) {
      const category = params.category.toLowerCase();
      filtered = filtered.filter((b: any) =>
        b.category?.toLowerCase().includes(category),
      );
    }

    if (params.location) {
      const location = params.location.toLowerCase();
      filtered = filtered.filter(
        (b: any) =>
          b.address?.toLowerCase().includes(location) ||
          b.location?.toLowerCase().includes(location),
      );
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    // Convert string arrays if needed and ensure proper typing
    const data = {
      data: paged.map((business: any) => ({
        ...business,
        id: business.id?.toString() || "",
        title: business.title || "",
        description: business.description || "",
        category: business.category || "",
        location: business.location || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        rating:
          typeof business.rating === "number"
            ? business.rating
            : parseFloat(business.rating) || 0,
        reviews:
          typeof business.reviews === "number"
            ? business.reviews
            : parseInt(business.reviews) || 0,
        tags: Array.isArray(business.tags)
          ? business.tags
          : typeof business.tags === "string"
            ? business.tags.split(",").map((t: string) => t.trim())
            : [],
        latitude:
          typeof business.latitude === "number"
            ? business.latitude
            : parseFloat(business.latitude) || 0,
        longitude:
          typeof business.longitude === "number"
            ? business.longitude
            : parseFloat(business.longitude) || 0,
        distance: business.distance ? parseFloat(business.distance) : undefined,
        created_at: business.created_at || new Date().toISOString(),
      })),
      total: filtered.length,
      totalInDatabase: allData.length,
      success: true,
    };

    return data;
  } catch (error: any) {
    console.error("API call failed:", error);
    return {
      success: false,
      data: [],
      total: 0,
      totalInDatabase: 0,
      error: "Failed to fetch data from server",
      details: error.message,
    };
  }
}

// Get categories from database
export async function getCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/business/categories`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

// Get locations from database
export async function getLocations(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/business/locations`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.locations || [];
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return [];
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  database?: {
    connected: boolean;
    database?: string;
    time?: string;
    error?: string;
  };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return {
      success: data.database?.connected === true,
      database: data.database,
    };
  } catch (error: any) {
    console.error("Database connection test failed:", error);
    return {
      success: false,
      database: { connected: false, error: error.message },
    };
  }
}

// Debug: Get businesses table structure
export async function debugBusinessesStructure(): Promise<{
  success: boolean;
  tableStructure?: any[];
  sampleData?: any[];
  rowCount?: number;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/debug/businesses-structure`,
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Debug failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Simple health check
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  database?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Health check failed:", error);
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    };
  }
}
