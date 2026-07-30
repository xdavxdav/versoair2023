/**
 * Music Vault — Complete track library with upload, management, and organization
 * Shows all user's tracks, albums, and allows uploading new music
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Music2,
  Upload,
  Play,
  Pause,
  Search,
  Filter,
  Grid,
  List,
  FolderPlus,
  MoreVertical,
  Clock,
  TrendingUp,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  DollarSign,
  Calendar,
  Disc3,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  FileAudio,
  Image as ImageIcon,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicTierBadge, MusicUpgradeGate } from "@/components/music";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMusicAccess } from "@/hooks/useMusicAccess";
import { usePaymentCountry } from "@/hooks/usePaymentCountry";
import { PaymentLogo } from "@/components/PaymentLogos";
import {
  useMusicTracks,
  useMyArtist,
  uploadTrack,
  deleteTrack,
  useInvalidateTracks,
} from "@/hooks/use-music";

/* ─── Track type ─── */
interface Track {
  id: number;
  title: string;
  artist_name?: string;
  genre?: string;
  duration?: number;
  streams?: number;
  play_count?: number;
  likes?: number;
  downloads?: number;
  revenue?: string;
  status?: string;
  release_date?: string;
  created_at?: string;
  has_pochette?: boolean;
  has_audio_data?: boolean;
  price?: string;
  bpm?: number;
  musical_key?: string;
  mood?: string;
  cover_art?: string;
}

