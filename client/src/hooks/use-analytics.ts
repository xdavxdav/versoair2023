import { useQuery } from "@tanstack/react-query";
import type { Analytics, MusicAnalytics } from "@shared/schema";

export function useAnalytics(categorySlug?: string) {
  return useQuery({
    queryKey: ["analytics", "category", categorySlug],
    queryFn: async () => {
      if (!categorySlug) return null;
      const response = await fetch(`/api/analytics/${categorySlug}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json() as Promise<Analytics>;
    },
    enabled: !!categorySlug,
  });
}

export function useBusinessAnalytics(businessId?: number) {
  return useQuery({
    queryKey: ["analytics", "business", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await fetch(`/api/analytics/business/${businessId}`);
      if (!response.ok) throw new Error("Failed to fetch business analytics");
      return response.json() as Promise<Analytics>;
    },
    enabled: !!businessId,
  });
}

export function useMusicAnalytics() {
  return useQuery({
    queryKey: ["analytics", "music"],
    queryFn: async () => {
      const response = await fetch("/api/music/analytics");
      if (!response.ok) throw new Error("Failed to fetch music analytics");
      return response.json() as Promise<MusicAnalytics>;
    },
  });
}

export function useLocationAnalytics() {
  return useQuery({
    queryKey: ["analytics", "location"],
    queryFn: async () => {
      const response = await fetch("/api/location/analytics");
      if (!response.ok) throw new Error("Failed to fetch location analytics");
      return response.json();
    },
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["location", "countries"],
    queryFn: async () => {
      const response = await fetch("/api/countries");
      if (!response.ok) throw new Error("Failed to fetch countries");
      return response.json();
    },
  });
}

export function useRegions(countryId?: number) {
  return useQuery({
    queryKey: ["location", "regions", countryId],
    queryFn: async () => {
      const url = countryId
        ? `/api/regions?countryId=${countryId}`
        : "/api/regions";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch regions");
      return response.json();
    },
    enabled: countryId !== undefined,
  });
}

export function useCities(regionId?: number) {
  return useQuery({
    queryKey: ["location", "cities", regionId],
    queryFn: async () => {
      const url = regionId ? `/api/cities?regionId=${regionId}` : "/api/cities";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch cities");
      return response.json();
    },
    enabled: regionId !== undefined,
  });
}
