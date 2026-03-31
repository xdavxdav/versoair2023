/**
 * MusicLibrary — My Library page for Musical Universe
 * Shows saved tracks, playlists, albums, and recently played
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Library,
  Play,
  Heart,
  Clock,
  Music2,
  ListMusic,
  Disc3,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicSectionCard, MusicEmptyState } from "@/components/music";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState } from "react";

/* ─── Tab types ─── */
type LibraryTab = "all" | "playlists" | "albums" | "tracks" | "recent";

const TABS: {
  id: LibraryTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "Tout", icon: Library },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "albums", label: "Albums", icon: Disc3 },
  { id: "tracks", label: "Titres", icon: Music2 },
  { id: "recent", label: "Récents", icon: Clock },
];

export default function MusicLibrary() {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's library (saved tracks, playlists, etc.)
  const { data: library, isLoading } = useQuery({
    queryKey: ["/api/streaming/library", user?.id],
    enabled: !!user?.id,
  });

  return (
    <MusicLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Library className="w-7 h-7 text-purple-400" />
              Ma Bibliothèque
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Vos titres sauvegardés, playlists et albums favoris
            </p>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 gap-2 w-fit">
            <Plus className="w-4 h-4" />
            Nouvelle Playlist
          </Button>
        </motion.div>

        {/* Search + Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans ma bibliothèque..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Recently Played */}
        {(activeTab === "all" || activeTab === "recent") && (
          <MusicSectionCard title="Écoutés récemment" icon={Clock}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                {
                  title: "Coupé-Décalé Mix",
                  artist: "DJ Arafat",
                  plays: "2.3K",
                },
                { title: "Afrobeats Vibes", artist: "Various", plays: "1.8K" },
                { title: "Soul Sessions", artist: "Joel", plays: "956" },
                { title: "Late Night R&B", artist: "Various", plays: "3.1K" },
                { title: "Dancehall Fire", artist: "Watcher", plays: "1.2K" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-purple-500/[0.06] transition-colors cursor-pointer"
                >
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 flex items-center justify-center mb-3 relative overflow-hidden">
                    <Music2 className="w-8 h-8 text-white/30" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium truncate">
                    {item.title}
                  </p>
                  <p className="text-white/30 text-xs truncate">
                    {item.artist}
                  </p>
                </motion.div>
              ))}
            </div>
          </MusicSectionCard>
        )}

        {/* Playlists */}
        {(activeTab === "all" || activeTab === "playlists") && (
          <MusicSectionCard title="Mes Playlists" icon={ListMusic}>
            <MusicEmptyState
              icon={ListMusic}
              title="Aucune playlist encore"
              description="Créez votre première playlist et commencez à organiser votre musique."
              action={
                <Button
                  variant="outline"
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Créer une playlist
                </Button>
              }
            />
          </MusicSectionCard>
        )}

        {/* Saved Albums */}
        {(activeTab === "all" || activeTab === "albums") && (
          <MusicSectionCard title="Albums sauvegardés" icon={Disc3}>
            <MusicEmptyState
              icon={Disc3}
              title="Aucun album sauvegardé"
              description="Parcourez le catalogue et sauvegardez vos albums préférés."
              action={
                <Link href="/stream">
                  <Button
                    variant="outline"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Découvrir
                  </Button>
                </Link>
              }
            />
          </MusicSectionCard>
        )}

        {/* Liked Tracks */}
        {(activeTab === "all" || activeTab === "tracks") && (
          <MusicSectionCard title="Titres aimés" icon={Heart}>
            <MusicEmptyState
              icon={Heart}
              title="Aucun titre aimé"
              description="Appuyez sur ❤️ pour sauvegarder vos morceaux favoris ici."
              action={
                <Link href="/stream">
                  <Button
                    variant="outline"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Écouter de la musique
                  </Button>
                </Link>
              }
            />
          </MusicSectionCard>
        )}
      </div>
    </MusicLayout>
  );
}
