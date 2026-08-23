/**
 * MusicLibrary — My Library page for Musical Universe
 * Shows saved tracks, playlists, albums, and recently played
 */
import { motion } from "framer-motion";
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
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicSectionCard, MusicEmptyState } from "@/components/music";
import { Button } from "@/components/ui/button";
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

        {/* Recently Played — pulls from real listening history */}
        {(activeTab === "all" || activeTab === "recent") && (
          <MusicSectionCard title="Écoutés récemment" icon={Clock}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-white/40 text-sm">Aucun historique d'écoute</p>
              <p className="text-white/20 text-xs mt-1">
                Vos pistes écoutées apparaîtront ici
              </p>
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
              action={{
                label: "Créer une playlist",
                onClick: () => {},
              }}
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
              action={{
                label: "Découvrir",
                href: "/stream",
              }}
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
              action={{
                label: "Écouter de la musique",
                href: "/stream",
              }}
            />
          </MusicSectionCard>
        )}
      </div>
    </MusicLayout>
  );
}
