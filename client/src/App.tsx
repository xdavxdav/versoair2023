import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import InactivityGuard from "@/components/InactivityGuard";
import { useState, useEffect, useRef } from "react";
import { trackPageView, initializeGTMSession } from "./lib/gtag-tracking";

// ─────────────────────────────────────────────────────
// 🏠 Public Pages
// ─────────────────────────────────────────────────────
import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Demo from "@/pages/demo";
import Industries from "@/pages/industries";
import Pricing from "@/pages/pricing";
import Blog from "@/pages/blog";
import FaqPage from "@/pages/faq";
import Profile from "@/pages/profile";
import Marketplace from "@/pages/marketplace";
import Partners from "@/pages/partners";
import SystemStatus from "@/pages/status";
import GetInvolved from "@/pages/get-involved";
import ArtiHumanFoundation from "@/pages/artihuman-foundation";
import Impact from "@/pages/impact";
import HubPage from "@/pages/hub";
import NotFound from "@/pages/not-found";

// ─────────────────────────────────────────────────────
// 🏢 Sector Pages (top-level for SEO)
// ─────────────────────────────────────────────────────
import Commerce from "@/pages/commerce";
import Hotellerie from "@/pages/hotellerie";
import Batiment from "@/pages/batiment";
import Automobile from "@/pages/automobile";
import Finances from "@/pages/finances";
import Divertissement from "@/pages/divertissement";
import Sante from "@/pages/sante";
import Logement from "@/pages/logement";
import Reservations from "@/pages/reservations";
import BusinessesDirectory from "@/pages/businesses-directory";
import BusinessDetail from "@/pages/business-detail";
import CategoryDetail from "@/pages/category-detail";
import AnnuaireTV from "@/pages/annuaire-tv";
import DatabaseResults from "@/pages/database-results";

// ─────────────────────────────────────────────────────
// 📋 Services & Careers
// ─────────────────────────────────────────────────────
import Services from "@/pages/services";
import News from "@/pages/services/news";
import Careers from "@/pages/services/careers";
import Contractors from "@/pages/services/contractors";
import Contracts from "@/pages/contracts";
import Tickets from "@/pages/tickets";

// ─────────────────────────────────────────────────────
// 🎨 Cultural & Artisan Portal
// ─────────────────────────────────────────────────────
import ArtisansDirectory from "@/pages/artisans";
import CulturalPrograms from "@/pages/programs";
import Communities from "@/pages/communities";
import CommunityDetail from "@/pages/community";
import ArtisanWorkshops from "@/pages/artisan-workshops";
import ArtistPortalWelcome from "@/pages/artist-portal-welcome";
import ArtistPortalDashboard from "@/pages/artist-portal";
import ArtistPortalGate from "@/components/ArtistPortalGate";
import ArtistDirectory from "@/pages/artist-directory";
import OngCulturelle from "@/pages/ong-culturelle";

// ─────────────────────────────────────────────────────
// 🔐 Authentication
// ─────────────────────────────────────────────────────
import SignIn from "@/pages/signin";
import SignInSimple from "@/pages/signin-simple";
import OAuthComplete from "@/pages/oauth-complete";
import PasswordPage from "@/pages/password";
import ApplyPage from "@/pages/apply";

// ─────────────────────────────────────────────────────
// 🌍 Geo Admin Portal (subscriber-gated)
// ─────────────────────────────────────────────────────
import GeoAdminPage from "@/pages/geo-admin";
import BusinessVerification from "@/pages/business-verification";
import ImmobilierPortal from "@/pages/immobilier-portal";
import CredentialsVault from "@/pages/credentials-vault";

// ─────────────────────────────────────────────────────
// 🛡️ Admin HQ (internal platform management)
// ─────────────────────────────────────────────────────
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/dashboard-admin";
import DatabaseManagementCenter from "@/components/DatabaseManagementCenter";
import VerificationPage from "@/pages/admin/verification";
import AdminTicketManagement from "@/pages/admin/ticket-management";
import StreamRoyaleAdmin from "@/pages/streamroyale-admin";
import ArtistContractsAdmin from "@/pages/admin/artist-contracts";

// ─────────────────────────────────────────────────────
// 🔒 Route Guards
// ─────────────────────────────────────────────────────
import ProtectedRoute from "@/components/ProtectedRoute";

