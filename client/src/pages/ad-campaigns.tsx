import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Megaphone,
  Plus,
  Loader2,
  ArrowLeft,
  Eye,
  MousePointerClick,
  Target,
  DollarSign,
  Pause,
  Play,
  Trash2,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";

interface Campaign {
  id: string;
  businessId: number;
  name: string;
  description: string | null;
  budget: string;
  status: string;
  startDate: string;
  endDate: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    budget: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    description: "",
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch("/api/v1/admin/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.budget) {
      setError("Campaign name and budget are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await authenticatedFetch("/api/v1/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          businessId: 1, // Will be set from user's business context
          budget: form.budget,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          description: form.description || undefined,
          status: "active",
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          name: "",
          budget: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          description: "",
        });
        fetchCampaigns();
      } else {
        const data = await res.json();
        setError(data.error?.message || "Failed to create campaign");
      }
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
      await authenticatedFetch(`/api/v1/admin/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          businessId: campaign.businessId,
          budget: campaign.budget,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: newStatus,
        }),
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to update campaign:", err);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await authenticatedFetch(`/api/v1/admin/campaigns/${id}`, {
        method: "DELETE",
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case "ended":
        return <Badge className="bg-gray-100 text-gray-600">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const ctr = (clicks: number, impressions: number) =>
    impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) + "%" : "—";

  // Summary stats
  const totalBudget = campaigns.reduce(
    (sum, c) => sum + parseFloat(c.budget || "0"),
    0,
  );
  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (c.impressions || 0),
    0,
  );
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <Megaphone className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Ad Campaigns</h1>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Megaphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-bold">{activeCampaigns}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Budget</p>
                <p className="text-xl font-bold">
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Impressions</p>
                <p className="text-xl font-bold">
                  {totalImpressions.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MousePointerClick className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Clicks</p>
                <p className="text-xl font-bold">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Summer Sale Promo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget (USD) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.budget}
                      onChange={(e) =>
                        setForm({ ...form, budget: e.target.value })
                      }
                      placeholder="500.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date (optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Brief description of the campaign objective"
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Create Campaign
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Your Campaigns ({campaigns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No campaigns yet</p>
                <p className="text-sm">
                  Create your first ad campaign to boost your business
                  visibility
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">Campaign</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Budget</th>
                      <th className="pb-3 font-medium text-right">
                        Impressions
                      </th>
                      <th className="pb-3 font-medium text-right">Clicks</th>
                      <th className="pb-3 font-medium text-right">CTR</th>
                      <th className="pb-3 font-medium text-right">Conv.</th>
                      <th className="pb-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(
                                campaign.startDate,
                              ).toLocaleDateString()}
                              {campaign.endDate &&
                                ` — ${new Date(campaign.endDate).toLocaleDateString()}`}
                            </p>
                          </div>
                        </td>
                        <td className="py-3">{statusBadge(campaign.status)}</td>
                        <td className="py-3 text-right font-mono">
                          ${parseFloat(campaign.budget).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          {(campaign.impressions || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          {(campaign.clicks || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          {ctr(campaign.clicks || 0, campaign.impressions || 0)}
                        </td>
                        <td className="py-3 text-right">
                          {(campaign.conversions || 0).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(campaign)}
                              title={
                                campaign.status === "active"
                                  ? "Pause"
                                  : "Resume"
                              }
                            >
                              {campaign.status === "active" ? (
                                <Pause className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <Play className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCampaign(campaign.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
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
  );
}
