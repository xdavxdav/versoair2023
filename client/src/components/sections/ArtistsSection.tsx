import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  AlertCircle,
  Check,
  Search,
  Music,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { authenticatedFetch } from "@/lib/auth";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface Artist {
  id: number;
  businessId?: number;
  userId?: number;
  stageName: string;
  genre?: string;
  labelStatus?: string;
  spotifyUrl?: string;
  countryCode?: string;
}

interface CreateArtistInput {
  stageName: string;
  genre: string;
  labelStatus: string;
  spotifyUrl: string;
  countryCode?: string;
}

export function ArtistsSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  useScrollLock(isModalOpen);

  // Search / filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [countriesList, setCountriesList] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateArtistInput>({
    stageName: "",
    genre: "",
    labelStatus: "unsigned",
    spotifyUrl: "",
    countryCode: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch distinct genres for dropdown
  const { data: genres = [] } = useQuery({
    queryKey: ["artist-genres"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/v1/admin/artists/genres", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as string[];
    },
    staleTime: 60000,
  });

  // Load countries list
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch("/api/countries");
        if (res.ok) {
          const data = await res.json();
          setCountriesList(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.warn("Failed to load countries:", err);
      }
    };
    loadCountries();
  }, []);

  // Fetch artists — auto-fetches on mount and when filters change, limited to 5
  const { data: artistsData, isLoading } = useQuery({
    queryKey: ["artists", searchQuery, selectedGenre, selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5", page: "1" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedGenre) params.set("genre", selectedGenre);
      if (selectedCountry && selectedCountry !== "all")
        params.set("countryCode", selectedCountry);

      const res = await authenticatedFetch(
        `/api/v1/admin/artists?${params.toString()}`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to fetch artists");
      }
      const json = await res.json();
      return {
        artists: (json.data || []) as Artist[],
        total: json.pagination?.total ?? 0,
      };
    },
    staleTime: 30000,
  });

  const artists = artistsData?.artists ?? [];
  const totalCount = artistsData?.total ?? 0;

  // Create/Update artist
  const mutation = useMutation({
    mutationFn: async (data: CreateArtistInput & { id?: number }) => {
      const url = data.id
        ? `/api/v1/admin/artists/${data.id}`
        : `/api/v1/admin/artists`;
      const method = data.id ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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
      queryClient.invalidateQueries({ queryKey: ["artist-genres"] });
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
        `/api/v1/admin/artists/${artistId}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to delete artist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      queryClient.invalidateQueries({ queryKey: ["artist-genres"] });
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
      stageName: "",
      genre: "",
      labelStatus: "unsigned",
      spotifyUrl: "",
      countryCode: "",
    });
    setEditingArtist(null);
    setIsModalOpen(false);
    setError("");
  };

  const handleEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      stageName: artist.stageName,
      genre: artist.genre || "",
      labelStatus: artist.labelStatus || "unsigned",
      spotifyUrl: artist.spotifyUrl || "",
      countryCode: artist.countryCode || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.stageName.trim()) {
      setError("Stage name is required");
      return;
    }
    mutation.mutate({ ...formData, id: editingArtist?.id });
  };

  const columns: DataTableColumn<Artist>[] = [
    {
      key: "stageName",
      label: "Stage Name",
      sortable: true,
      width: "200px",
      render: (value) => (
        <span className="font-medium text-white">{value || "—"}</span>
      ),
    },
    {
      key: "genre",
      label: "Genre",
      sortable: true,
      width: "140px",
      render: (value) =>
        value ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30">
            {value}
          </span>
        ) : (
          <span className="text-slate-500 text-sm">—</span>
        ),
    },
    {
      key: "labelStatus",
      label: "Label",
      width: "120px",
      render: (value) => {
        const status = (value as string) || "unsigned";
        const colors: Record<string, string> = {
          signed: "bg-green-600/20 text-green-400 border-green-500/30",
          unsigned: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
          independent: "bg-blue-600/20 text-blue-400 border-blue-500/30",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${colors[status] || colors.unsigned}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "spotifyUrl",
      label: "Spotify",
      width: "90px",
      render: (value) =>
        value ? (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-400 hover:text-green-300 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Link
          </a>
        ) : (
          <span className="text-slate-500 text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            Artists
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Search and browse artist profiles from the database
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            // Pre-fill countryCode with selected country (if not "all")
            if (selectedCountry && selectedCountry !== "all") {
              setFormData((prev) => ({
                ...prev,
                countryCode: selectedCountry,
              }));
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Artist
        </button>
      </div>

      {/* Search bar with genre dropdown */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Genre dropdown */}
          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer"
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Country dropdown */}
          <div className="relative">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer"
            >
              <option value="all">All Countries</option>
              {countriesList.map((c: any) => (
                <option key={c.code || c.id} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Search input */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stage name or genre..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>

        {/* Result count */}
        {!isLoading && artists.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>
              Showing{" "}
              <span className="text-white font-medium">{artists.length}</span>
              {totalCount > 5 && (
                <>
                  {" "}
                  of{" "}
                  <span className="text-white font-medium">{totalCount}</span>
                </>
              )}{" "}
              artist{totalCount !== 1 ? "s" : ""}
            </span>
            {selectedGenre && (
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-full border border-purple-500/30">
                {selectedGenre}
              </span>
            )}
            {selectedCountry && selectedCountry !== "all" && (
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                {countriesList.find((c: any) => c.code === selectedCountry)
                  ?.name || selectedCountry}
              </span>
            )}
            {totalCount > 5 && (
              <span className="text-amber-400">(max 5 shown)</span>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/50 text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-green-600/10 border border-green-600/50 text-green-400 px-4 py-3 rounded-lg">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Results table */}
      <DataTable
        data={artists}
        columns={columns}
        onEdit={handleEdit}
        onDelete={(row) => {
          if (confirm(`Delete "${row.stageName}"?`)) {
            deleteMutation.mutate(row.id);
          }
        }}
        isLoading={isLoading}
        emptyMessage="No artists found matching your criteria."
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h4 className="text-lg font-bold text-white">
                {editingArtist ? "Edit Artist" : "Add New Artist"}
              </h4>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Stage Name *
                </label>
                <input
                  type="text"
                  value={formData.stageName}
                  onChange={(e) =>
                    setFormData({ ...formData, stageName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="Enter stage name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Genre
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Hip-Hop, Jazz, R&B, Pop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Label Status
                </label>
                <select
                  value={formData.labelStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, labelStatus: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 appearance-none"
                >
                  <option value="unsigned">Unsigned</option>
                  <option value="signed">Signed</option>
                  <option value="independent">Independent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Spotify URL
                </label>
                <input
                  type="url"
                  value={formData.spotifyUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, spotifyUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="https://open.spotify.com/artist/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Country
                </label>
                <select
                  value={formData.countryCode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, countryCode: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 appearance-none"
                >
                  <option value="">Select country...</option>
                  {countriesList.map((c: any) => (
                    <option key={c.code || c.id} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
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
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
