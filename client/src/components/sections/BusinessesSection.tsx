import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle, Check } from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";

interface Business {
  id: number;
  name: string;
  categoryId: number;
  email: string;
  phone: string;
  isActive: boolean;
  rating: string;
  reviews: number;
  createdAt: string;
}

interface CreateBusinessInput {
  name: string;
  categoryId: number;
  email: string;
  phone: string;
  description: string;
}

export function BusinessesSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState<CreateBusinessInput>({
    name: "",
    categoryId: 1,
    email: "",
    phone: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const API_BASE_URL =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || ""
      : "";

  // Fetch businesses
  const {
    data: businesses = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/v1/admin/businesses`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to fetch businesses");
      }
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 30000,
  });

  // Create/Update business
  const mutation = useMutation({
    mutationFn: async (data: CreateBusinessInput & { id?: number }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/businesses/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/businesses`;
      const method = data.id ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Failed to save business");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setSuccess(
        editingBusiness
          ? "Business updated successfully"
          : "Business created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete business
  const deleteMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/businesses/${businessId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to delete business");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setSuccess("Business deleted successfully");
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
      categoryId: 1,
      email: "",
      phone: "",
      description: "",
    });
    setEditingBusiness(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      categoryId: business.categoryId,
      email: business.email,
      phone: business.phone,
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Business name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    mutation.mutate({
      ...formData,
      id: editingBusiness?.id,
    });
  };

  const columns: DataTableColumn<Business>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      width: "200px",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      width: "200px",
    },
    {
      key: "phone",
      label: "Phone",
      width: "150px",
    },
    {
      key: "rating",
      label: "Rating",
      render: (value) => `${value} ⭐`,
      width: "100px",
    },
    {
      key: "reviews",
      label: "Reviews",
      sortable: true,
      width: "100px",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value
              ? "bg-green-600/20 text-green-400"
              : "bg-red-600/20 text-red-400"
          }`}
        >
          {value ? "Active" : "Inactive"}
        </span>
      ),
      width: "100px",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Businesses</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage all business listings and details
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
          Add Business
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-gap-3 gap-3 bg-red-600/10 border border-red-600/50 text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-gap-3 gap-3 bg-green-600/10 border border-green-600/50 text-green-400 px-4 py-3 rounded-lg">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={businesses}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete "${row.name}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No businesses found. Click 'Add Business' to get started."
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h4 className="text-lg font-bold">
                {editingBusiness ? "Edit Business" : "Add New Business"}
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
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="business@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
                  placeholder="Business description"
                />
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
                    : editingBusiness
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