/* ─── Stat Card ─── */
function VaultStatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: string;
  color: "purple" | "pink" | "amber" | "emerald";
}) {
  const colors = {
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-fuchsia-600",
    amber: "from-amber-500 to-orange-600",
    emerald: "from-emerald-500 to-green-600",
  };
  const isPositive = trend?.startsWith("+");

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm text-white/50">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Genre list ─── */
const GENRES = [
  "Afrobeats",
  "Amapiano",
  "RnB",
  "Hip-Hop",
  "Rap",
  "Trap",
  "Drill",
  "Pop",
  "Rock",
  "Jazz",
  "Soul",
  "Reggae",
  "Dancehall",
  "Electronic",
  "Classical",
  "Gospel",
  "Latin",
  "Zouk",
  "Funk",
  "Blues",
  "Lo-fi",
  "Ambient",
  "World",
  "Other",
];

/* ═══════════════════════════════════════════════════════════
   Main Vault Page
   ═══════════════════════════════════════════════════════════ */
export default function MusicVault() {
  const { user } = useAuthContext();
  const {
    isArtist,
    userTier,
    canAccessVault,
    isPremium,
    isLoading: accessLoading,
  } = useMusicAccess();
  const { data: myArtist } = useMyArtist();
  const invalidateTracks = useInvalidateTracks();
  const queryClient = useQueryClient();

  // Fetch user's tracks - try multiple endpoints
  const {
    data: tracksData,
    isLoading: tracksLoading,
    refetch: refetchTracks,
  } = useQuery({
    queryKey: ["vault-tracks", user?.id],
    queryFn: async () => {
      // Try /api/upload/my-tracks first (portal upload system)
      try {
        const res1 = await fetch("/api/upload/my-tracks", {
          credentials: "include",
        });
        if (res1.ok) {
          const data = await res1.json();
          if (data.success && data.tracks?.length > 0) {
            return { tracks: data.tracks, total: data.tracks.length };
          }
        }
      } catch (e) {
        console.warn("[Vault] /api/upload/my-tracks request failed:", e);
      }

      // Then try /api/music/artists/:id/tracks (Drizzle system)
      if (myArtist?.id) {
        try {
          const res2 = await fetch(`/api/music/artists/${myArtist.id}`, {
            credentials: "include",
          });
          if (res2.ok) {
            const data = await res2.json();
            if (data.success && data.data?.tracks?.length > 0) {
              return {
                tracks: data.data.tracks,
                total: data.data.tracks.length,
              };
            }
          }
        } catch (e) {
          console.warn("[Vault] /api/music/artists request failed:", e);
        }
      }

      // Fallback: try streaming tracks for this artist
      if (myArtist?.id) {
        try {
          const res3 = await fetch(
            `/api/streaming/tracks?artist=${myArtist.id}`,
            { credentials: "include" },
          );
          if (res3.ok) {
            const data = await res3.json();
            if (data.tracks?.length > 0) {
              return {
                tracks: data.tracks,
                total: data.total || data.tracks.length,
              };
            }
          }
        } catch (e) {
          console.warn("[Vault] /api/streaming/tracks request failed:", e);
        }
      }

      return { tracks: [], total: 0 };
    },
    enabled: !!user,
  });

  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    title: "",
    genre: "",
    price: "",
    description: "",
    bpm: "",
    musical_key: "",
    mood: "",
    releaseType: "single",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const tracks: Track[] = tracksData?.tracks || [];
  const totalTracks = tracksData?.total || 0;

  // Filter and sort tracks
  const filteredTracks = tracks
    .filter((track) => {
      const matchesSearch =
        !searchQuery ||
        track.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre =
        selectedGenre === "all" || track.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "streams":
          return (b.streams || 0) - (a.streams || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "revenue":
          return parseFloat(b.revenue || "0") - parseFloat(a.revenue || "0");
        default:
          return 0;
      }
    });

  // Stats
  const totalStreams = tracks.reduce((sum, t) => sum + (t.streams || 0), 0);
  const totalRevenue = tracks.reduce(
    (sum, t) => sum + parseFloat(t.revenue || "0"),
    0,
  );
  const publishedTracks = tracks.filter((t) => t.status === "published").length;

  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile || !uploadForm.title) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("audio", uploadFile);
      formData.append("title", uploadForm.title);
      // If we don't have an artist profile yet, the server auto-creates one
      // from the authenticated user, so only send artist_id when known.
      if (myArtist?.id) formData.append("artist_id", String(myArtist.id));
      if (uploadForm.genre) formData.append("genre", uploadForm.genre);
      if (uploadForm.price) formData.append("price", uploadForm.price);
      if (uploadForm.description)
        formData.append("description", uploadForm.description);
      if (uploadForm.bpm) formData.append("bpm", uploadForm.bpm);
      if (uploadForm.musical_key)
        formData.append("musical_key", uploadForm.musical_key);
      if (uploadForm.mood) formData.append("mood", uploadForm.mood);
      if (coverFile) formData.append("pochette", coverFile);

      setUploadProgress(30);

      await uploadTrack(formData);

      setUploadProgress(100);

      // Reset form
      setUploadForm({
        title: "",
        genre: "",
        price: "",
        description: "",
        bpm: "",
        musical_key: "",
        mood: "",
        releaseType: "single",
      });
      setUploadFile(null);
      setCoverFile(null);
      setShowUploadModal(false);

      // Refresh tracks
      invalidateTracks();
      refetchTracks();
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle delete
  const handleDelete = async (trackId: number) => {
    try {
      await deleteTrack(trackId);
      invalidateTracks();
      refetchTracks();
      setShowDeleteDialog(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading or access gate
  if (accessLoading) {
    return (
      <MusicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </MusicLayout>
    );
  }

  if (!canAccessVault) {
    return (
      <MusicLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <MusicUpgradeGate
            title="Unlock Your Music Vault"
            description="Store and manage your entire music library with the Vault"
            benefits={[
              "Unlimited track uploads",
              "Album & playlist organization",
              "Revenue tracking per track",
              "Advanced analytics",
            ]}
            requiredTier="supporter"
            variant="card"
          />
        </div>
      </MusicLayout>
    );
  }

  return (
    <MusicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-white" />
              </div>
              Music Vault
            </h1>
            <p className="text-white/50 mt-1">
              Your complete music library • {totalTracks} tracks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MusicTierBadge tier={userTier as any} size="md" />
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Track
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <VaultStatCard
            icon={Music2}
            label="Total Tracks"
            value={totalTracks}
            color="purple"
          />
          <VaultStatCard
            icon={CheckCircle}
            label="Published"
            value={publishedTracks}
            color="emerald"
          />
          <VaultStatCard
            icon={TrendingUp}
            label="Total Streams"
            value={totalStreams.toLocaleString()}
            trend="+12%"
            color="pink"
          />
          <VaultStatCard
            icon={DollarSign}
            label="Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            trend="+8%"
            color="amber"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/40" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white placeholder-white/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="streams">Most Streams</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-white/20 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/50"
                }
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/50"
                }
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks Grid/List */}
        {tracksLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Music2 className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {tracks.length === 0 ? "No tracks yet" : "No matching tracks"}
            </h3>
            <p className="text-white/50 mb-4">
              {tracks.length === 0
                ? "Upload your first track to get started"
                : "Try adjusting your filters"}
            </p>
            {tracks.length === 0 && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Track
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTracks.map((track) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden hover:bg-white/[0.06] transition-colors"
              >
                {/* Cover */}
                <div className="aspect-square relative bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  {track.has_pochette ? (
                    <img
                      src={`/api/streaming/tracks/${track.id}/pochette`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Play className="w-5 h-5" />
                    </Button>
                  </div>
                  {track.status !== "published" && (
                    <Badge className="absolute top-2 right-2 bg-amber-500/80 text-white text-xs">
                      {track.status}
                    </Badge>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {track.title}
                      </h3>
                      <p className="text-sm text-white/50 truncate">
                        {track.genre || "No genre"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/50"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-white/20">
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="text-red-400 hover:bg-red-500/10"
                          onClick={() => setShowDeleteDialog(track.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {(track.streams || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.03] text-white/50 text-sm">
                <tr>
                  <th className="text-left p-4">#</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4 hidden md:table-cell">Genre</th>
                  <th className="text-left p-4 hidden lg:table-cell">
                    Duration
                  </th>
                  <th className="text-left p-4">Streams</th>
                  <th className="text-left p-4 hidden md:table-cell">
                    Revenue
                  </th>
                  <th className="text-left p-4">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track, index) => (
                  <tr
                    key={track.id}
                    className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="p-4 text-white/40">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                          {track.has_pochette ? (
                            <img
                              src={`/api/streaming/tracks/${track.id}/pochette`}
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Music2 className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <span className="font-medium text-white truncate max-w-[200px]">
                          {track.title}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-white/50 hidden md:table-cell">
                      {track.genre || "-"}
                    </td>
                    <td className="p-4 text-white/50 hidden lg:table-cell">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="p-4 text-white">
                      {(track.streams || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-emerald-400 hidden md:table-cell">
                      ${parseFloat(track.revenue || "0").toFixed(2)}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          track.status === "published"
                            ? "border-emerald-500/30 text-emerald-400"
                            : "border-amber-500/30 text-amber-400"
                        }
                      >
                        {track.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/50"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-900 border-white/20">
                          <DropdownMenuItem className="text-white hover:bg-white/10">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={() => setShowDeleteDialog(track.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload Modal */}
        <Dialog
          open={showUploadModal}
          onOpenChange={(open) => !isUploading && setShowUploadModal(open)}
        >
          <DialogContent className="sm:max-w-[540px] bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                Upload New Track
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Upload your music and start earning from streams and downloads
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Audio File */}
              <div className="space-y-2">
                <Label>Audio File *</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    uploadFile
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/20 hover:border-purple-500/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileAudio className="w-8 h-8 text-purple-400" />
                      <div className="text-left">
                        <p className="font-medium text-white">
                          {uploadFile.name}
                        </p>
                        <p className="text-sm text-white/50">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/50 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-white/30 mx-auto mb-2" />
                      <p className="text-white/50">
                        Click to select audio file
                      </p>
                      <p className="text-xs text-white/30 mt-1">
                        MP3, WAV, FLAC • Max 50MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Track Title */}
              <div className="space-y-2">
                <Label>Track Title *</Label>
                <Input
                  placeholder="Enter track title"
                  className="bg-white/10 border-white/20"
                  value={uploadForm.title}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              {/* Genre + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select
                    value={uploadForm.genre}
                    onValueChange={(v) =>
                      setUploadForm((p) => ({ ...p, genre: v }))
                    }
                  >
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20 max-h-[200px]">
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price per Download ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.99"
                    className="bg-white/10 border-white/20"
                    value={uploadForm.price}
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, price: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Cover Art */}
              <div className="space-y-2">
                <Label>Cover Art (optional)</Label>
                <div
                  className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    coverFile
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/20 hover:border-purple-500/30"
                  }`}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <ImageIcon className="w-6 h-6 text-purple-400" />
                      <span className="text-white">{coverFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/50 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverFile(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Click to add cover art
                    </p>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Advanced Options */}
              <button
                type="button"
                onClick={() => setShowAdvanced((p) => !p)}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Advanced Options (BPM, Key, Mood)
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-3 gap-3 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label>BPM</Label>
                      <Input
                        type="number"
                        placeholder="120"
                        className="bg-white/10 border-white/20"
                        value={uploadForm.bpm}
                        onChange={(e) =>
                          setUploadForm((p) => ({ ...p, bpm: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Key</Label>
                      <Select
                        value={uploadForm.musical_key}
                        onValueChange={(v) =>
                          setUploadForm((p) => ({ ...p, musical_key: v }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue placeholder="Key" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/20">
                          {[
                            "C",
                            "C#",
                            "D",
                            "D#",
                            "E",
                            "F",
                            "F#",
                            "G",
                            "G#",
                            "A",
                            "A#",
                            "B",
                          ].map((k) => (
                            <SelectItem key={k} value={k}>
                              {k}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mood</Label>
                      <Select
                        value={uploadForm.mood}
                        onValueChange={(v) =>
                          setUploadForm((p) => ({ ...p, mood: v }))
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20">
                          <SelectValue placeholder="Mood" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/20">
                          {[
                            "Energetic",
                            "Chill",
                            "Dark",
                            "Happy",
                            "Sad",
                            "Romantic",
                            "Aggressive",
                          ].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Uploading...</span>
                    <span className="text-purple-400">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadForm.title || isUploading}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Track
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={showDeleteDialog !== null}
          onOpenChange={() => setShowDeleteDialog(null)}
        >
          <AlertDialogContent className="bg-gray-900 border-white/20 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Track?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/50">
                This will permanently delete this track and all associated data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  showDeleteDialog && handleDelete(showDeleteDialog)
                }
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ━━━ Track Store Payment Methods ━━━ */}
        <VaultPaymentFooter />
      </div>
    </MusicLayout>
  );
}

/* ═══ Vault Payment Methods Footer ═══ */
function VaultPaymentFooter() {
  const { format, sortedMethods, countryCode, currency, currencySymbol, flag } =
    usePaymentCountry();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-900/10 to-fuchsia-900/5 backdrop-blur-md p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Track Store</h3>
            <p className="text-xs text-white/40">Purchase & sell beats</p>
          </div>
        </div>
        <span className="text-xs text-purple-300/60">
          {flag} {currency}
        </span>
      </div>

      {/* Price display */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-xs text-gray-400">Basic License</p>
          <p className="text-lg font-bold text-white">{format(29.99)}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-xs text-gray-400">Premium License</p>
          <p className="text-lg font-bold text-white">{format(99.99)}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-xs text-gray-400">Exclusive</p>
          <p className="text-lg font-bold text-white">{format(499.99)}</p>
        </div>
      </div>

      {/* Payment methods */}
      <div className="flex flex-wrap gap-2">
        {sortedMethods.map((m) => (
          <span
            key={m.id}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs ${
              m.available
                ? "bg-white/10 text-white border border-white/10"
                : "bg-gray-900/50 text-gray-600 border border-gray-800"
            }`}
          >
            <PaymentLogo methodId={m.id} size={16} /> {m.name}
            {m.comingSoon && (
              <span className="text-[9px] text-amber-400 ml-1">Soon</span>
            )}
          </span>
        ))}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          See also:
        </span>
        <Link href="/account/billing">
          <span className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
            💳 Billing
          </span>
        </Link>
        <span className="text-gray-700">·</span>
        <Link href="/music/dashboard">
          <span className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
            🎵 Dashboard
          </span>
        </Link>
        <span className="text-gray-700">·</span>
        <Link href="/streamer-portal">
          <span className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
            📡 Streamer
          </span>
        </Link>
        <span className="text-gray-700">·</span>
        <Link href="/music/royalties">
          <span className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
            💰 Royalties
          </span>
        </Link>
      </div>
    </motion.div>
  );
}
