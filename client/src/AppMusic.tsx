import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import InactivityGuard from "@/components/InactivityGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  Suspense,
  lazy,
} from "react";
import QuickSignIn from "@/components/QuickSignIn";
import { LanguageProvider } from "@/components/LanguageSwitcher";
import { LoadingProvider, useLoading } from "@/hooks/use-loading";
import { AudioProvider } from "@/lib/audio-context";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { MusicNavbar } from "@/components/music/MusicNavbar";
import { PageLoader, LoadingOverlay } from "@/components/ui/app-loader";
import NavigationProgress from "@/components/ui/NavigationProgress";
import PullToRefresh from "@/components/PullToRefresh";
import { MobileMenuBubble } from "@/components/ui/mobile-menu-bubble";
import LocationPanel from "@/components/ui/location-panel";
import { CountryDropdown } from "@/components/CountryDropdown";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";
import MusicProtectedRoute from "@/components/music/MusicProtectedRoute";
import { MusicArtistRoute } from "@/components/music/MusicProtectedRoute";

// Auth
const SignIn = lazy(() => import("@/pages/signin"));
const SignInSimple = lazy(() => import("@/pages/signin-simple"));
const OAuthComplete = lazy(() => import("@/pages/oauth-complete"));
const PasswordPage = lazy(() => import("@/pages/password"));
const ApplyPage = lazy(() => import("@/pages/apply"));
const Profile = lazy(() => import("@/pages/profile"));

// Streaming
const StreamPage = lazy(() => import("@/pages/stream"));
const TrackDetailPage = lazy(() => import("@/pages/track-detail"));
const ArtistCataloguePage = lazy(() => import("@/pages/artist-catalogue"));
const LibraryPage = lazy(() => import("@/pages/library"));
const AnalyticsStreamingPage = lazy(
  () => import("@/pages/analytics-streaming"),
);
const ArenaContestPage = lazy(() => import("@/pages/arena-contest"));
const RevenuePulsePage = lazy(() => import("@/pages/revenue-pulse"));
const ArcadePage = lazy(() => import("@/pages/arcade"));
const ListenerPortal = lazy(() => import("@/pages/listener-portal"));
const StreamerPortal = lazy(() => import("@/pages/streamer-portal"));
const StreamRoyaleAdmin = lazy(() => import("@/pages/streamroyale-admin"));

// Artist Portal
const ArtistPortalWelcome = lazy(() => import("@/pages/artist-portal-welcome"));
const ArtistPortalDashboard = lazy(() => import("@/pages/artist-portal"));
const ArtistDirectory = lazy(() => import("@/pages/artist-directory"));
const ArtistPortalWelcomePage = (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <ArtistPortalWelcome {...props} />
  </Suspense>
);

// Music sub-pages
const MusicDashboard = lazy(() => import("@/pages/music/dashboard"));
const BeatmakerStudio = lazy(() => import("@/pages/music/beatmaker-studio"));
const VersaVidsStudio = lazy(() => import("@/pages/music/versavids-studio"));
const MusicVault = lazy(() => import("@/pages/music/vault"));
const MusicRoyalties = lazy(() => import("@/pages/music/royalties"));
const MusicLibrary = lazy(() => import("@/pages/music/library"));
const MusicSocial = lazy(() => import("@/pages/music/social"));
const MessengerLauncher = lazy(
  () => import("@/components/messenger/MessengerLauncher"),
);