// ─────────────────────────────────────────────────────
// ❓ Help & Support
// ─────────────────────────────────────────────────────
import SAV from "@/pages/sav";
import VersoAI from "@/pages/versoai";
import HelpCenter from "@/pages/help";
import AccountHelp from "@/pages/help/account";
import PaymentsHelp from "@/pages/help/payments";
import DeliveryHelp from "@/pages/help/delivery";
import ProductHelp from "@/pages/help/product";
import ReturnsHelp from "@/pages/help/returns";
import GuaranteeHelp from "@/pages/help/guarantee";

// ─────────────────────────────────────────────────────
// 💳 Billing & Ads
// ─────────────────────────────────────────────────────
import BillingPage from "@/pages/billing";
import CardVaultPage from "@/pages/card-vault";
import AdCampaignsPage from "@/pages/ad-campaigns";

// ─────────────────────────────────────────────────────
// �📖 Developer & Docs
// ─────────────────────────────────────────────────────
import APIDocumentation from "@/pages/api";
import Documentation from "@/pages/docs";
import APITestPage from "@/pages/api-test";

// ─────────────────────────────────────────────────────
// 👥 Team & Sponsors
// ─────────────────────────────────────────────────────
import TeamMember from "@/pages/team-member";
import Sponsor from "@/pages/sponsor";
import SponsorsDirectory from "@/pages/sponsors-directory";
import Sponsorship from "@/pages/sponsorship";
import MusicPortal from "@/components/ui/music-portal";

// ─────────────────────────────────────────────────────
// 🎧 Streaming Platform
// ─────────────────────────────────────────────────────
import { AudioProvider } from "@/lib/audio-context";
import AudioPlayer from "@/components/audio/AudioPlayer";
import StreamPage from "@/pages/stream";
import TrackDetailPage from "@/pages/track-detail";
import ArtistCataloguePage from "@/pages/artist-catalogue";
import LibraryPage from "@/pages/library";
import AnalyticsStreamingPage from "@/pages/analytics-streaming";

// ─────────────────────────────────────────────────────
// 🧩 Layout Components
// ─────────────────────────────────────────────────────
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import LocationPanel from "@/components/ui/location-panel";
import BlogNavbar from "@/components/BlogNavbar";
import LoadingEagle from "@/components/ui/loading-eagle";
import PullToRefresh from "@/components/PullToRefresh";
import TestimonialsFloating from "@/components/ui/testimonials-floating";
import { TeamSection } from "@/components/ui/team-section";
import { SponsorsSection } from "@/components/ui/sponsors-section";
import { MobileMenuBubble } from "@/components/ui/mobile-menu-bubble";
import { CountryDropdown } from "@/components/CountryDropdown";
import { LoadingProvider, useLoading } from "@/hooks/use-loading";

