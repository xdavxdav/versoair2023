/**
 * MusicProtectedRoute — Auth gate for Musical Universe pages
 * Shows purple spinner during auth check, redirects to /artist-portal if unauthed
 *
 * MusicArtistRoute — Same + requires artist portal access (not for streamers)
 */
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMusicAccess } from "@/hooks/useMusicAccess";

interface MusicProtectedRouteProps {
  component?: React.ComponentType;
  children?: React.ReactNode;
}

function MusicSpinner() {
  return (
    <div className="min-h-screen bg-[#06020f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-white/30 text-xs tracking-widest uppercase">
          Musical Universe
        </p>
      </div>
    </div>
  );
}

export default function MusicProtectedRoute({
  component: Component,
  children,
}: MusicProtectedRouteProps) {
  const { user, loading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/artist-portal");
    }
  }, [loading, user, setLocation]);

  if (loading) return <MusicSpinner />;
  if (!user) return null;
  return Component ? <Component /> : <>{children}</>;
}

/**
 * Artist-only route — redirects streamers to /music/dashboard
 */
export function MusicArtistRoute({
  component: Component,
  children,
}: MusicProtectedRouteProps) {
  const { user, loading } = useAuthContext();
  const { isArtist, isLoading } = useMusicAccess();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/artist-portal");
      return;
    }
    if (!loading && !isLoading && user && !isArtist) {
      setLocation("/music/dashboard");
    }
  }, [loading, isLoading, user, isArtist, setLocation]);

  if (loading || isLoading) return <MusicSpinner />;
  if (!user || !isArtist) return null;
  return Component ? <Component /> : <>{children}</>;
}
