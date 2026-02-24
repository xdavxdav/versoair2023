import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle, Check } from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";

interface Artist {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialty?: string;
  ratingScore?: number;
  verified?: boolean;
  createdAt: string;
}

interface CreateArtistInput {
  name: string;
  email: string;
  phone: string;
  bio: string;
  specialty: string;
}

export function ArtistsSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [formData, setFormData] = useState<CreateArtistInput>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    specialty: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const API_BASE_URL =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || ""
      : "";

  // Fetch artists
  const {
    data: artists = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/v1/admin/artists`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to fetch artists");
      }
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 30000,
  });

  // Create/Update artist
  const mutation = useMutation({
    mutationFn: async (data: CreateArtistInput & { id?: number }) => {
      const url = data.id
        ? `${API_BASE_URL}/api/v1/admin/artists/${data.id}`
        : `${API_BASE_URL}/api/v1/admin/artists`;
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
        throw new Error(errData.error?.message || "Failed to save artist");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      setSuccess(
        editingArtist
          ? "Artist updated successfully"
          : "Artist created successfully",
      );
      resetForm();
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    },
  });

  // Delete artist
  const deleteMutation = useMutation({
    mutationFn: async (artistId: number) => {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/artists/${artistId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to delete artist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      setSuccess("Artist deleted successfully");
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
      email: "",
      phone: "",
      bio: "",
      specialty: "",
    });
    setEditingArtist(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      email: artist.email || "",
      phone: artist.phone || "",
      bio: artist.bio || "",
      specialty: artist.specialty || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Artist name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    mutation.mutate({
      ...formData,
      id: editingArtist?.id,
    });
  };

  const columns: DataTableColumn<Artist>[] = [
    {
      key: "name",
      label: "Artist Name",
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
      key: "specialty",
      label: "Specialty",
      width: "150px",
      render: (value) => (
        <span className="text-sm text-slate-400">{value || "-"}</span>
      ),
    },
    {
      key: "ratingScore",
      label: "Rating",
      render: (value) => (
        <span className="text-sm">{value ? `${value} ⭐` : "-"}</span>
      ),
      width: "100px",
    },
    {
      key: "verified",
      label: "Verified",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value
              ? "bg-green-600/20 text-green-400"
              : "bg-yellow-600/20 text-yellow-400"
          }`}
        >
          {value ? "Verified" : "Pending"}
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
          <h3 className="text-xl font-bold text-white">Artists</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage artists, contractors, and service providers
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
          Add Artist
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
        data={artists}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete "${row.name}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No artists found. Click 'Add Artist' to get started."
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h4 className="text-lg font-bold">
                {editingArtist ? "Edit Artist" : "Add New Artist"}
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
                  Artist Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter artist name"
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
                  placeholder="artist@example.com"
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
                  Specialty
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Music, Photography, Design"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
                  placeholder="Artist biography and background"
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
                    : editingArtist
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