function Router() {
  const [location] = useLocation();
  const [previousLocation, setPreviousLocation] = useState(location);
  const isInitialRender = useRef(true);
  useEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
  }, []);
  useLayoutEffect(() => {
    if (isInitialRender.current) {
      window.scrollTo(0, 0);
      isInitialRender.current = false;
      return;
    }
    if (location !== previousLocation) window.scrollTo(0, 0);
  }, [location, previousLocation]);
  useEffect(() => {
    setPreviousLocation(location);
  }, [location]);

  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/stream" />}</Route>
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth/login" component={SignInSimple} />
      <Route path="/auth/oauth-complete" component={OAuthComplete} />
      <Route path="/auth/password">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <PasswordPage />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/signin">{() => <Redirect to="/auth/signin" />}</Route>
      <Route path="/signin-simple">{() => <Redirect to="/auth/login" />}</Route>
      <Route path="/apply" component={ApplyPage} />
      <Route path="/profile">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Profile />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/stream" component={StreamPage} />
      <Route path="/track/:id" component={TrackDetailPage} />
      <Route path="/artist-catalogue/:id" component={ArtistCataloguePage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/analytics" component={AnalyticsStreamingPage} />
      <Route path="/arena" component={ArenaContestPage} />
      <Route path="/arena/:id" component={ArenaContestPage} />
      <Route path="/revenue-pulse" component={RevenuePulsePage} />
      <Route path="/arcade" component={ArcadePage} />
      <Route path="/listener-portal" component={ListenerPortal} />
      <Route path="/streamer-portal" component={StreamerPortal} />
      <Route path="/artistes" component={ArtistDirectory} />
      <Route path="/artist-portal/dashboard">
        <MusicProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <ArtistPortalDashboard />
          </Suspense>
        </MusicProtectedRoute>
      </Route>
      <Route path="/artist-portal" component={ArtistPortalWelcomePage} />
      <Route path="/music">
        <MusicProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicDashboard />
          </Suspense>
        </MusicProtectedRoute>
      </Route>
      <Route path="/music/dashboard">
        <MusicProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicDashboard />
          </Suspense>
        </MusicProtectedRoute>
      </Route>
      <Route path="/music/studio">
        <MusicArtistRoute>
          <Suspense fallback={<PageLoader />}>
            <BeatmakerStudio />
          </Suspense>
        </MusicArtistRoute>
      </Route>
      <Route path="/music/versavids">
        <MusicArtistRoute>
          <Suspense fallback={<PageLoader />}>
            <VersaVidsStudio />
          </Suspense>
        </MusicArtistRoute>
      </Route>
      <Route path="/versavids">
        <MusicArtistRoute>
          <Suspense fallback={<PageLoader />}>
            <VersaVidsStudio />
          </Suspense>
        </MusicArtistRoute>
      </Route>
      <Route path="/music/vault">
        <MusicArtistRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicVault />
          </Suspense>
        </MusicArtistRoute>
      </Route>
      <Route path="/music/royalties">
        <MusicArtistRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicRoyalties />
          </Suspense>
        </MusicArtistRoute>
      </Route>
      <Route path="/music/library">
        <MusicProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicLibrary />
          </Suspense>
        </MusicProtectedRoute>
      </Route>
      <Route path="/music/social">
        <MusicProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <MusicSocial />
          </Suspense>
        </MusicProtectedRoute>
      </Route>
      <Route path="/music/favorites">{() => <Redirect to="/library" />}</Route>
      <Route path="/music/insights">{() => <Redirect to="/analytics" />}</Route>
      <Route path="/music/live">{() => <Redirect to="/stream" />}</Route>
      <Route path="/music/settings">{() => <Redirect to="/profile" />}</Route>
      <Route path="/music/upgrade">{() => <Redirect to="/apply" />}</Route>
      <Route path="/streamroyale">{() => <Redirect to="/arena" />}</Route>
      <Route path="/royale">{() => <Redirect to="/arena" />}</Route>
      <Route path="/beatmaker">{() => <Redirect to="/music/studio" />}</Route>
      <Route path="/streamroyale-admin">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <StreamRoyaleAdmin />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const [showQuickSignIn, setShowQuickSignIn] = useState(false);
  const { isLoading, isFadingOut } = useLoading();
  const [pageEnter, setPageEnter] = useState(false);
  const wasLoading = useRef(false);


  useEffect(() => {
    if (isLoading && !isFadingOut) wasLoading.current = true;
    if (!isLoading && wasLoading.current) {
      setPageEnter(true);
      wasLoading.current = false;
      setTimeout(() => setPageEnter(false), 600);
    }
  }, [isLoading, isFadingOut]);

  const mainSiteUrl =
    (window as any).__APP_CONFIG__?.siblingUrl ||
    (import.meta as any).env?.VITE_MAIN_URL ||
    window.location.origin;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex flex-col"
        style={{ overflow: "visible" }}
      >
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 text-white h-7 px-2 flex items-center">
          <div
            className="max-w-7xl mx-auto flex items-center text-[10px] gap-2 w-full"
            style={{ overflow: "visible" }}
          >
            <span className="font-medium notranslate" translate="no">
              🎵 Verso Air Musical Universe
            </span>
            <div className="flex-shrink-0" style={{ overflow: "visible" }}>
              <CountryDropdown />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 justify-end">
              <button
                onClick={() => {
                  window.location.href = mainSiteUrl;
                }}
                className="hover:text-purple-200 transition-colors flex items-center space-x-1 text-[10px]"
              >
                <span>🏢</span>
                <span className="hidden sm:inline">Business Platform</span>
                <span className="sm:hidden">FSA</span>
              </button>
              <button
                onClick={() => setIsLocationPanelOpen(!isLocationPanelOpen)}
                className="hover:text-purple-200 transition-colors flex items-center space-x-1"
              >
                <span>📍</span>
                <span className="hidden sm:inline">GPS Services</span>
              </button>
            </div>
          </div>
        </div>
        <MusicNavbar />
      </div>

      <PullToRefresh />
      <LocationPanel
        isOpen={isLocationPanelOpen}
        onClose={() => setIsLocationPanelOpen(false)}
      />
      <LoadingOverlay />

      <main
        className={`flex-1 min-h-screen overflow-x-hidden transition-opacity duration-300 ${isLoading && !isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"} ${pageEnter ? "page-enter" : ""}`}
      >
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
        </ErrorBoundary>
      </main>

      <MobileMenuBubble />
      <Suspense fallback={null}>
        <MessengerLauncher />
      </Suspense>
      <QuickSignIn
        open={showQuickSignIn}
        onClose={() => setShowQuickSignIn(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

function App() {
  return (
    <>
      <style>{`html { scrollbar-gutter: stable; }`}</style>
      <QueryClientProvider client={queryClient}>
        <CountryProvider>
          <LanguageProvider>
            <AuthProvider>
              <TooltipProvider>
                <LoadingProvider>
                  <AudioProvider>
                    <NavigationProgress />
                    <AppContent />
                    <AudioPlayer />
                  </AudioProvider>
                  <InactivityGuard />
                  <Toaster />
                </LoadingProvider>
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </CountryProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
