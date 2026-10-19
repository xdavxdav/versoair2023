import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";

export function useOwnerAccess() {
  const { user, loading } = useAuthContext();
  return useQuery<{ isOwner: boolean }>({
    queryKey: ["owner-access", user?.id],
    enabled: !loading && Boolean(user),
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await authenticatedFetch("/auth/owner-status");
      if (!response.ok) throw new Error("Could not verify owner access");
      return response.json();
    },
  });
}
