import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Image,
  Video,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Listing {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  status: string;
  images: string[];
  videos: string[];
  owner_name: string;
  owner_email: string;
  is_premium: boolean;
  created_at: string;
}

export function MarketplaceModeration() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    listing: Listing;
    action: "approve" | "reject";
  } | null>(null);

  // Fetch listings
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["marketplace-listings", statusFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/marketing/journal/listings?status=${statusFilter}&limit=50`,
      );
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Approve/Reject mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "active" | "rejected";
    }) => {
      const res = await authenticatedFetch(
        `/api/marketing/journal/listings/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      setActionDialog(null);
    },
  });

  const listings: Listing[] = data?.data || [];
  const pendingCount = listings.length;

  const handleAction = (listing: Listing, action: "approve" | "reject") => {
    setActionDialog({ listing, action });
  };

  const confirmAction = () => {
    if (!actionDialog) return;
    statusMutation.mutate({
      id: actionDialog.listing.id,
      status: actionDialog.action === "approve" ? "active" : "rejected",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const hours = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60),
    );
    if (hours < 1) return "< 1 hour ago";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                Marketplace Moderation
              </CardTitle>
              <CardDescription>
                Review and approve marketplace listings. Pending items
                auto-approve after 24 hours.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {statusFilter === "pending" ? pendingCount : "—"}
              </div>
              <div className="text-sm text-amber-700">Pending Review</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                <CheckCircle className="h-6 w-6 mx-auto" />
              </div>
              <div className="text-sm text-emerald-700">Auto-approve: 24h</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {listings.filter((l) => l.is_premium).length}
              </div>
              <div className="text-sm text-blue-700">Premium Listings</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {listings.filter((l) => l.images?.length > 0).length}
              </div>
              <div className="text-sm text-purple-700">With Media</div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="active">✅ Active</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
                <SelectItem value="expired">📅 Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Failed to load listings. Please try again.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && listings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No {statusFilter} listings found.</p>
            </div>
          )}

          {/* Listings grid */}
          {!isLoading && listings.length > 0 && (
            <div className="grid gap-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Thumbnail + Info */}
                    <div className="flex gap-4 flex-1">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="h-8 w-8 text-gray-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">
                            {listing.title}
                          </h4>
                          {listing.is_premium && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {listing.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{listing.category}</span>
                          <span>${listing.price?.toFixed(2) || "0.00"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(listing.created_at)}
                          </span>
                          {listing.images?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {listing.images.length}
                            </span>
                          )}
                          {listing.videos?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {listing.videos.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          By:{" "}
                          {listing.owner_name ||
                            listing.owner_email ||
                            "Unknown"}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewListing(listing)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {statusFilter === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAction(listing, "approve")}
                            disabled={statusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(listing, "reject")}
                            disabled={statusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewListing}
        onOpenChange={() => setPreviewListing(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewListing?.title}</DialogTitle>
            <DialogDescription>
              Listing #{previewListing?.id} • {previewListing?.category}
            </DialogDescription>
          </DialogHeader>
          {previewListing && (
            <div className="space-y-4">
              {/* Images */}
              {previewListing.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previewListing.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="rounded-lg object-cover aspect-square"
                    />
                  ))}
                </div>
              )}
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-gray-600">
                  {previewListing.description || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Price:</span>{" "}
                  <strong>${previewListing.price?.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <Badge
                    variant={
                      previewListing.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {previewListing.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Owner:</span>{" "}
                  {previewListing.owner_name || previewListing.owner_email}
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>{" "}
                  {formatDate(previewListing.created_at)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewListing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approve"
                ? "Approve Listing"
                : "Reject Listing"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === "approve"
                ? `This will make "${actionDialog?.listing.title}" visible to all users.`
                : `This will reject "${actionDialog?.listing.title}" and notify the owner.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={statusMutation.isPending}
              className={
                actionDialog?.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {statusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionDialog?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
