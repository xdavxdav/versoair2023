import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle, Check, TrendingUp } from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Campaign {
  id: number;
  name: string;
  businessId: number;
  objective?: string | null;
  dailyBudget?: string | number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status: string;
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
}

export function AdvertisingSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    businessId: 1,
    objective: "",
    dailyBudget: "",
    startDate: "",
    endDate: "",
    status: "draft",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/v1/admin/campaigns`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 60000,
  });

  // Create/Update campaign
  const mutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: number }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/campaigns/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/campaigns`;
      const method = data.id ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          businessId: data.businessId,
          objective: data.objective,
          dailyBudget: parseFloat(data.dailyBudget) || 0,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          status: data.status,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to save campaign");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSuccess(
        editingCampaign
          ? "Campaign updated successfully"
          : "Campaign created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) throw new Error("Failed to delete campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSuccess("Campaign deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      businessId: 1,
      objective: "",
      dailyBudget: "",
      startDate: "",
      endDate: "",
      status: "draft",
    });
    setEditingCampaign(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      businessId: campaign.businessId,
      objective: campaign.objective || "",
      dailyBudget: campaign.dailyBudget?.toString() || "",
      startDate:
        typeof campaign.startDate === "string"
          ? campaign.startDate
          : campaign.startDate instanceof Date
            ? campaign.startDate.toISOString().split("T")[0]
            : "",
      endDate:
        typeof campaign.endDate === "string"
          ? campaign.endDate
          : campaign.endDate instanceof Date
            ? campaign.endDate.toISOString().split("T")[0]
            : "",
      status: campaign.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Campaign name is required");
      return;
    }

    mutation.mutate({
      name: formData.name,
      businessId: formData.businessId,
      objective: formData.objective,
      dailyBudget: parseFloat(formData.dailyBudget) || 0,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      status: formData.status,
      id: editingCampaign?.id ?? undefined,
    } as unknown as typeof formData & { id?: number });
  };

  const columns: DataTableColumn<Campaign>[] = [
    {
      key: "name",
      label: "Campaign Name",
      sortable: true,
      width: "200px",
    },
    {
      key: "objective",
      label: "Objective",
      sortable: true,
      width: "150px",
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value === "active"
              ? "bg-green-600/20 text-green-400"
              : value === "paused"
                ? "bg-yellow-600/20 text-yellow-400"
                : "bg-gray-600/20 text-gray-400"
          }`}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      width: "100px",
    },
    {
      key: "dailyBudget",
      label: "Daily Budget",
      render: (value) => {
        if (!value) return "Not set";
        return `$${parseFloat(String(value)).toFixed(2)}`;
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (value) => {
        if (!value) return "N/A";
        return new Date(value).toLocaleDateString();
      },
      width: "120px",
    },
    {
      key: "endDate",
      label: "End Date",
      render: (value) => {
        if (!value) return "N/A";
        return new Date(value).toLocaleDateString();
      },
      width: "120px",
    },
  ];

  // Stats cards
  const activeCampaigns = campaigns.filter(
    (c: Campaign) => c.status === "draft",
  ).length;
  const stats = [
    {
      label: "Total Campaigns",
      value: String(campaigns.length),
      icon: TrendingUp,
      color: "blue",
    },
    {
      label: "Draft Campaigns",
      value: String(activeCampaigns),
      color: "yellow",
    },
    {
      label: "Total Budget",
      value:
        campaigns.length > 0
          ? `$${campaigns.reduce((sum: number, c: Campaign) => sum + (parseFloat(String(c.dailyBudget)) || 0) * 30, 0).toFixed(2)}`
          : "$0",
      color: "green",
    },
    {
      label: "Avg Daily Budget",
      value:
        campaigns.length > 0
          ? `$${(campaigns.reduce((sum: number, c: Campaign) => sum + (parseFloat(String(c.dailyBudget)) || 0), 0) / campaigns.length).toFixed(2)}`
          : "$0",
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Advertising</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage advertising campaigns and performance
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-700 rounded-lg p-4"
          >
            <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-white">
              {String(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-600/10 border border-red-600/50 text-red-400 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError("")}
            className="p-1 hover:bg-red-600/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 bg-green-600/10 border border-green-600/50 text-green-400 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
          <button
            onClick={() => setSuccess("")}
            className="p-1 hover:bg-green-600/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={campaigns}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete campaign "${row.name}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No campaigns found. Click 'New Campaign' to get started."
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h4 className="text-lg font-bold">
                {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
              </h4>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Summer Campaign"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Objective
                </label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) =>
                    setFormData({ ...formData, objective: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Brand Awareness, Lead Generation, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Daily Budget ($)
                </label>
                <input
                  type="number"
                  value={formData.dailyBudget}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyBudget: e.target.value })
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="50.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {mutation.isPending
                    ? "Saving..."
                    : editingCampaign
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
