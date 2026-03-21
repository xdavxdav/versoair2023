import { useState, useEffect } from "react";

/** Live statistics for the About page — fetched from real API endpoints */
export interface CategoryStat {
  name: string;
  count: number;
  growth: string;
  status: "healthy" | "warning";
  last_updated: string;
}

export interface OverallStats {
  total_businesses: number;
  active_businesses: number;
  total_categories: number;
  avg_rating: number;
  total_reviews: number;
  max_rating: number;
}

export interface MusicStats {
  totalArtists: number;
  totalTracks: number;
  totalStreams: number;
}

export interface DatabaseStats {
  totalRecords: number;
  activeTables: number;
}

export interface AboutStats {
  categoryStats: CategoryStat[];
  overallStats: OverallStats | null;
  musicStats: MusicStats | null;
  dbStats: DatabaseStats | null;
  topLocations: { location: string; count: number }[];
  loading: boolean;
  error: string | null;
}

export function useAboutStats(): AboutStats {
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [musicStats, setMusicStats] = useState<MusicStats | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [topLocations, setTopLocations] = useState<
    { location: string; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all endpoints in parallel
        const [categoryRes, statsRes, musicRes, dbRes, businessesRes] =
          await Promise.allSettled([
            fetch("/api/manage/database/business-types"),
            fetch("/api/businesses/stats/summary"),
            fetch("/api/music/analytics"),
            fetch("/api/admin/database-stats"),
            fetch("/api/businesses?limit=100"),
          ]);

        // Parse category stats
        if (categoryRes.status === "fulfilled" && categoryRes.value.ok) {
          const data = await categoryRes.value.json();
          setCategoryStats(Array.isArray(data) ? data : []);
        }

        // Parse overall stats (API returns strings, convert to numbers)
        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const json = await statsRes.value.json();
          const d = json?.data;
          if (d) {
            setOverallStats({
              total_businesses: Number(d.total_businesses) || 0,
              active_businesses: Number(d.active_businesses) || 0,
              total_categories: Number(d.total_categories) || 0,
              avg_rating: parseFloat(d.avg_rating) || 0,
              total_reviews: Number(d.total_reviews) || 0,
              max_rating: parseFloat(d.max_rating) || 0,
            });
          }
        }

        // Parse music stats
        if (musicRes.status === "fulfilled" && musicRes.value.ok) {
          const json = await musicRes.value.json();
          const d = json?.data;
          if (d) {
            setMusicStats({
              totalArtists: Number(d.totalArtists) || 0,
              totalTracks: Number(d.totalTracks) || 0,
              totalStreams: Number(d.totalStreams) || 0,
            });
          }
        }

        // Parse DB stats
        if (dbRes.status === "fulfilled" && dbRes.value.ok) {
          const json = await dbRes.value.json();
          if (json) {
            setDbStats({
              totalRecords: Number(json.totalRecords) || 0,
              activeTables: Number(json.activeTables) || 0,
            });
          }
        }

        // Parse top locations from businesses
        if (businessesRes.status === "fulfilled" && businessesRes.value.ok) {
          const json = await businessesRes.value.json();
          const businesses = json?.data || json || [];
          if (Array.isArray(businesses) && businesses.length > 0) {
            const locationMap: Record<string, number> = {};
            businesses.forEach((b: any) => {
              const loc = b.location || "Unknown";
              locationMap[loc] = (locationMap[loc] || 0) + 1;
            });
            const sorted = Object.entries(locationMap)
              .map(([location, count]) => ({ location, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
            setTopLocations(sorted);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch statistics";
        setError(message);
        console.error("Error fetching about page stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return {
    categoryStats,
    overallStats,
    musicStats,
    dbStats,
    topLocations,
    loading,
    error,
  };
}
