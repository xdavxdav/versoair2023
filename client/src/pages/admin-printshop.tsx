import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  Package,
  Clock,
  CheckCircle,
  ArrowRight,
  Truck,
  Eye,
  BarChart3,
  Newspaper,
  Mail,
  DollarSign,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminPrintshop() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("authToken");

  // Analytics
  const { data: analytics } = useQuery({
    queryKey: ["marketing", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  // Print queue
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ["marketing", "printshop", "queue"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/printshop/queue", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  // Orders
  const { data: orders } = useQuery({
    queryKey: ["marketing", "orders", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/orders?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!token,
  });

  // Pending journal listings
  const { data: pendingListings } = useQuery({
    queryKey: ["marketing", "journal", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/journal/listings?status=pending");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Update job status
  const updateJobMutation = useMutation({
    mutationFn: async ({
      jobId,
      status,
      tracking_number,
    }: {
      jobId: number;
      status: string;
      tracking_number?: string;
    }) => {
      const res = await fetch(`/api/marketing/print/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, tracking_number }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing", "printshop"] });
      toast({ title: "Job status updated" });
    },
  });

  // Approve/reject listing
  const updateListingMutation = useMutation({
    mutationFn: async ({
      listingId,
      status,
    }: {
      listingId: number;
      status: string;
    }) => {
      const res = await fetch(
        `/api/marketing/journal/listings/${listingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing", "journal"] });
      toast({ title: "Listing updated" });
    },
  });

  const statusSteps = [
    "pending",
    "approved",
    "in_production",
    "printing",
    "quality_check",
    "shipped",
    "completed",
  ];

  const getNextStatus = (current: string) => {
    const idx = statusSteps.indexOf(current);
    return idx >= 0 && idx < statusSteps.length - 1
      ? statusSteps[idx + 1]
      : null;
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-blue-500/20 text-blue-400",
    in_production: "bg-purple-500/20 text-purple-400",
    printing: "bg-indigo-500/20 text-indigo-400",
    quality_check: "bg-cyan-500/20 text-cyan-400",
    shipped: "bg-green-500/20 text-green-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
    paid: "bg-blue-500/20 text-blue-400",
    processing: "bg-purple-500/20 text-purple-400",
    refunded: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-[95vw] mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Printer className="h-8 w-8 text-amber-400" />
          Marketing Admin — Printshop Dashboard
        </h1>
        <p className="text-gray-400 mb-8">
          Manage print jobs, orders, journal listings, and marketing analytics
        </p>

        {/* Analytics KPIs */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Active Listings",
                value: analytics.journal?.active_listings || 0,
                icon: Newspaper,
                color: "text-blue-400",
              },
              {
                label: "Total Orders",
                value: analytics.orders?.total || 0,
                icon: Package,
                color: "text-amber-400",
              },
              {
                label: "Revenue",
                value: `$${((analytics.orders?.revenue_cents || 0) / 100).toFixed(0)}`,
                icon: DollarSign,
                color: "text-green-400",
              },
              {
                label: "Subscribers",
                value: analytics.newsletters?.total_subscribers || 0,
                icon: Users,
                color: "text-purple-400",
              },
            ].map((kpi) => (
              <Card key={kpi.label} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                    <div>
                      <p className="text-gray-400 text-xs">{kpi.label}</p>
                      <p className="text-white text-2xl font-bold">
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Print Queue */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-amber-400" />
                  Print Queue ({queueData?.total_active || 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : !queueData?.queue?.length ? (
                <p className="text-gray-500 text-center py-6">
                  No active print jobs
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {queueData.queue.map((job: any) => {
                    const nextStatus = getNextStatus(job.status);
                    return (
                      <div
                        key={job.id}
                        className="p-3 bg-gray-900/50 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-white text-sm font-medium">
                              #{job.id} —{" "}
                              {job.file_name || job.product_name || "Unknown"}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {job.user_name} • {job.user_email}
                            </p>
                          </div>
                          <Badge
                            className={
                              statusColors[job.status] || "bg-gray-500/20"
                            }
                          >
                            {job.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {nextStatus && (
                          <Button
                            size="sm"
                            className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 w-full"
                            onClick={() =>
                              updateJobMutation.mutate({
                                jobId: job.id,
                                status: nextStatus,
                              })
                            }
                            disabled={updateJobMutation.isPending}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Move to: {nextStatus.replace(/_/g, " ")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Journal Listings */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-blue-400" />
                Pending Listings ({pendingListings?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingListings?.length ? (
                <p className="text-gray-500 text-center py-6">
                  No pending listings to review
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingListings.map((listing: any) => (
                    <div
                      key={listing.id}
                      className="p-3 bg-gray-900/50 rounded-lg border border-gray-700"
                    >
                      <p className="text-white text-sm font-medium">
                        {listing.title}
                      </p>
                      <p className="text-gray-400 text-xs line-clamp-2 mb-2">
                        {listing.description}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {listing.category}
                        </Badge>
                        {listing.city && (
                          <span className="text-gray-500 text-xs">
                            📍 {listing.city}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          onClick={() =>
                            updateListingMutation.mutate({
                              listingId: listing.id,
                              status: "active",
                            })
                          }
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1"
                          onClick={() =>
                            updateListingMutation.mutate({
                              listingId: listing.id,
                              status: "rejected",
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="bg-gray-800/50 border-gray-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-400" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!orders?.length ? (
                <p className="text-gray-500 text-center py-6">No orders yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2 px-3">Order</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-right py-2 px-3">Total</th>
                        <th className="text-left py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order: any) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-800 hover:bg-gray-800/30"
                        >
                          <td className="py-2 px-3 text-white font-medium">
                            #{order.id}
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {order.user_name || order.user_email || "—"}
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              className={
                                statusColors[order.status] || "bg-gray-500/20"
                              }
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-amber-400 text-right font-semibold">
                            ${(order.total_cents / 100).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
