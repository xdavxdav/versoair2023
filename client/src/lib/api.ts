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

// Fallback mock data for development/testing
const mockBusinesses: Business[] = [
  {
    id: "1",
    title: "Abidjan Tech Solutions",
    description: "Leading technology solutions provider in Abidjan",
    category: "technology",
    location: "abidjan",
    address: "Plateau, Abidjan",
    phone: "+225 01 23 45 67 89",
    email: "contact@abidjantech.ci",
    rating: 4.8,
    reviews: 124,
    tags: ["IT", "Software", "Consulting"],
    latitude: 5.35995,
    longitude: -4.00824,
  },
  {
    id: "2",
    title: "Cocoa Excellence",
    description:
      "Premium cocoa bean exporter with sustainable farming practices",
    category: "agriculture",
    location: "gagnoa",
    address: "Gagnoa, Gôh-Djiboua",
    phone: "+225 07 89 12 34 56",
    email: "info@cocoaexcellence.ci",
    rating: 4.6,
    reviews: 89,
    tags: ["Agriculture", "Cocoa", "Export"],
    latitude: 6.12974,
    longitude: -5.95071,
  },
  {
    id: "3",
    title: "Hotel Ivoire Excellence",
    description: "Luxury hotel and hospitality services in Yamoussoukro",
    category: "hospitality",
    location: "yamoussoukro",
    address: "Yamoussoukro City Center",
    phone: "+225 05 67 89 12 34",
    email: "reservations@hotelivoire.ci",
    rating: 4.9,
    reviews: 256,
    tags: ["Hotel", "Luxury", "Accommodation"],
    latitude: 6.82762,
    longitude: -5.28934,
  },
];

// Mock search function for fallback
export async function mockSearchBusinesses(
  params: SearchParams,
): Promise<SearchResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  let results = [...mockBusinesses];
  const {
    query = "",
    category = "",
    location = "",
    range = "",
    lat,
    lng,
  } = params;

  // Apply filters
  if (query) {
    const searchTerm = query.toLowerCase().trim();
    results = results.filter(
      (business) =>
        business.title.toLowerCase().startsWith(searchTerm) ||
        business.description.toLowerCase().startsWith(searchTerm) ||
        business.category.toLowerCase().startsWith(searchTerm) ||
        business.tags.some((tag) => tag.toLowerCase().startsWith(searchTerm)),
    );
  }

  if (category)
    results = results.filter(
      (b) => b.category.toLowerCase() === category.toLowerCase(),
    );

  if (location)
    results = results.filter((b) =>
      b.location.toLowerCase().includes(location.toLowerCase()),
    );

  // Calculate distances if coordinates provided
  if (lat && lng) {
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ): number => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    results = results.map((business) => ({
      ...business,
      distance: calculateDistance(
        lat,
        lng,
        business.latitude,
        business.longitude,
      ),
    }));

    // Filter by distance range
    if (range && range !== "any" && range !== "near-me") {
      const maxDistance = parseFloat(range);
      results = results.filter((b) => b.distance && b.distance <= maxDistance);
    }

    // Sort by distance
    results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } else {
    // Sort by rating by default
    results.sort((a, b) => b.rating - a.rating);
  }

  return {
    data: results,
    total: results.length,
    totalInDatabase: mockBusinesses.length,
    success: true,
  };
}
