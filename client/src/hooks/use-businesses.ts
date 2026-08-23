import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  businessKeys,
  searchBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getBusinessStats,
  Business,
  SearchParams,
  SearchResponse,
} from "@/pages/services/businessServices";

// Search businesses hook
export function useSearchBusinesses(
  params: SearchParams,
  options?: UseQueryOptions<SearchResponse>,
) {
  return useQuery<SearchResponse>({
    queryKey: businessKeys.search(params),
    queryFn: () => searchBusinesses(params),
    enabled:
      !!params.query ||
      !!params.category ||
      !!params.location ||
      !!params.lat ||
      !!params.lng ||
      Object.keys(params).length > 0,
    ...options,
  });
}

// Get business by ID hook
export function useBusiness(id: string, options?: UseQueryOptions<Business>) {
  return useQuery<Business>({
    queryKey: businessKeys.detail(id),
    queryFn: () => getBusinessById(id),
    enabled: !!id,
    ...options,
  });
}

// Get all businesses hook
export function useBusinesses(
  filters: Partial<SearchParams> = {},
  options?: UseQueryOptions<SearchResponse>,
) {
  return useQuery<SearchResponse>({
    queryKey: businessKeys.list(filters),
    queryFn: () => searchBusinesses({ ...filters, limit: 100 }), // Adjust limit as needed
    ...options,
  });
}

// Get business statistics hook
export function useBusinessStats(options?: UseQueryOptions<any>) {
  return useQuery({
    queryKey: businessKeys.stats(),
    queryFn: getBusinessStats,
    ...options,
  });
}

// Create business mutation
export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation<Business, Error, Partial<Business>>({
    mutationFn: createBusiness,
    onSuccess: (newBusiness) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessKeys.stats() });

      // Update cache for the new business
      queryClient.setQueryData(
        businessKeys.detail(newBusiness.id),
        newBusiness,
      );
    },
  });
}

// Update business mutation
export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation<Business, Error, { id: string; data: Partial<Business> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Business> }) =>
      updateBusiness(id, data),
    onSuccess: (updatedBusiness) => {
      // Update specific business cache
      queryClient.setQueryData(
        businessKeys.detail(updatedBusiness.id),
        updatedBusiness,
      );

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
    },
  });
}

// Delete business mutation
export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBusiness,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: businessKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessKeys.stats() });
    },
  });
}
