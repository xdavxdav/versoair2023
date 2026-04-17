/**
 * MusicProtectedRoute — Auth gate for Musical Universe pages
 * Redirects unauthed users to /artist-portal (the welcome/auth page)
 */
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface MusicProtectedRouteProps {
  component: React.ComponentType;
}

export default function MusicProtectedRoute({
  component: Component,
}: MusicProtectedRouteProps) {
  const { user, loading } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/artist-portal");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return null; // Let the global PageLoader handle this
  }

  if (!user) {
    return null;
  }

  return <Component />;
}
