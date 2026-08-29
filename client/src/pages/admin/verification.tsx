import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, MapPin, Users, Bed, Bath, Check, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: number;
  name: string;
  description?: string;
  image?: string;
  type?: string;
  category?: string;
  location?: string;
  city?: string;
  price?: number;
  rating?: number;
  reviews?: number;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
  verified?: boolean;
}

export default function VerificationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch pending properties
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: Property[];
    count: number;
  }>({
    queryKey: ["pending-properties"],
    queryFn: async () => {
      const response = await authenticatedFetch(
        "/api/admin/verification/pending",
      );
      if (!response.ok) throw new Error("Failed to fetch pending properties");
      return response.json();
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await authenticatedFetch(
        `/api/admin/verification/${propertyId}/verify`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to verify property");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `"${data.data.name}" has been verified`,
      });
      queryClient.invalidateQueries({ queryKey: ["pending-properties"] });
      setDetailsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify property",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await fetch(
        `/api/admin/verification/${propertyId}/reject`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to reject property");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rejected",
        description: `"${data.data.name}" has been rejected`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-properties"] });
      setDetailsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    },
  });

  const pendingCount = data?.count || 0;

  return (
    <div className="min-h-screen bg-[#f3efe9] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">
            Business Verification
          </h1>
          <p className="text-slate-600">
            Review and approve new property listings
          </p>
        </div>

        {/* Stats Card */}
        <Card className="mb-6 border border-amber-200 bg-amber-50/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">
              {pendingCount} Pending Review
            </CardTitle>
            <CardDescription className="text-slate-600">
              {pendingCount === 0
                ? "All properties have been verified!"
                : `${pendingCount} ${pendingCount === 1 ? "property" : "properties"} waiting for approval`}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Properties Table */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Pending Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">
                Loading pending properties...
              </div>
            ) : !data?.data?.length ? (
              <div className="py-8 text-center text-slate-500">
                <p>No pending properties for review</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-slate-700">Property</TableHead>
                      <TableHead className="text-slate-700">Location</TableHead>
                      <TableHead className="text-slate-700">Type</TableHead>
                      <TableHead className="text-slate-700">Price</TableHead>
                      <TableHead className="text-slate-700">Rating</TableHead>
                      <TableHead className="text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.map((property) => (
                      <TableRow
                        key={property.id}
                        className="transition hover:bg-slate-50"
                      >
                        <TableCell className="font-medium">
                          {property.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-4 w-4" />
                            {property.city || property.location || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{property.type}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${property.price}/night
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {property.rating && (
                              <>
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{property.rating}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProperty(property);
                                setDetailsOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => verifyMutation.mutate(property.id)}
                              disabled={verifyMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectMutation.mutate(property.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.name}</DialogTitle>
            <DialogDescription>
              Review property details before approving
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              {selectedProperty.image && (
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold">{selectedProperty.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-semibold">{selectedProperty.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-semibold">{selectedProperty.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-semibold">
                    ${selectedProperty.price}/night
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bedrooms</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {selectedProperty.bedrooms}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bathrooms</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {selectedProperty.bathrooms}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Guests</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Up to {selectedProperty.guests}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {selectedProperty.rating} ({selectedProperty.reviews}{" "}
                    reviews)
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedProperty.description}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(false)}
              disabled={verifyMutation.isPending || rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedProperty) {
                  rejectMutation.mutate(selectedProperty.id);
                }
              }}
              disabled={verifyMutation.isPending || rejectMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedProperty) {
                  verifyMutation.mutate(selectedProperty.id);
                }
              }}
              disabled={verifyMutation.isPending || rejectMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
