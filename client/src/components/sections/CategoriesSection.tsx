import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  AlertCircle,
  Check,
  ChevronRight,
  Search,
} from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

export function CategoriesSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  useScrollLock(isModalOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const API_BASE_URL =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL || "" : "";

  // Fetch categories
  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/categories`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to fetch categories");
      }
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 60000,
  });

  // Create/Update category
  const mutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: number }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/categories/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/categories`;
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
        throw new Error(errData.error?.message || "Failed to save category");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSuccess(
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/categories/${categoryId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to delete category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSuccess("Category deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "" });
    setEditingCategory(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    if (!formData.slug.trim()) {
      setError("Category slug is required");
      return;
    }

    mutation.mutate({
      ...formData,
      id: editingCategory?.id,
    });
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "name",
      label: "Category Name",
      sortable: true,
      width: "200px",
    },
    {
      key: "slug",
      label: "URL Slug",
      width: "200px",
      render: (value) => (
        <code className="text-xs bg-slate-800 px-2 py-1 rounded">{value}</code>
      ),
    },
    {
      key: "description",
      label: "Description",
      width: "300px",
      render: (value) => (
        <p className="text-sm text-slate-400 line-clamp-2">{value || "-"}</p>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
      width: "120px",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Categories</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage business categories and taxonomy
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search..."
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
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
        data={categories.filter(
          (cat: any) =>
            !searchQuery ||
            cat.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
            cat.slug.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
            cat.description
              ?.toLowerCase()
              .startsWith(searchQuery.toLowerCase()),
        )}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete category "${row.name}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No categories found. Click 'Add Category' to get started."
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h4 className="text-lg font-bold">
                {editingCategory ? "Edit Category" : "Add New Category"}
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
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Restaurants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  placeholder="restaurants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
                  placeholder="Category description"
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
                    : editingCategory
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
