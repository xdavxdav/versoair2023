import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import InactivityGuard from "@/components/InactivityGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import { trackPageView, initializeGTMSession } from "./lib/gtag-tracking";
import ContentNav, { isContentNavPath } from "@/components/ContentNav";

// ─────────────────────────────────────────────────────
// 🏠 Public Pages (lazy-loaded — only fetched when navigated to)
// ─────────────────────────────────────────────────────
const Home = lazy(() => import("@/pages/home"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Demo = lazy(() => import("@/pages/demo"));
const Industries = lazy(() => import("@/pages/industries"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Blog = lazy(() => import("@/pages/blog"));
const FaqPage = lazy(() => import("@/pages/faq"));
const Profile = lazy(() => import("@/pages/profile"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const Partners = lazy(() => import("@/pages/partners"));
const SystemStatus = lazy(() => import("@/pages/status"));
const GetInvolved = lazy(() => import("@/pages/get-involved"));
const ArtiHumanFoundation = lazy(() => import("@/pages/artihuman-foundation"));
const Impact = lazy(() => import("@/pages/impact"));
const HubPage = lazy(() => import("@/pages/hub"));
const NotFound = lazy(() => import("@/pages/not-found"));

// ─────────────────────────────────────────────────────
// 🏢 Sector Pages (lazy-loaded)
// ─────────────────────────────────────────────────────
const Commerce = lazy(() => import("@/pages/commerce"));
const Hotellerie = lazy(() => import("@/pages/hotellerie"));
const Batiment = lazy(() => import("@/pages/batiment"));
const Automobile = lazy(() => import("@/pages/automobile"));
const Finances = lazy(() => import("@/pages/finances"));
const Divertissement = lazy(() => import("@/pages/divertissement"));
const Sante = lazy(() => import("@/pages/sante"));
const Logement = lazy(() => import("@/pages/logement"));
const Reservations = lazy(() => import("@/pages/reservations"));
const BusinessesDirectory = lazy(() => import("@/pages/businesses-directory"));
const BusinessDetail = lazy(() => import("@/pages/business-detail"));
const CategoryDetail = lazy(() => import("@/pages/category-detail"));
const AnnuaireTV = lazy(() => import("@/pages/annuaire-tv"));
const DatabaseResults = lazy(() => import("@/pages/database-results"));

// ─────────────────────────────────────────────────────
// 📋 Services & Careers (lazy-loaded)
// ─────────────────────────────────────────────────────
const Services = lazy(() => import("@/pages/services"));
const News = lazy(() => import("@/pages/services/news"));
const Careers = lazy(() => import("@/pages/services/careers"));
const Contractors = lazy(() => import("@/pages/services/contractors"));
const Contracts = lazy(() => import("@/pages/contracts"));
const Tickets = lazy(() => import("@/pages/tickets"));

// ─────────────────────────────────────────────────────
// 🎨 Cultural & Artisan Portal (lazy-loaded)
// ─────────────────────────────────────────────────────
const ArtisansDirectory = lazy(() => import("@/pages/artisans"));
const ArtisansPortal = lazy(() => import("@/pages/artisans-portal"));
const CulturalPrograms = lazy(() => import("@/pages/programs"));
const Communities = lazy(() => import("@/pages/communities"));
const CommunityDetail = lazy(() => import("@/pages/community"));
const ArtisanWorkshops = lazy(() => import("@/pages/artisan-workshops"));
const ArtistPortalWelcome = lazy(() => import("@/pages/artist-portal-welcome"));
const ArtistDirectory = lazy(() => import("@/pages/artist-directory"));

// Stable wrapper components — MUST be defined at module level (not inline)
// so React keeps the same component identity across re-renders.
const ArtistPortalWelcomePage = (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <ArtistPortalWelcome {...props} />
  </Suspense>
);
const OngCulturelle = lazy(() => import("@/pages/ong-culturelle"));

// ─────────────────────────────────────────────────────
// 🔐 Authentication (lazy-loaded)
// ─────────────────────────────────────────────────────
const SignIn = lazy(() => import("@/pages/signin"));
const SignInSimple = lazy(() => import("@/pages/signin-simple"));
const OAuthComplete = lazy(() => import("@/pages/oauth-complete"));
const PasswordPage = lazy(() => import("@/pages/password"));
const ApplyPage = lazy(() => import("@/pages/apply"));

// ─────────────────────────────────────────────────────
// 🌍 Geo Admin Portal (lazy-loaded)
// ─────────────────────────────────────────────────────
const GeoAdminPage = lazy(() => import("@/pages/geo-admin"));
const BusinessVerification = lazy(
  () => import("@/pages/business-verification"),
);
const ImmobilierPortal = lazy(() => import("@/pages/immobilier-portal"));
const CredentialsVault = lazy(() => import("@/pages/credentials-vault"));

// ─────────────────────────────────────────────────────
// 🛡️ Admin HQ (lazy-loaded)
// ─────────────────────────────────────────────────────
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminDashboard = lazy(() => import("@/pages/dashboard-admin"));
const DatabaseManagementCenter = lazy(
  () => import("@/components/DatabaseManagementCenter"),
);
const VerificationPage = lazy(() => import("@/pages/admin/verification"));
const AdminTicketManagement = lazy(
  () => import("@/pages/admin/ticket-management"),
);
const StreamRoyaleAdmin = lazy(() => import("@/pages/streamroyale-admin"));
const ArtistContractsAdmin = lazy(
  () => import("@/pages/admin/artist-contracts"),
);

// ─────────────────────────────────────────────────────
// 🔒 Route Guards (kept eager — lightweight)
// ─────────────────────────────────────────────────────
import ProtectedRoute from "@/components/ProtectedRoute";

// ─────────────────────────────────────────────────────
// ❓ Help & Support (lazy-loaded)
// ─────────────────────────────────────────────────────
const SAV = lazy(() => import("@/pages/sav"));
const VersoAI = lazy(() => import("@/pages/versoai"));
const HelpCenter = lazy(() => import("@/pages/help"));
const AccountHelp = lazy(() => import("@/pages/help/account"));
const PaymentsHelp = lazy(() => import("@/pages/help/payments"));
const DeliveryHelp = lazy(() => import("@/pages/help/delivery"));
const ProductHelp = lazy(() => import("@/pages/help/product"));
const ReturnsHelp = lazy(() => import("@/pages/help/returns"));
const GuaranteeHelp = lazy(() => import("@/pages/help/guarantee"));

// ─────────────────────────────────────────────────────
// 💳 Billing & Ads (lazy-loaded)
// ─────────────────────────────────────────────────────
const BillingPage = lazy(() => import("@/pages/billing"));
const CardVaultPage = lazy(() => import("@/pages/card-vault"));
const AdCampaignsPage = lazy(() => import("@/pages/ad-campaigns"));

// ─────────────────────────────────────────────────────
// 📖 Developer & Docs (lazy-loaded)
// ─────────────────────────────────────────────────────
const APIDocumentation = lazy(() => import("@/pages/api"));
const Documentation = lazy(() => import("@/pages/docs"));
const APITestPage = lazy(() => import("@/pages/api-test"));

// ─────────────────────────────────────────────────────
// ⚖️ Legal Pages (lazy-loaded)
// ─────────────────────────────────────────────────────
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsOfService = lazy(() => import("@/pages/terms"));
const CookiePolicy = lazy(() => import("@/pages/cookies"));
const GDPRCompliance = lazy(() => import("@/pages/gdpr"));
const InformationHub = lazy(() => import("@/pages/information"));

// ─────────────────────────────────────────────────────
// 👥 Team & Sponsors (lazy-loaded)
// ─────────────────────────────────────────────────────
const TeamMember = lazy(() => import("@/pages/team-member"));
const Sponsor = lazy(() => import("@/pages/sponsor"));
const SponsorsDirectory = lazy(() => import("@/pages/sponsors-directory"));
const Sponsorship = lazy(() => import("@/pages/sponsorship"));
import MusicPortal from "@/components/ui/music-portal";

// ─────────────────────────────────────────────────────
// 🎧 Streaming Platform (lazy-loaded)
// ─────────────────────────────────────────────────────
import { AudioProvider } from "@/lib/audio-context";
import AudioPlayer from "@/components/audio/AudioPlayer";
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

// ─────────────────────────────────────────────────────
// 🎹 Musical Universe (lazy-loaded)
// ─────────────────────────────────────────────────────
const MusicDashboard = lazy(() => import("@/pages/music/dashboard"));
const BeatmakerStudio = lazy(() => import("@/pages/music/beatmaker-studio"));
const MusicVault = lazy(() => import("@/pages/music/vault"));
const MusicRoyalties = lazy(() => import("@/pages/music/royalties"));

// ─────────────────────────────────────────────────────
// 📢 Marketing Platform (lazy-loaded)
// ─────────────────────────────────────────────────────
const MarketingHub = lazy(() => import("@/pages/marketing-hub"));
const JournalPage = lazy(() => import("@/pages/marketing-journal"));
const PacksPage = lazy(() => import("@/pages/marketing-packs"));
const PrintServicesPage = lazy(() => import("@/pages/marketing-print"));
const NewslettersPage = lazy(() => import("@/pages/marketing-newsletters"));
const CartPage = lazy(() => import("@/pages/marketing-cart"));
const OrderTrackingPage = lazy(() => import("@/pages/marketing-orders"));
const AdminPrintshop = lazy(() => import("@/pages/admin-printshop"));

// ─────────────────────────────────────────────────────
// 🧩 Layout Components
// ─────────────────────────────────────────────────────
import Footer from "@/components/ui/footer";
import Navbar from "@/components/ui/navbar";
import BlogNavbar from "@/components/BlogNavbar";
import LocationPanel from "@/components/ui/location-panel";
import { PageLoader, LoadingOverlay } from "@/components/ui/app-loader";
import NavigationProgress from "@/components/ui/NavigationProgress";
import PullToRefresh from "@/components/PullToRefresh";
import TestimonialsFloating from "@/components/ui/testimonials-floating";
import { TeamSection } from "@/components/ui/team-section";
import { SponsorsSection } from "@/components/ui/sponsors-section";
import { MobileMenuBubble } from "@/components/ui/mobile-menu-bubble";
import { CountryDropdown } from "@/components/CountryDropdown";
import { LanguageProvider } from "@/components/LanguageSwitcher";
import { LoadingProvider, useLoading } from "@/hooks/use-loading";
import { useGTRetranslate } from "@/hooks/use-gt-retranslate";

// Suspense fallback — matches the cinematic LoadingOverlay so there's
// Main loader — shown while lazy chunks download and on every navigation.
function Router() {
  const [location] = useLocation();
  const { showEagleLoader } = useLoading();
  const [previousLocation, setPreviousLocation] = useState(location);
  const isInitialRender = useRef(true);

  // Disable browser scroll restoration — we handle it ourselves
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Scroll to top BEFORE paint (useLayoutEffect) so the user never sees the footer
  useLayoutEffect(() => {
    if (isInitialRender.current) {
      // First render: also force top (handles direct-nav / refresh)
      window.scrollTo(0, 0);
      isInitialRender.current = false;
      return;
    }
    if (location !== previousLocation) {
      window.scrollTo(0, 0);
    }
  }, [location, previousLocation]);

  // Eagle loader + state update in a regular useEffect (non-blocking)
  useEffect(() => {
    if (location !== previousLocation) {
      const isArtistPortalNav =
        location.startsWith("/artist-portal") ||
        previousLocation.startsWith("/artist-portal");
      if (!isArtistPortalNav) {
        showEagleLoader();
      }
      setPreviousLocation(location);
    }
  }, [location, previousLocation, showEagleLoader]);

  // Re-trigger GT translation after every route change so new page content
  // gets translated (GT only translates on init — misses React-rendered pages)
  useGTRetranslate([location]);

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
      <Route path="/sell">{() => <Redirect to="/marketplace" />}</Route>
      <Route path="/orders">
        {() => <Redirect to="/marketing/order-tracking" />}
      </Route>
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
      <Route path="/artisans-portal" component={ArtisansPortal} />
      <Route path="/artistes" component={ArtistDirectory} />
      <Route path="/artist-portal" component={ArtistPortalWelcomePage} />
      <Route path="/artist-portal/dashboard">
        {() => <Redirect to="/music/dashboard" />}
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
      <Route path="/geo-admin" component={GeoAdminPage} />
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
            roles={["admin", "superuser", "moderator"]}
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
            roles={["admin", "superuser", "moderator"]}
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
          <ProtectedRoute component={AdminTicketManagement} roles={["admin"]} />
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
          ⚖️ LEGAL PAGES
          ═══════════════════════════════════════════════ */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route path="/gdpr" component={GDPRCompliance} />
      <Route path="/information" component={InformationHub} />

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
          📢 MARKETING — Journal, Packs, Print, Newsletters
          ═══════════════════════════════════════════════ */}
      <Route path="/marketing" component={MarketingHub} />
      <Route path="/marketing/journal" component={JournalPage} />
      <Route path="/marketing/packs" component={PacksPage} />
      <Route path="/marketing/print" component={PrintServicesPage} />
      <Route path="/marketing/newsletters" component={NewslettersPage} />
      <Route path="/marketing/cart" component={CartPage} />
      <Route path="/marketing/order-tracking">
        {() => <ProtectedRoute component={OrderTrackingPage} />}
      </Route>
      <Route path="/admin/printshop">
        {() => <ProtectedRoute component={AdminPrintshop} roles={["admin"]} />}
      </Route>

      {/* ═══════════════════════════════════════════════
          🎧 STREAMING — Verso Air Stream platform
          ═══════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════
          🎹 MUSICAL UNIVERSE — Creator ecosystem
          ═══════════════════════════════════════════════ */}
      <Route path="/music" component={MusicDashboard} />
      <Route path="/music/dashboard" component={MusicDashboard} />
      <Route path="/music/studio" component={BeatmakerStudio} />
      <Route path="/music/vault" component={MusicVault} />
      <Route path="/music/royalties" component={MusicRoyalties} />
      {/* Analytics/Insights — redirect to main analytics for now */}
      <Route path="/music/insights">{() => <Redirect to="/analytics" />}</Route>
      {/* Live/Royale — redirect to arena/stream */}
      <Route path="/music/live">{() => <Redirect to="/stream" />}</Route>
      {/* Management routes — redirect to dashboard until dedicated pages */}
      <Route path="/music/projects">
        {() => <Redirect to="/music/dashboard" />}
      </Route>
      <Route path="/music/releases">
        {() => <Redirect to="/music/dashboard" />}
      </Route>
      <Route path="/music/planner">
        {() => <Redirect to="/music/dashboard" />}
      </Route>
      <Route path="/music/marketing">
        {() => <Redirect to="/music/dashboard" />}
      </Route>
      <Route path="/music/artists">{() => <Redirect to="/artistes" />}</Route>
      <Route path="/music/a-and-r">
        {() => <Redirect to="/music/dashboard" />}
      </Route>
      <Route path="/music/settings">{() => <Redirect to="/profile" />}</Route>
      <Route path="/music/upgrade">{() => <Redirect to="/apply" />}</Route>
      {/* StreamRoyale public access */}
      <Route path="/streamroyale">{() => <Redirect to="/arena" />}</Route>
      <Route path="/royale">{() => <Redirect to="/arena" />}</Route>
      {/* Redirects for legacy/alternate paths */}
      <Route path="/beatmaker">{() => <Redirect to="/music/studio" />}</Route>

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [isMusicPortalOpen, setIsMusicPortalOpen] = useState(false);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const { isLoading, isFadingOut } = useLoading();
  const [currentPath] = useLocation();
  const isHomePage = currentPath === "/" || currentPath === "";
  const isContentNavPage = isContentNavPath(currentPath);
  const isMusicPage =
    currentPath.startsWith("/music") ||
    currentPath.startsWith("/artist-portal") ||
    currentPath.startsWith("/stream") ||
    currentPath.startsWith("/streamer-portal") ||
    currentPath.startsWith("/listener-portal") ||
    currentPath.startsWith("/arcade") ||
    currentPath.startsWith("/arena");
  const { user } = useAuthContext();
  const isAuthed =
    !!user || localStorage.getItem("blog_community_auth") === "true";
  // Show ContentNav (bottom dock) on blog/marketplace pages for ALL users (authed or not)
  const showContentNav = isContentNavPage;
  const isAuthPage = currentPath.startsWith("/auth");
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
      {/* Hide on music pages (they have their own layout) */}
      {!versoaiFullscreen && !isMusicPage && (
        <div
          ref={headerRef}
          className="fixed top-0 left-0 right-0 z-[60] flex flex-col"
          style={{ overflow: "visible" }}
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
          {currentPath !== "/blog" &&
            currentPath !== "/marketplace" &&
            !isContentNavPage && (
              <div className="bg-primary text-white py-1.5 md:py-2 text-xs md:text-sm overflow-hidden transition-all duration-300 ease-in-out">
                <div className="animate-scroll-continuous flex">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-shrink-0">
                      <span className="flex-shrink-0 px-4 md:px-8">
                        Bienvenue sur Verso Air ™️ — Plateforme d'Intelligence
                        d'Affaires
                      </span>
                      <span className="flex-shrink-0 px-4 md:px-8">
                        Analyser • Optimiser • Visualiser • Croître
                      </span>
                      <span className="hidden sm:inline-flex flex-shrink-0 px-4 md:px-8">
                        24 Secteurs d'Industrie • Analytique en Direct •
                        Couverture Mondiale
                      </span>
                      <span className="hidden md:inline-flex flex-shrink-0 px-8">
                        Commerce • Hôtellerie • Construction • Automobile •
                        Finance • Divertissement
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Blog Navbar — shown on /blog and /marketplace when ContentNav is not active.
              Now visible on mobile too (no md:block restriction). */}
          {(currentPath === "/blog" || currentPath === "/marketplace") &&
            !marketplaceModalOpen &&
            !showContentNav && <BlogNavbar />}
        </div>
      )}
      {/* Spacer for fixed header — not needed on music pages */}
      {!versoaiFullscreen && !isMusicPage && (
        <div style={{ height: headerHeight }} />
      )}

      {/* ── Music Universe Navbar — shown on music/artist-portal pages ── */}
      {isMusicPage && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0a0512] border-b border-purple-500/20">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/music/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-white text-sm">♪</span>
              </div>
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  Musical Universe
                </span>
                <p className="text-[9px] text-white/40 -mt-0.5 hidden sm:block">
                  by VersoAir
                </p>
              </div>
            </a>
            <div className="flex items-center gap-2">
              {isAuthed ? (
                <a
                  href="/music/dashboard"
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 text-white hover:from-purple-500/30 hover:to-fuchsia-500/30 transition"
                >
                  Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/stream"
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                  >
                    Explore
                  </a>
                  <a
                    href="/auth/signin"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition"
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>
      )}
      {/* Spacer for music navbar */}
      {isMusicPage && <div className="h-14" />}

      <PullToRefresh />
      {showContentNav && <ContentNav />}
      {/* Main Navbar — hide on auth pages, ContentNav pages, and music pages */}
      {!isAuthPage && !showContentNav && !isMusicPage && (
        <div
          className={`hidden md:block transition-opacity duration-300 ${
            isLoading && !isFadingOut
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          <Navbar
            onMusicPortalToggle={() => setIsMusicPortalOpen((prev) => !prev)}
            onLocationPanelToggle={() =>
              setIsLocationPanelOpen((prev) => !prev)
            }
            isMusicPortalOpen={isMusicPortalOpen}
            isLocationPanelOpen={isLocationPanelOpen}
          />
        </div>
      )}

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
        } ${pageEnter ? "page-enter" : ""} ${showContentNav ? "pb-[80px]" : ""} ${isMusicPage ? "" : "pb-[68px]"}`}
      >
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom Sections — home page only */}
      {isHomePage && (
        <div>
          <TestimonialsFloating />
          <TeamSection />
          <SponsorsSection />
        </div>
      )}
      {/* Footer — hide on music pages (they have their own layout) */}
      {!isMusicPage && (
        <div>
          <Footer />
        </div>
      )}
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
