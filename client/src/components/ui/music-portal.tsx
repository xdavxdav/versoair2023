import { X, Music } from "lucide-react";
import { Button } from "./button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { useScrollLock } from "@/hooks/use-scroll-lock";

interface MusicPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MusicArtist {
  id: number;
  name: string;
  genre: string;
  biography: string;
  imageUrl: string;
  totalStreams: number;
  monthlyListeners: number;
  createdAt: string;
}

interface MusicAnalytics {
  id: number;
  trackId: number;
  artistId: number;
  metricType: string;
  value: number;
  period: string;
  recordedAt: string;
}

export default function MusicPortal({ isOpen, onClose }: MusicPortalProps) {
  useScrollLock(isOpen);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // ── Bulletproof overlay guard ──
  // Ref-based timestamp: immune to React batching delays.
  // The overlay DOM is delayed 500ms so ghost clicks can't hit it at all.
  const openedAt = useRef(0);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isOpen) {
      openedAt.current = Date.now();
      const t = setTimeout(() => setShowOverlay(true), 500);
      return () => {
        clearTimeout(t);
        setShowOverlay(false);
      };
    }
    setShowOverlay(false);
  }, [isOpen]);

  const handleOverlayClose = useCallback(() => {
    // Extra safety: ignore clicks within 500ms of open
    if (Date.now() - openedAt.current > 500) onClose();
  }, [onClose]);

  const { data: artistsResponse } = useQuery<{ data: MusicArtist[] }>({
    queryKey: ["/api/music/artists"],
    enabled: isOpen,
  });

  const { data: analyticsResponse } = useQuery<{ data: MusicAnalytics[] }>({
    queryKey: ["/api/music/analytics"],
    enabled: isOpen,
  });

  const artists = artistsResponse?.data;
  const analytics = analyticsResponse?.data;

  useEffect(() => {
    if (isOpen && chartRef.current && artists && artists.length > 0) {
      const ctx = chartRef.current.getContext("2d");

      // Destroy existing chart if any
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      if (ctx && (window as any).Chart) {
        // Group artists by genre and count
        const genreCounts: { [key: string]: number } = {};
        artists.forEach((artist) => {
          const genre = artist.genre || "Other";
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });

        const genres = Object.keys(genreCounts);
        const counts = Object.values(genreCounts);
        const colors = [
          "#ff6b9d",
          "#c44569",
          "#6c5ce7",
          "#a29bfe",
          "#fd79a8",
          "#e17055",
          "#00b894",
          "#0984e3",
        ];

        chartInstanceRef.current = new (window as any).Chart(ctx, {
          type: "doughnut",
          data: {
            labels: genres,
            datasets: [
              {
                data: counts,
                backgroundColor: colors.slice(0, genres.length),
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "white",
                  padding: 10,
                  font: {
                    size: 11,
                  },
                },
              },
            },
          },
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, artists]);

  return (
    <>
      {/* Overlay — delayed 500ms so ghost-clicks from the open-tap can't reach it */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] animate-in fade-in duration-200"
          onClick={handleOverlayClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-4 left-2 right-2 md:top-1/2 md:-translate-y-1/2 md:left-4 md:right-auto md:w-96 max-h-[90vh] overflow-y-auto music-portal-scroll bg-gradient-to-b from-purple-900 to-pink-900 shadow-2xl z-[10001] p-4 md:p-6 rounded-lg text-white transition-all duration-300 touch-pan-y overscroll-contain ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Verso Air Musical Label</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-purple-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Top Artists</h4>
            <div className="space-y-2">
              {artists?.slice(0, 2).map((artist, index: number) => (
                <div key={artist.id} className="flex items-center space-x-3">
                  <img
                    src={
                      artist.imageUrl ||
                      `https://images.unsplash.com/photo-${
                        index === 0
                          ? "1493225457124-a3eb161ffa5f"
                          : "1534528741775-53994a69daeb"
                      }?w=40&h=40&fit=crop&crop=face`
                    }
                    alt={artist.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-sm text-purple-200">
                      {artist.totalStreams?.toLocaleString() || "0"} streams
                    </p>
                  </div>
                </div>
              )) || (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                      <span className="text-purple-300 text-xs">♪</span>
                    </div>
                    <div>
                      <p className="font-medium text-purple-200">
                        Aucun artiste inscrit
                      </p>
                      <p className="text-sm text-purple-300">
                        Soyez le premier
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Music Analytics</h4>
            <div className="h-48">
              <canvas ref={chartRef} className="w-full h-full"></canvas>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Industry Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Streams:</span>
                <span>
                  {artists
                    ?.reduce((s, a) => s + (a.totalStreams || 0), 0)
                    .toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Artists:</span>
                <span>{artists?.length || 0}</span>
              </div>
            </div>

            <Link href="/artist-portal">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white mt-4"
                onClick={onClose}
              >
                <Music className="mr-2 h-4 w-4" />
                Artist Portal - Full Stats
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