function Router() {
  const [location] = useLocation();
  const { showEagleLoader } = useLoading();
  const [previousLocation, setPreviousLocation] = useState(location);
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (location !== previousLocation) {
      // Skip eagle loader for artist portal routes — they have their own cinematic transitions
      const isArtistPortalNav =
        location.startsWith("/artist-portal") ||
        previousLocation.startsWith("/artist-portal");
      if (!isArtistPortalNav) {
        showEagleLoader();
      }
      setPreviousLocation(location);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location, previousLocation, showEagleLoader]);

  return (
    <Switch>
      {/* ═══════════════════════════════════════════════
          🏠 PUBLIC — Marketing & informational pages
          ═══════════════════════════════════════════════ */}
      <Route path="/" component={Home} />
      <Route path="/hub" component={HubPage} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/demo" component={Demo} />
      <Route path="/industries" component={Industries} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/blog" component={Blog} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/partners" component={Partners} />
      <Route path="/status" component={SystemStatus} />
      <Route path="/get-involved" component={GetInvolved} />
      <Route path="/ong-culturelle" component={OngCulturelle} />
      <Route path="/artihuman-foundation" component={ArtiHumanFoundation} />
      <Route path="/impact" component={Impact} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/account/billing">
        {() => <ProtectedRoute component={BillingPage} />}
      </Route>
      <Route path="/account/cards">
        {() => <ProtectedRoute component={CardVaultPage} />}
      </Route>
      <Route path="/ad-campaigns" component={AdCampaignsPage} />

      {/* ═══════════════════════════════════════════════
          🏢 SECTORS — Top-level for SEO & branding
          ═══════════════════════════════════════════════ */}
      <Route path="/commerce" component={Commerce} />
      <Route path="/hotellerie" component={Hotellerie} />
      <Route path="/batiment" component={Batiment} />
      <Route path="/automobile" component={Automobile} />
      <Route path="/finances" component={Finances} />
      <Route path="/divertissement" component={Divertissement} />
      <Route path="/sante" component={Sante} />
      <Route path="/logement" component={Logement} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/businesses-directory" component={BusinessesDirectory} />
      <Route path="/business/:id" component={BusinessDetail} />
      <Route path="/category/:slug" component={CategoryDetail} />
      <Route path="/annuaire-tv" component={AnnuaireTV} />
      <Route path="/database-results" component={DatabaseResults} />

      {/* ═══════════════════════════════════════════════
          📋 SERVICES — Platform utilities & careers
          ═══════════════════════════════════════════════ */}
      <Route path="/services" component={Services} />
      <Route path="/services/news" component={News} />
      <Route path="/services/careers" component={Careers} />
      <Route path="/services/contractors" component={Contractors} />
      <Route path="/contracts" component={Contracts} />

      {/* ═══════════════════════════════════════════════
          🎨 CULTURAL — Artisan & community portal
          ═══════════════════════════════════════════════ */}
      <Route path="/artisans" component={ArtisansDirectory} />
      <Route path="/artistes" component={ArtistDirectory} />
      <Route path="/artist-portal">
        {() => (
          <ProtectedRoute
            component={() => (
              <ArtistPortalGate>
                <ArtistPortalWelcome />
              </ArtistPortalGate>
            )}
          />
        )}
      </Route>
      <Route path="/artist-portal/dashboard">
        {() => (
          <ProtectedRoute
            component={() => (
              <ArtistPortalGate>
                <ArtistPortalDashboard />
              </ArtistPortalGate>
            )}
          />
        )}
      </Route>
      <Route path="/programs" component={CulturalPrograms} />
      <Route path="/communities" component={Communities} />
      <Route path="/community" component={CommunityDetail} />
      <Route path="/artisan-workshops" component={ArtisanWorkshops} />

      {/* ═══════════════════════════════════════════════
          🔐 AUTH — Sign in & registration
          ═══════════════════════════════════════════════ */}
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth/login" component={SignInSimple} />
      <Route path="/auth/oauth-complete" component={OAuthComplete} />
      {/* Development only: Credentials vault */}
      {import.meta.env.DEV ? (
        <Route path="/auth/password" component={PasswordPage} />
      ) : null}
      {/* Legacy redirects */}
      <Route path="/signin">{() => <Redirect to="/auth/signin" />}</Route>
      <Route path="/signin-simple">{() => <Redirect to="/auth/login" />}</Route>

      {/* ═══════════════════════════════════════════════
          🎯 UNIFIED APPLY PAGE — Portal selection & registration
          ═══════════════════════════════════════════════ */}
      <Route path="/apply" component={ApplyPage} />

      {/* ═══════════════════════════════════════════════
          🌍 GEO ADMIN — Subscriber portal (auth required)
          ═══════════════════════════════════════════════ */}
      <Route path="/geo-admin">
        {() => <ProtectedRoute component={GeoAdminPage} />}
      </Route>
      <Route path="/geo-admin/business-verification">
        {() => <ProtectedRoute component={BusinessVerification} />}
      </Route>
      <Route path="/geo-admin/immobilier">
        {() => <ProtectedRoute component={ImmobilierPortal} />}
      </Route>
      <Route path="/geo-admin/dashboard">
        {() => (
          <ProtectedRoute
            component={AdminDashboard}
            roles={["admin", "moderator"]}
          />
        )}
      </Route>

      {/* ═══════════════════════════════════════════════
          🛡️ ADMIN HQ — Internal platform management (admin/superuser only)
          ═══════════════════════════════════════════════ */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute
            component={Dashboard}
            roles={["admin", "moderator"]}
          />
        )}
      </Route>
      <Route path="/admin/database">
        {() => (
          <ProtectedRoute
            component={DatabaseManagementCenter}
            roles={["admin"]}
          />
        )}
      </Route>
      <Route path="/admin/verification">
        {() => (
          <ProtectedRoute component={VerificationPage} roles={["admin"]} />
        )}
      </Route>
      <Route path="/admin/tickets">
        {() => (
          <ProtectedRoute
            component={AdminTicketManagement}
            roles={["admin", "moderator"]}
          />
        )}
      </Route>
      <Route path="/admin/streamroyale">
        {() => (
          <ProtectedRoute component={StreamRoyaleAdmin} roles={["admin"]} />
        )}
      </Route>
      <Route path="/admin/contracts">
        {() => (
          <ProtectedRoute component={ArtistContractsAdmin} roles={["admin"]} />
        )}
      </Route>
      {/* 🔐 Superuser-only credentials vault — secret path, no nav links */}
      <Route path="/sys/0x7f3a9c">
        {() => (
          <ProtectedRoute component={CredentialsVault} roles={["superuser"]} />
        )}
      </Route>

      {/* ═══════════════════════════════════════════════
          ❓ HELP & SUPPORT
          ═══════════════════════════════════════════════ */}
      <Route path="/sav" component={SAV} />
      <Route path="/versoai" component={VersoAI} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/help/account" component={AccountHelp} />
      <Route path="/help/payments" component={PaymentsHelp} />
      <Route path="/help/delivery" component={DeliveryHelp} />
      <Route path="/help/product" component={ProductHelp} />
      <Route path="/help/returns" component={ReturnsHelp} />
      <Route path="/help/guarantee" component={GuaranteeHelp} />

      {/* ═══════════════════════════════════════════════
          📖 DEVELOPER & DOCS
          ═══════════════════════════════════════════════ */}
      <Route path="/api" component={APIDocumentation} />
      <Route path="/api-test" component={APITestPage} />
      <Route path="/docs" component={Documentation} />

      {/* ═══════════════════════════════════════════════
          👥 TEAM & SPONSORS
          ═══════════════════════════════════════════════ */}
      <Route path="/team/:memberId" component={TeamMember} />
      <Route path="/sponsor" component={SponsorsDirectory} />
      <Route path="/sponsor/:sponsorId" component={Sponsor} />
      <Route path="/sponsorship" component={Sponsorship} />

      {/* ═══════════════════════════════════════════════
          🔁 LEGACY REDIRECTS — Keep old bookmarks alive
          ═══════════════════════════════════════════════ */}
      <Route path="/support">{() => <Redirect to="/sav" />}</Route>
      <Route path="/explore">{() => <Redirect to="/about" />}</Route>
      <Route path="/sectors">{() => <Redirect to="/about" />}</Route>
      <Route path="/careers">{() => <Redirect to="/services/careers" />}</Route>

      {/* ═══════════════════════════════════════════════
          🎧 STREAMING — Verso Air Stream platform
          ═══════════════════════════════════════════════ */}
      <Route path="/stream" component={StreamPage} />
      <Route path="/track/:id" component={TrackDetailPage} />
      <Route path="/artist-catalogue/:id" component={ArtistCataloguePage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/analytics" component={AnalyticsStreamingPage} />

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingOverlay() {
  const { isLoading, isFadingOut } = useLoading();
  if (!isLoading) return null;

  return (
    <div className={`page-loading-overlay ${isFadingOut ? "fade-out" : ""}`}>
      <div className="loading-shimmer-bar" />
      <div className="text-center">
        <LoadingEagle className="w-44 h-44 mb-2 mx-auto" />
        <p className="text-white/90 text-sm font-medium tracking-wide mt-3 animate-pulse">
          Verso Air
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const [isMusicPortalOpen, setIsMusicPortalOpen] = useState(false);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const { isLoading, isFadingOut } = useLoading();
  const [currentPath] = useLocation();
  const isHomePage = currentPath === "/" || currentPath === "";

  // Track when loading just finished so we can apply page-enter animation
  const [pageEnter, setPageEnter] = useState(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading && !isFadingOut) {
      wasLoading.current = true;
    }
    if (!isLoading && wasLoading.current) {
      wasLoading.current = false;
      setPageEnter(true);
      const t = setTimeout(() => setPageEnter(false), 500);
      return () => clearTimeout(t);
    }
  }, [isLoading, isFadingOut]);

  // Hide-on-scroll-down / show-on-scroll-up for the fixed header
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Measure the header height dynamically
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current && currentY > 60) {
        setHeaderVisible(false);
      } else if (currentY < lastScrollY.current) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize GTM and track page views
  useEffect(() => {
    initializeGTMSession();
    trackPageView(currentPath);
  }, [currentPath]);

  // Listen for marketplace modal open/close to hide BlogNavbar
  const [marketplaceModalOpen, setMarketplaceModalOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail?.open);
      setMarketplaceModalOpen(open);
    };
    window.addEventListener("marketplace-modal", handler);
    return () => window.removeEventListener("marketplace-modal", handler);
  }, []);

  // Listen for VersoAI fullscreen to hide the fixed header
  const [versoaiFullscreen, setVersoaiFullscreen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const fs = Boolean((e as CustomEvent).detail?.fullscreen);
      setVersoaiFullscreen(fs);
    };
    window.addEventListener("versoai-fullscreen", handler);
    return () => window.removeEventListener("versoai-fullscreen", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Fixed Header Block: amber top bar + scrolling ticker ── */}
      {!versoaiFullscreen && (
        <div
          ref={headerRef}
          className={`fixed top-0 left-0 right-0 z-[60] flex flex-col transition-transform duration-300 ${
            headerVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {/* Top Banner */}
          <div
            className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-1 px-2 sm:px-4"
            style={{ overflow: "visible" }}
          >
            <div
              className="max-w-7xl mx-auto flex items-center text-[10px] sm:text-xs gap-2"
              style={{ overflow: "visible" }}
            >
              {/* Left: Portal label */}
              <span className="font-medium flex-1 min-w-0 truncate">
                Business Intelligence Portal
              </span>

              {/* Center: Country filter dropdown */}
              <div className="flex-shrink-0" style={{ overflow: "visible" }}>
                <CountryDropdown />
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 justify-end">
                <button
                  onClick={() => setIsMusicPortalOpen(!isMusicPortalOpen)}
                  className="hover:text-amber-200 transition-colors flex items-center space-x-1"
                >
                  <span>🎵</span>
                  <span className="hidden sm:inline">Verso Air</span>
                  <span className="sm:hidden">VA</span>
                </button>
                <button
                  onClick={() => setIsLocationPanelOpen(!isLocationPanelOpen)}
                  className="hover:text-amber-200 transition-colors flex items-center space-x-1"
                >
                  <span>📍</span>
                  <span className="hidden sm:inline">GPS Services</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scrolling ticker — always visible while sticky block is on screen */}
          {currentPath !== "/blog" && currentPath !== "/marketplace" && (
            <div className="bg-primary text-white py-1.5 md:py-2 text-xs md:text-sm overflow-hidden transition-all duration-300 ease-in-out">
              <div className="animate-scroll-continuous flex">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-shrink-0">
                    <span className="flex-shrink-0 px-4 md:px-8">
                      Welcome to Verso Air ™️ — Business Intelligence Platform
                    </span>
                    <span className="flex-shrink-0 px-4 md:px-8">
                      Analyze • Optimize • Visualize • Grow
                    </span>
                    <span className="hidden sm:inline-flex flex-shrink-0 px-4 md:px-8">
                      24 Industry Sectors • Live Analytics • Global Coverage
                    </span>
                    <span className="hidden md:inline-flex flex-shrink-0 px-8">
                      Commerce • Hospitality • Construction • Automotive •
                      Finance • Entertainment
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blog Navbar — sits right under the amber banner on /blog and /marketplace */}
          {(currentPath === "/blog" || currentPath === "/marketplace") &&
            !marketplaceModalOpen && <BlogNavbar />}
        </div>
      )}
      {/* Spacer for fixed header */}
      {!versoaiFullscreen && <div style={{ height: headerHeight }} />}

      <PullToRefresh />
      <MobileMenuBubble />
      <div
        className={`hidden md:block transition-opacity duration-300 ${
          isLoading && !isFadingOut
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <Navbar
          onMusicPortalToggle={() => setIsMusicPortalOpen(!isMusicPortalOpen)}
          onLocationPanelToggle={() =>
            setIsLocationPanelOpen(!isLocationPanelOpen)
          }
          isMusicPortalOpen={isMusicPortalOpen}
          isLocationPanelOpen={isLocationPanelOpen}
        />
      </div>

      {/* Side Panels */}
      <LocationPanel
        isOpen={isLocationPanelOpen}
        onClose={() => setIsLocationPanelOpen(false)}
      />
      <MusicPortal
        isOpen={isMusicPortalOpen}
        onClose={() => setIsMusicPortalOpen(false)}
      />

      {/* Loading */}
      <LoadingOverlay />

      {/* Main Router */}
      <main
        className={`flex-1 overflow-x-hidden transition-opacity duration-300 ${
          isLoading && !isFadingOut
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        } ${pageEnter ? "page-enter" : ""}`}
      >
        <Router />
      </main>

      {/* Bottom Sections — home page only */}
      {isHomePage && (
        <>
          <TestimonialsFloating />
          <TeamSection />
          <SponsorsSection />
        </>
      )}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <>
      <style>{`
        html {
          scrollbar-gutter: stable;
        }
      `}</style>
      <QueryClientProvider client={queryClient}>
        <CountryProvider>
          <AuthProvider>
            <TooltipProvider>
              <LoadingProvider>
                <AudioProvider>
                  <AppContent />
                  <AudioPlayer />
                </AudioProvider>
                <InactivityGuard />
                <Toaster />
              </LoadingProvider>
            </TooltipProvider>
          </AuthProvider>
        </CountryProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
