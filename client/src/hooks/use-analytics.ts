import { useQuery } from "@tanstack/react-query";

export function useAnalytics(category?: string) {
  return useQuery({
    queryKey: ['/api/analytics', category].filter(Boolean),
    enabled: !!category,
  });
}

export function useBusinessAnalytics(businessId?: number) {
  return useQuery({
    queryKey: ['/api/analytics/business', businessId],
    enabled: !!businessId,
  });
}

export function useMusicAnalytics() {
  return useQuery({
    queryKey: ['/api/music/analytics'],
  });
}

export function useLocationAnalytics() {
  return useQuery({
    queryKey: ['/api/location/analytics'],
  });
}
