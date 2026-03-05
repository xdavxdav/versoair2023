import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { parseMentions, extractBusinessMentions } from "@/lib/mentions-parser";

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
  createdAt?: string;
  updatedAt?: string;
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
  data: Business[];
  total: number;
  totalInDatabase: number;
  success: boolean;
  page?: number;
  totalPages?: number;
}

// Search businesses
export async function searchBusinesses(
  params: SearchParams,
): Promise<SearchResponse> {
  const response = await apiRequest(
    "GET",
    `/api/v1/admin/businesses?limit=1000`,
  );

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
      b.category?.toLowerCase().startsWith(category),
    );
  }

  if (params.location) {
    const location = params.location.toLowerCase();
    filtered = filtered.filter(
      (b: any) =>
        b.address?.toLowerCase().startsWith(location) ||
        b.location?.toLowerCase().startsWith(location),
    );
  }

  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    success: true,
    data: paged,
    total: filtered.length,
    totalInDatabase: allData.length,
    page,
    totalPages: Math.ceil(filtered.length / limit),
  };
}

// Get business by ID
export async function getBusinessById(id: string): Promise<Business> {
  const response = await apiRequest("GET", `/api/business/${id}`);
  return await response.json();
}

// Create business
export async function createBusiness(
  data: Partial<Business>,
): Promise<Business> {
  const response = await apiRequest("POST", "/api/business", data);
  return await response.json();
}

// Update business
export async function updateBusiness(
  id: string,
  data: Partial<Business>,
): Promise<Business> {
  const response = await apiRequest("PUT", `/api/business/${id}`, data);
  return await response.json();
}

// Delete business
export async function deleteBusiness(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/business/${id}`);
}

// Get business statistics
export async function getBusinessStats() {
  const response = await apiRequest("GET", "/api/business/stats");
  return await response.json();
}

// Get mention suggestions from business
export async function getBusinessMentions(
  business: Business,
): Promise<string[]> {
  if (!business.description) return [];
  const parsed = parseMentions(business.description);
  return parsed.mentions;
}

// Get businesses mentioned in text
export async function getBusinessesFromMentions(
  text: string,
): Promise<Business[]> {
  const parsed = parseMentions(text);
  if (parsed.mentions.length === 0) return [];

  const response = await apiRequest(
    "GET",
    `/api/v1/admin/businesses?limit=1000`,
  );

  const responseData = await response.json();
  let allData = Array.isArray(responseData)
    ? responseData
    : responseData.data || [];

  const mentionedBusinesses = allData.filter((b: any) =>
    parsed.mentions.some(
      (mention) =>
        b.name?.toLowerCase() === mention.toLowerCase() ||
        b.title?.toLowerCase() === mention.toLowerCase(),
    ),
  );

  return mentionedBusinesses;
}

// Query keys for React Query
export const businessKeys = {
  all: ["businesses"] as const,
  lists: () => [...businessKeys.all, "list"] as const,
  list: (filters: SearchParams) => [...businessKeys.lists(), filters] as const,
  details: () => [...businessKeys.all, "detail"] as const,
  detail: (id: string) => [...businessKeys.details(), id] as const,
  stats: () => [...businessKeys.all, "stats"] as const,
  search: (params: SearchParams) =>
    [...businessKeys.all, "search", params] as const,
};
