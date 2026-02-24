import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Reservation, InsertReservation } from "@shared/schema";

// GET all reservations
export function useReservations() {
  return useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const response = await fetch("/api/reservations");
      if (!response.ok) throw new Error("Failed to fetch reservations");
      return response.json() as Promise<Reservation[]>;
    },
  });
}

// CREATE new reservation
export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationData: InsertReservation) => {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });
      if (!response.ok) throw new Error("Failed to create reservation");
      return response.json() as Promise<Reservation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}
