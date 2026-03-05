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
import ArtistPortalSignIn from "@/pages/artist-portal-signin";
import ArtistPortalDashboard from "@/pages/artist-portal";
import ArtistDirectory from "@/pages/artist-directory";
import OngCulturelle from "@/pages/ong-culturelle";

// ─────────────────────────────────────────────────────
// 🔐 Authentication
// ─────────────────────────────────────────────────────
import SignIn from "@/pages/signin";
import SignInSimple from "@/pages/signin-simple";
import PasswordPage from "@/pages/password";

// ─────────────────────────────────────────────────────
// 🌍 Geo Admin Portal (subscriber-gated)
// ─────────────────────────────────────────────────────
import GeoAdminPage from "@/pages/geo-admin";
import BusinessVerification from "@/pages/business-verification";
import ImmobilierPortal from "@/pages/immobilier-portal";

// ─────────────────────────────────────────────────────
// 🛡️ Admin HQ (internal platform management)
// ─────────────────────────────────────────────────────
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/dashboard-admin";
import DatabaseManagementCenter from "@/components/DatabaseManagementCenter";
import VerificationPage from "@/pages/admin/verification";
import AdminTicketManagement from "@/pages/admin/ticket-management";

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
// 🧩 Layout Components
// ─────────────────────────────────────────────────────
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import LocationPanel from "@/components/ui/location-panel";
import LoadingEagle from "@/components/ui/loading-eagle";
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
      showEagleLoader(800);
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
      <Route path="/profile" component={Profile} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/partners" component={Partners} />
      <Route path="/status" component={SystemStatus} />
      <Route path="/get-involved" component={GetInvolved} />
      <Route path="/ong-culturelle" component={OngCulturelle} />
      <Route path="/artihuman-foundation" component={ArtiHumanFoundation} />
      <Route path="/impact" component={Impact} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/account/billing" component={BillingPage} />
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
      <Route path="/artist-portal" component={ArtistPortalWelcome} />
      <Route path="/artist-portal/signin" component={ArtistPortalSignIn} />
      <Route
        path="/artist-portal/dashboard"
        component={ArtistPortalDashboard}
      />
      <Route path="/programs" component={CulturalPrograms} />
      <Route path="/communities" component={Communities} />
      <Route path="/community" component={CommunityDetail} />
      <Route path="/artisan-workshops" component={ArtisanWorkshops} />

      {/* ═══════════════════════════════════════════════
          🔐 AUTH — Sign in & registration
          ═══════════════════════════════════════════════ */}
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth/login" component={SignInSimple} />
      {/* Development only: Credentials vault */}
      {import.meta.env.DEV ? (
        <Route path="/auth/password" component={PasswordPage} />
      ) : null}
      {/* Legacy redirects */}
      <Route path="/signin">{() => <Redirect to="/auth/signin" />}</Route>
      <Route path="/signin-simple">{() => <Redirect to="/auth/login" />}</Route>

      {/* ═══════════════════════════════════════════════
          🌍 GEO ADMIN — Subscriber portal
          ═══════════════════════════════════════════════ */}
      <Route path="/geo-admin" component={GeoAdminPage} />
      <Route
        path="/geo-admin/business-verification"
        component={BusinessVerification}
      />
      <Route path="/geo-admin/immobilier" component={ImmobilierPortal} />
      <Route path="/geo-admin/dashboard" component={AdminDashboard} />

      {/* ═══════════════════════════════════════════════
          🛡️ ADMIN HQ — Internal platform management
          ═══════════════════════════════════════════════ */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin/database" component={DatabaseManagementCenter} />
      <Route path="/admin/verification" component={VerificationPage} />
      <Route path="/admin/tickets" component={AdminTicketManagement} />

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

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingOverlay() {
  const { isLoading } = useLoading();
  if (!isLoading) return null;

  return (
    <div className="page-loading-overlay">
      <div className="text-center">
        <LoadingEagle className="w-24 h-24 mb-4" />
        <p className="text-white text-lg font-semibold">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [isMusicPortalOpen, setIsMusicPortalOpen] = useState(false);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const { isLoading } = useLoading();
  const [currentPath] = useLocation();
  const isHomePage = currentPath === "/" || currentPath === "";

  // Initialize GTM and track page views
  useEffect(() => {
    initializeGTMSession();
    trackPageView(currentPath);
  }, [currentPath]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky Header Block: amber top bar + scrolling ticker ── */}
      <div className="sticky top-0 z-[60] flex flex-col">
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
            <span className="font-medium flex-1 truncate">
              Business Intelligence Portal
            </span>

            {/* Center: Country filter dropdown */}
            <CountryDropdown />

            {/* Right: Action buttons */}
            <div className="flex items-center space-x-3 flex-1 justify-end">
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
        {currentPath !== "/blog" && (
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
                    Commerce • Hospitality • Construction • Automotive • Finance
                    • Entertainment
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ── End Sticky Header Block ── */}

      <MobileMenuBubble />
      <div
        className={`hidden md:block transition-opacity duration-300 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
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
        className={`flex-1 transition-opacity duration-300 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
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
                <AppContent />
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
