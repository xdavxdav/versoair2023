import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { Home as HomeIcon } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import { AudioProvider, useAudio } from "@/lib/audio-context";
import AudioPlayer from "@/components/audio/AudioPlayer";
import BetaBanner from "@/components/BetaBanner";
import InactivityGuard from "@/components/InactivityGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import ArtistPortalRedirect from "@/components/ArtistPortalRedirect";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import { trackPageView, initializeGTMSession } from "./lib/gtag-tracking";
import { isContentNavPath } from "@/components/ContentNav";
import { MUSIC_ROUTE_PREFIXES } from "@/lib/music-routes";
const ContentNav = lazy(() => import("@/components/ContentNav"));
import QuickSignIn from "@/components/QuickSignIn";

// ─────────────────────────────────────────────────────
// 🏠 Public Pages (lazy-loaded — only fetched when navigated to)
// ─────────────────────────────────────────────────────
// Home is loaded eagerly (not lazy) — it's the landing page almost every
// cold visit hits first, so lazy-loading it just adds an extra network
// round-trip behind the Suspense fallback, making the initial load feel
// much longer than it needs to be.
import Home from "@/pages/home";
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Demo = lazy(() => import("@/pages/demo"));
const Industries = lazy(() => import("@/pages/industries"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Blog = lazy(() => import("@/pages/blog"));
const FaqPage = lazy(() => import("@/pages/faq"));
const Profile = lazy(() => import("@/pages/profile"));
const UserProfile = lazy(() => import("@/pages/user-profile"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const Partners = lazy(() => import("@/pages/partners"));
const SystemStatus = lazy(() => import("@/pages/status"));
const GetInvolved = lazy(() => import("@/pages/get-involved"));
const ArtiHumanFoundation = lazy(() => import("@/pages/artihuman-foundation"));
const Impact = lazy(() => import("@/pages/impact"));
const HubPage = lazy(() => import("@/pages/hub"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ImportBusiness = lazy(() => import("@/pages/import-business"));

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
const ArtistPortalDashboard = lazy(() => import("@/pages/artist-portal"));
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
const PurgatoireAdmin = lazy(() => import("@/pages/admin/purgatoire"));
const ArtistContractsAdmin = lazy(
  () => import("@/pages/admin/artist-contracts"),
);
const InventoryDashboard = lazy(() => import("@/pages/inventory-dashboard"));

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
const PayPalPortal = lazy(() => import("@/pages/paypal-portal"));
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

// ─────────────────────────────────────────────────────
// 🎧 Streaming Platform (lazy-loaded)
// ─────────────────────────────────────────────────────
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
const VersaVidsStudio = lazy(() => import("@/pages/music/versavids-studio"));
const MusicVault = lazy(() => import("@/pages/music/vault"));
const MusicRoyalties = lazy(() => import("@/pages/music/royalties"));
const MusicLibrary = lazy(() => import("@/pages/music/library"));

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
const BlogNavbar = lazy(() => import("@/components/BlogNavbar"));
const LocationPanel = lazy(() => import("@/components/ui/location-panel"));
const MusicPortal = lazy(() => import("@/components/ui/music-portal"));
import { PageLoader, LoadingOverlay } from "@/components/ui/app-loader";
import NavigationProgress from "@/components/ui/NavigationProgress";
const PullToRefresh = lazy(() => import("@/components/PullToRefresh"));
const TestimonialsFloating = lazy(
  () => import("@/components/ui/testimonials-floating"),
);
const TeamSection = lazy(() =>
  import("@/components/ui/team-section").then((m) => ({
    default: m.TeamSection,
  })),
);
const SponsorsSection = lazy(() =>
  import("@/components/ui/sponsors-section").then((m) => ({
    default: m.SponsorsSection,
  })),
);
const MobileMenuBubble = lazy(() =>
  import("@/components/ui/mobile-menu-bubble").then((m) => ({
    default: m.MobileMenuBubble,
  })),
);
const MessengerLauncher = lazy(
  () => import("@/components/messenger/MessengerLauncher"),
);
import NotificationCenter from "@/components/NotificationCenter";
import { CountryDropdown } from "@/components/CountryDropdown";
import { LanguageProvider, useLanguage } from "@/components/LanguageSwitcher";
import { LoadingProvider, useLoading } from "@/hooks/use-loading";
import { useGTRetranslate } from "@/hooks/use-gt-retranslate";

const BETA_SCOPE_FREEZE = true;
const BETA_ROUTE_PREFIXES = [
  "/",
  "/about",
  "/businesses-directory",
  "/auth/",
  "/profile",
  "/dashboard",
  "/geo-admin",
  "/admin/",
  "/blog",
  "/faq",
];

function isBetaRoute(pathname: string) {
  return BETA_ROUTE_PREFIXES.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix),
  );
}

// Suspense fallback — matches the cinematic LoadingOverlay so there's
// Main loader — shown while lazy chunks download and on every navigation.
function Router() {
  const [location] = useLocation();
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

  // Update previous location for scroll-to-top tracking
  useEffect(() => {
    if (location !== previousLocation) {
      setPreviousLocation(location);
    }
  }, [location, previousLocation]);

  // Re-trigger GT translation after every route change so new page content
  // gets translated (GT only translates on init — misses React-rendered pages)
  useGTRetranslate([location]);

  if (BETA_SCOPE_FREEZE && !isBetaRoute(location)) {
    return <Redirect to="/" />;
  }

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
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/sell">{() => <Redirect to="/marketplace" />}</Route>
      <Route path="/orders">
        {() => <Redirect to="/marketing/order-tracking" />}
      </Route>
      <Route path="/partners" component={Partners} />
      <Route path="/import-business" component={ImportBusiness} />
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
      <Route path="/account/paypal">
        {() => <ProtectedRoute component={PayPalPortal} />}
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
      <Route path="/contracts">
        {() => <ProtectedRoute component={Contracts} />}
      </Route>

      {/* ═══════════════════════════════════════════════
          🎨 CULTURAL — Artisan & community portal
          ═══════════════════════════════════════════════ */}
      <Route path="/artisans" component={ArtisansDirectory} />
      <Route path="/artisans-portal" component={ArtisansPortal} />
      <Route path="/artistes" component={ArtistDirectory} />
      {/* On unified domain: /artist-portal renders welcome page directly (no cross-domain redirect) */}
      <Route path="/artist-portal" component={ArtistPortalWelcomePage} />
      <Route
        path="/artist-portal/welcome"
        component={ArtistPortalWelcomePage}
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
      <Route path="/geo-admin/immobilier">{() => <ImmobilierPortal />}</Route>
      <Route path="/geo-admin/dashboard">
        {() => (
          <ProtectedRoute
            component={AdminDashboard}
            roles={["admin", "superuser", "moderator", "tsr"]}
          />
        )}
      </Route>

      {/* ═══════════════════════════════════════════════
          🛡️ DASHBOARD — Unified portal dashboard (all authenticated users)
          ═══════════════════════════════════════════════ */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
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
      <Route path="/admin/purgatoire">
        {() => <ProtectedRoute component={PurgatoireAdmin} roles={["admin"]} />}
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

      {/* 📦 Inventory — sector-adaptive stock & product management dashboard */}
      <Route path="/inventory">
        {() => <ProtectedRoute component={InventoryDashboard} />}
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
      <Route path="/music">{() => <Redirect to="/music/dashboard" />}</Route>
      <Route path="/music/dashboard">
        {() => <ProtectedRoute component={MusicDashboard} />}
      </Route>
      <Route path="/music/studio">
        {() => <ProtectedRoute component={BeatmakerStudio} />}
      </Route>
      <Route path="/music/versavids">
        {() => <ProtectedRoute component={VersaVidsStudio} />}
      </Route>
      <Route path="/versavids">
        {() => <ProtectedRoute component={VersaVidsStudio} />}
      </Route>
      <Route path="/music/vault">
        {() => <ProtectedRoute component={MusicVault} />}
      </Route>
      <Route path="/music/royalties">
        {() => <ProtectedRoute component={MusicRoyalties} />}
      </Route>
      <Route path="/music/library">
        {() => <ProtectedRoute component={MusicLibrary} />}
      </Route>
      <Route path="/music/favorites">{() => <Redirect to="/library" />}</Route>
      <Route path="/music/insights">{() => <Redirect to="/analytics" />}</Route>
      <Route path="/music/live">{() => <Redirect to="/stream" />}</Route>
      <Route path="/music/settings">{() => <Redirect to="/profile" />}</Route>
      <Route path="/music/upgrade">{() => <Redirect to="/apply" />}</Route>
      <Route path="/streamroyale">{() => <Redirect to="/arena" />}</Route>
      <Route path="/royale">{() => <Redirect to="/arena" />}</Route>
      <Route path="/beatmaker">{() => <Redirect to="/music/studio" />}</Route>

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const [isMusicPortalOpen, setIsMusicPortalOpen] = useState(false);
  const [showQuickSignIn, setShowQuickSignIn] = useState(false);
  const { isLoading, isFadingOut } = useLoading();
  // The docked player is a fixed overlay, so space is reserved for it ONLY
  // while a track is loaded. Reserving it unconditionally left a permanent
  // ~68px dead strip at the bottom of every non-music page.
  const { currentTrack } = useAudio();
  const [currentPath] = useLocation();
  const isHomePage = currentPath === "/" || currentPath === "";

  // Contextual page title — read by any header/navbar that needs a dynamic title
  const pageTitle = (() => {
    if (
      currentPath.startsWith("/music") ||
      currentPath.startsWith("/stream") ||
      currentPath.startsWith("/track") ||
      currentPath.startsWith("/artist-portal")
    )
      return "Musical Universe";
    if (
      currentPath.startsWith("/community") ||
      currentPath.startsWith("/blog") ||
      currentPath.startsWith("/communities")
    )
      return "Community Hub";
    if (
      currentPath.startsWith("/commerce") ||
      currentPath.startsWith("/business") ||
      currentPath.startsWith("/hotellerie") ||
      currentPath.startsWith("/batiment") ||
      currentPath.startsWith("/automobile") ||
      currentPath.startsWith("/finances") ||
      currentPath.startsWith("/divertissement") ||
      currentPath.startsWith("/sante") ||
      currentPath.startsWith("/geo-admin")
    )
      return "Business Intelligence";
    if (currentPath.startsWith("/royal")) return "Royal";
    if (currentPath.startsWith("/vault") || currentPath.startsWith("/sys/"))
      return "Vault";
    if (currentPath.startsWith("/profile")) return "Profile";
    if (currentPath.startsWith("/user/")) return "Member Profile";
    if (
      currentPath.startsWith("/dashboard") ||
      currentPath.startsWith("/admin")
    )
      return "Dashboard";
    return "Verso Air";
  })();

  // Expose as a data attribute so any child can read it without a context
  if (typeof document !== "undefined")
    document.title =
      pageTitle === "Verso Air" ? "Verso Air" : `${pageTitle} — Verso Air`;
  const isContentNavPage = isContentNavPath(currentPath);
  // Musical Universe pages have their own dedicated chrome (MusicSidebar /
  // MusicMobileDock for /music/*, /stream, /streamer-portal, /arcade, /arena,
  // /beatmaker, /listener-portal, and internal Tabs for /artist-portal) — the
  // business site Navbar/amber-bar/BlogNavbar/footer would obstruct that
  // chrome, so suppress them here. Canonical list lives in @/lib/music-routes
  // so any new music-family route automatically inherits this behavior.
  const isMusicPage = MUSIC_ROUTE_PREFIXES.some(
    (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`),
  );
  const { user, logout } = useAuthContext();
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const isAuthed =
    !!user || localStorage.getItem("blog_community_auth") === "true";
  // Show ContentNav (bottom dock) on blog/marketplace pages only for authenticated users
  const showContentNav = isContentNavPage && isAuthed;
  const isAuthPage = currentPath.startsWith("/auth");
  // Immersive pages — hide navbar, footer (keep motto), bubble menu
  const isImmersivePage =
    currentPath === "/dashboard" ||
    currentPath === "/apply" ||
    currentPath === "/profile" ||
    currentPath.startsWith("/user/") ||
    currentPath === "/inventory";
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
      <BetaBanner />
      {/* ── Fixed Header Block: amber top bar (conditional) + scrolling ticker (conditional) ──
          Hidden on: Music pages, Blog, Community, Profile, Dashboard, Immersive pages
          Shown on: Business/Commerce pages (Commerce, Hotellerie, Batiment, Automobile, Finance, etc.) */}
      {!isMusicPage &&
        currentPath !== "/blog" &&
        currentPath !== "/marketplace" &&
        !currentPath.startsWith("/community") &&
        !currentPath.startsWith("/profile") &&
        !currentPath.startsWith("/user/") &&
        !currentPath.startsWith("/dashboard") &&
        !currentPath.startsWith("/admin") &&
        !isImmersivePage && (
          <div
            className="fixed top-0 left-0 right-0 z-[60] flex flex-col"
            style={{ overflow: "visible" }}
          >
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white h-7 px-2 flex items-center">
              <div
                className="max-w-7xl mx-auto flex items-center text-[10px] gap-2 w-full"
                style={{ overflow: "visible" }}
              >
                {/* Left: Platform label — Dynamic based on current page */}
                <span
                  className="font-medium flex-1 min-w-0 text-center notranslate"
                  translate="no"
                >
                  <span className="hidden md:inline notranslate" translate="no">
                    {pageTitle === "Verso Air"
                      ? isFr
                        ? "Plateforme Verso Air"
                        : "Verso Air Platform"
                      : isFr
                        ? `Plateforme ${pageTitle === "Business Intelligence" ? "d'Intelligence d'Affaires" : pageTitle}`
                        : pageTitle}
                  </span>
                  <span
                    className="hidden sm:inline md:hidden notranslate"
                    translate="no"
                  >
                    {pageTitle === "Verso Air"
                      ? isFr
                        ? "Verso Air"
                        : "VA"
                      : isFr
                        ? pageTitle.substring(0, 3)
                        : pageTitle.substring(0, 3)}
                  </span>
                  <span className="sm:hidden notranslate" translate="no">
                    {pageTitle.substring(0, 2).toUpperCase()}
                  </span>
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

            {/* Scrolling ticker — visible on standard pages only (not music, immersive, blog, marketplace) */}
            {!isMusicPage &&
              !isImmersivePage &&
              !versoaiFullscreen &&
              currentPath !== "/blog" &&
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

            {/* Blog Navbar — shown on /blog and /marketplace when ContentNav is not active. */}
            {!isMusicPage &&
              !isImmersivePage &&
              (currentPath === "/blog" || currentPath === "/marketplace") &&
              !marketplaceModalOpen &&
              !showContentNav && (
                <Suspense fallback={null}>
                  <BlogNavbar />
                </Suspense>
              )}
          </div>
        )}
      {/* ── Music Universe Navbar — sits below the amber bar ── */}

      <Suspense fallback={null}>
        <PullToRefresh />
      </Suspense>
      {showContentNav && (
        <Suspense fallback={null}>
          <ContentNav />
        </Suspense>
      )}
      {/* Main Navbar — desktop/tablet only (md+); MobileMenuBubble handles nav on phones
           (still hidden on auth/content-nav/music/immersive pages as before) */}
      {!isAuthPage && !showContentNav && !isMusicPage && !isImmersivePage && (
        <div
          className={`hidden md:block transition-opacity duration-300 ${
            isLoading && !isFadingOut
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          <Navbar
            onLocationPanelToggle={() =>
              setIsLocationPanelOpen((prev) => !prev)
            }
            isLocationPanelOpen={isLocationPanelOpen}
          />
        </div>
      )}

      {/* Side Panels */}
      <Suspense fallback={null}>
        <LocationPanel
          isOpen={isLocationPanelOpen}
          onClose={() => setIsLocationPanelOpen(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <MusicPortal
          isOpen={isMusicPortalOpen}
          onClose={() => setIsMusicPortalOpen(false)}
        />
      </Suspense>

      {/* Loading */}
      <LoadingOverlay />

      {/* Main Router */}
      <main
        className={`flex-1 min-h-screen overflow-x-hidden transition-opacity duration-300 ${
          isLoading && !isFadingOut
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        } ${pageEnter ? "page-enter" : ""} ${showContentNav ? "pb-[80px]" : ""} ${!isMusicPage && currentTrack ? "pb-[68px]" : ""}`}
      >
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom Sections — home page only */}
      {isHomePage && (
        <Suspense fallback={null}>
          <div>
            <TestimonialsFloating />
            <TeamSection />
            <SponsorsSection />
          </div>
        </Suspense>
      )}
      {/* Footer — hide on music pages; show only motto on immersive pages */}
      {!isMusicPage && !isImmersivePage && (
        <div>
          <Footer />
        </div>
      )}
      {isImmersivePage && (
        <div className="bg-gray-950 py-6 text-center">
          <p
            className="text-[11px] sm:text-xs tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-amber-400 font-light select-none notranslate"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
              letterSpacing: "0.4em",
            }}
          >
            STRΔΦGHT TΩ THΞ PΩΦΠT
          </p>
        </div>
      )}

      {/* Mobile Menu Bubble — hide on Blog & Musical Universe and immersive pages */}
      {!isImmersivePage && !isMusicPage && (
        <Suspense fallback={null}>
          <MobileMenuBubble />
        </Suspense>
      )}

      {/* Messenger panel remains globally mounted so pages can open it via
          `messenger:open`, but the floating purple launcher button is hidden
          to avoid UI overlap on mobile. */}
      {!isImmersivePage && (
        <Suspense fallback={null}>
          <MessengerLauncher hidden />
        </Suspense>
      )}

      {/* Notification bell — fixed top-right, visible on all non-auth pages.
          Dropped below the bar on /blog & /marketplace since BlogNavbar has
          its own auth/Sign-Out controls anchored in that same corner. */}
      {!isAuthPage && !isMusicPage && user && (
        <div
          className={`fixed right-4 z-[150] ${
            currentPath === "/blog" || currentPath === "/marketplace"
              ? "top-16 md:top-[4.5rem]"
              : "top-3"
          }`}
        >
          <NotificationCenter />
        </div>
      )}

      {/* Quick Sign In Modal — global shortcut */}
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
                    {/* Global "Now Playing" bar — renders itself only when a
                        track is loaded. artist-portal.tsx depends on this. */}
                    <AudioPlayer />
                    <InactivityGuard />
                    <Toaster />
                  </AudioProvider>
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
