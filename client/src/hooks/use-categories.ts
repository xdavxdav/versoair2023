import { useQuery } from "@tanstack/react-query";
import type { BusinessCategory } from "@shared/schema";

// GET all business categories
export function useBusinessCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<BusinessCategory[]>;
    },
  });
}

// GET single category by slug
export function useBusinessCategory(slug: string) {
  return useQuery({
    queryKey: ["categories", slug],
    queryFn: async () => {
      const response = await fetch(`/api/categories/${slug}`);
      if (!response.ok) throw new Error("Failed to fetch category");
      return response.json() as Promise<BusinessCategory>;
    },
    enabled: !!slug,
  });
}
// dropdb -U joe versoair_business_intelligence && createdb -U joe versoair_business_intelligence && psql -U joe -d versoair_business_intelligence -f ./setup-tables.sql
