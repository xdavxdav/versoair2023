import { X, Music } from "lucide-react";
import { Button } from "./button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "wouter";

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
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Disable page scrolling when portal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

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
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[10000]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-4 left-2 right-2 md:left-4 md:right-auto md:w-96 max-h-[90vh] overflow-y-auto music-portal-scroll bg-gradient-to-b from-purple-900 to-pink-900 shadow-2xl z-[10001] p-4 md:p-6 rounded-lg text-white transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
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
                    <div className="w-10 h-10 rounded-full bg-purple-500"></div>
                    <div>
                      <p className="font-medium">Loading artists...</p>
                      <p className="text-sm text-purple-200">Please wait</p>
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
                <span>47.2M</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Growth:</span>
                <span>+23%</span>
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
