/**
 * Command Center — Full platform technical reference
 * Extracted from credentials-vault.tsx
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge, Users, DollarSign, Route, Plug, Database, Shield, Blocks,
  Settings, Package, Server, Key, Hash, Globe, Wrench, Activity,
  Cpu, HardDrive, MemoryStick, Network, Code2, FileCode, Layers,
  Mail, CreditCard, Bot, Bell, FileText, GitBranch, MonitorSmartphone,
  Palette, MapPin, BookOpen, LayoutDashboard, Radio,
} from "lucide-react";
import {
  SectionBlock, InfoRow, RouteLink, ApiEndpoint, DbTable, LiveHealthPanel,
} from "./vault-shared";
import UsersControlPanel from "./UsersControlPanel";
import FinanceControlPanel from "./FinanceControlPanel";

type TabId =
  | "overview"
  | "routes"
  | "api"
  | "database"
  | "auth"
  | "services"
  | "env"
  | "stack"
  | "users"
  | "finance";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "SYSTEM", icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: "users", label: "USERS", icon: <Users className="h-3.5 w-3.5" /> },
  {
    id: "finance",
    label: "FINANCE",
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
  { id: "routes", label: "ROUTES", icon: <Route className="h-3.5 w-3.5" /> },
  { id: "api", label: "API", icon: <Plug className="h-3.5 w-3.5" /> },
  {
    id: "database",
    label: "DATABASE",
    icon: <Database className="h-3.5 w-3.5" />,
  },
  { id: "auth", label: "AUTH", icon: <Shield className="h-3.5 w-3.5" /> },
  {
    id: "services",
    label: "SERVICES",
    icon: <Blocks className="h-3.5 w-3.5" />,
  },
  { id: "env", label: "ENV", icon: <Settings className="h-3.5 w-3.5" /> },
  { id: "stack", label: "STACK", icon: <Package className="h-3.5 w-3.5" /> },
];

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <section className="max-w-[95vw] mx-auto px-6 py-12 border-t border-gray-800/50">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 10px rgba(34,197,94,0.2)",
                "0 0 30px rgba(34,197,94,0.4)",
                "0 0 10px rgba(34,197,94,0.2)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
          >
            <LayoutDashboard className="w-5 h-5 text-black" />
          </motion.div>
          <div>
            <h2 className="text-xl font-black font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              COMMAND CENTER
            </h2>
            <p className="text-gray-600 text-[11px] font-mono">
              FULL PLATFORM CONTROL • USER MANAGEMENT • FINANCE • 78 ROUTES •
              100+ ENDPOINTS
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-gray-950/50 border border-gray-800/50 rounded-xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all ${activeTab === tab.id ? "bg-green-500/15 text-green-400 border border-green-800/50" : "text-gray-500 hover:text-gray-400 hover:bg-gray-800/30 border border-transparent"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {/* ═══ SYSTEM OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <>
              <LiveHealthPanel />

              <SectionBlock
                title="QUICK ACCESS — Admin Portals"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/geo-admin"
                    label="Geo Admin Login Gate"
                    emoji="🌍"
                  />
                  <RouteLink
                    path="/geo-admin/dashboard"
                    label="Full CRUD + SQL + Backups"
                    emoji="🛡️"
                  />
                  <RouteLink
                    path="/admin/database"
                    label="Database Management"
                    emoji="🗄️"
                  />
                  <RouteLink
                    path="/admin/verification"
                    label="Verification Queue"
                    emoji="✅"
                  />
                  <RouteLink
                    path="/admin/tickets"
                    label="Ticket Management"
                    emoji="🎫"
                  />
                  <RouteLink
                    path="/auth/signin"
                    label="Main Sign In"
                    emoji="🔑"
                  />
                  <RouteLink
                    path="/auth/login"
                    label="Quick Login"
                    emoji="⚡"
                  />
                  <RouteLink
                    path="/api-test"
                    label="API Test Console"
                    emoji="🧪"
                  />
                  <RouteLink path="/api" label="API Documentation" emoji="📖" />
                  <RouteLink path="/docs" label="Platform Docs" emoji="📚" />
                  <RouteLink
                    path="/status"
                    label="System Status Page"
                    emoji="📊"
                  />
                  <RouteLink path="/versoai" label="VersoAI Chat" emoji="🤖" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="ARCHITECTURE OVERVIEW"
                icon={<Code2 className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow
                    label="Frontend"
                    value="React 18 + TypeScript + Vite 6"
                  />
                  <InfoRow
                    label="Backend"
                    value="Node.js + Express 4 + TypeScript"
                  />
                  <InfoRow
                    label="Database"
                    value="PostgreSQL + Drizzle ORM 0.39"
                  />
                  <InfoRow
                    label="Real-time"
                    value="Socket.io v4 (ws + polling)"
                  />
                  <InfoRow label="State" value="TanStack React Query v5" />
                  <InfoRow
                    label="Routing"
                    value="Wouter v3 (client) + Express Router"
                  />
                  <InfoRow
                    label="UI System"
                    value="shadcn/ui + Tailwind CSS 3 + Radix"
                  />
                  <InfoRow
                    label="Animations"
                    value="Framer Motion 11 + GSAP 3"
                  />
                  <InfoRow label="Charts" value="Chart.js 4 + Recharts 2" />
                  <InfoRow
                    label="Auth"
                    value="JWT (7d) + bcrypt(12) + HttpOnly cookies"
                  />
                  <InfoRow label="Validation" value="Zod 3 + drizzle-zod" />
                  <InfoRow label="Email" value="Nodemailer 8 (SMTP/Gmail)" />
                  <InfoRow label="Payments" value="Stripe 20 (optional)" />
                  <InfoRow
                    label="AI"
                    value="Ollama (llama3.2) + smart fallback"
                  />
                  <InfoRow
                    label="PDF"
                    value="PDFKit 0.17 (business registration)"
                  />
                  <InfoRow
                    label="Scheduling"
                    value="node-cron 4 (daily integrity + trials)"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SERVER CONFIGURATION"
                icon={<Settings className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Port" value="5003 (0.0.0.0)" />
                  <InfoRow label="Body Limit" value="2MB JSON" />
                  <InfoRow
                    label="CORS Dev"
                    value="localhost:5003,3000,8080,5173"
                  />
                  <InfoRow label="JWT Expiry" value="7 days" />
                  <InfoRow
                    label="Auth Cookie"
                    value="auth_token (HttpOnly, SameSite=Lax, 7d)"
                  />
                  <InfoRow
                    label="CSRF Cookie"
                    value="csrf_token (non-HttpOnly, 24h TTL)"
                  />
                  <InfoRow label="Bcrypt" value="12 salt rounds" />
                  <InfoRow
                    label="Account Lock"
                    value="5 fails → 15 min lockout"
                  />
                  <InfoRow label="Reset Token" value="1 hour expiry" />
                  <InfoRow
                    label="HSTS"
                    value="31536000s + includeSubDomains + preload"
                  />
                  <InfoRow
                    label="Helmet CSP"
                    value="Full CSP (disabled in dev)"
                  />
                  <InfoRow label="WebSocket" value="ws + polling transports" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="RATE LIMITING"
                icon={<Gauge className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Login" value="5 req / 15 min" />
                  <InfoRow label="Register" value="10 req / hour" />
                  <InfoRow label="Forgot Password" value="5 req / hour" />
                  <InfoRow label="API General" value="100 req / 15 min" />
                  <InfoRow label="Connections" value="5 req / hour" />
                  <InfoRow label="Profile" value="10 req / hour" />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ ROUTES ═══ */}
          {activeTab === "routes" && (
            <>
              <SectionBlock
                title="PUBLIC PAGES (22)"
                icon={<Globe className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/" label="Home" emoji="🏠" />
                  <RouteLink path="/hub" label="Hub" emoji="🎯" />
                  <RouteLink path="/about" label="About" emoji="ℹ️" />
                  <RouteLink path="/contact" label="Contact" emoji="📧" />
                  <RouteLink path="/demo" label="Demo" emoji="🎬" />
                  <RouteLink path="/industries" label="Industries" emoji="🏭" />
                  <RouteLink path="/pricing" label="Pricing" emoji="💳" />
                  <RouteLink path="/blog" label="Blog / Community" emoji="📝" />
                  <RouteLink path="/faq" label="FAQ Forum" emoji="❓" />
                  <RouteLink path="/profile" label="User Profile" emoji="👤" />
                  <RouteLink
                    path="/marketplace"
                    label="Marketplace"
                    emoji="🛒"
                  />
                  <RouteLink path="/partners" label="Partners" emoji="🤝" />
                  <RouteLink path="/status" label="System Status" emoji="📊" />
                  <RouteLink
                    path="/get-involved"
                    label="Get Involved"
                    emoji="🙌"
                  />
                  <RouteLink
                    path="/ong-culturelle"
                    label="ONG Culturelle"
                    emoji="🎭"
                  />
                  <RouteLink
                    path="/artihuman-foundation"
                    label="ArtiHuman Foundation"
                    emoji="🌍"
                  />
                  <RouteLink path="/impact" label="Impact" emoji="💡" />
                  <RouteLink path="/tickets" label="Tickets" emoji="🎫" />
                  <RouteLink
                    path="/account/billing"
                    label="Billing"
                    emoji="💳"
                  />
                  <RouteLink
                    path="/ad-campaigns"
                    label="Ad Campaigns"
                    emoji="📢"
                  />
                  <RouteLink
                    path="/sponsorship"
                    label="Sponsorship"
                    emoji="⭐"
                  />
                  <RouteLink
                    path="/sponsor"
                    label="Sponsors Directory"
                    emoji="🏆"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SECTOR PAGES (14)"
                icon={<Layers className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/commerce"
                    label="E-Commerce Analytics"
                    emoji="🛍️"
                  />
                  <RouteLink
                    path="/hotellerie"
                    label="Hospitality Analytics"
                    emoji="🏨"
                  />
                  <RouteLink
                    path="/batiment"
                    label="Construction Analytics"
                    emoji="🏗️"
                  />
                  <RouteLink
                    path="/automobile"
                    label="Automotive Analytics"
                    emoji="🚗"
                  />
                  <RouteLink
                    path="/finances"
                    label="Finance Analytics"
                    emoji="💰"
                  />
                  <RouteLink
                    path="/divertissement"
                    label="Entertainment"
                    emoji="🎭"
                  />
                  <RouteLink path="/sante" label="Healthcare" emoji="🏥" />
                  <RouteLink path="/logement" label="Housing" emoji="🏠" />
                  <RouteLink
                    path="/reservations"
                    label="Reservations"
                    emoji="📅"
                  />
                  <RouteLink
                    path="/businesses-directory"
                    label="Business Directory"
                    emoji="📋"
                  />
                  <RouteLink
                    path="/business/:id"
                    label="Business Detail"
                    emoji="🔍"
                  />
                  <RouteLink
                    path="/category/:slug"
                    label="Category Detail"
                    emoji="🏷️"
                  />
                  <RouteLink
                    path="/annuaire-tv"
                    label="Annuaire TV"
                    emoji="📺"
                  />
                  <RouteLink
                    path="/database-results"
                    label="Database Results"
                    emoji="🗃️"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SERVICES & CAREERS (5)"
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/services" label="Services Hub" emoji="📋" />
                  <RouteLink path="/services/news" label="News" emoji="📰" />
                  <RouteLink
                    path="/services/careers"
                    label="Careers Portal"
                    emoji="💼"
                  />
                  <RouteLink
                    path="/services/contractors"
                    label="Contractors"
                    emoji="👷"
                  />
                  <RouteLink path="/contracts" label="Contracts" emoji="📄" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="CULTURAL & ARTISAN (9)"
                icon={<Palette className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/artisans"
                    label="Artisans Directory"
                    emoji="🎨"
                  />
                  <RouteLink
                    path="/artistes"
                    label="Artist Directory"
                    emoji="🎵"
                  />
                  <RouteLink
                    path="/artist-portal"
                    label="Artist Portal Welcome"
                    emoji="🎤"
                  />
                  <RouteLink
                    path="/artist-portal/dashboard"
                    label="Artist Dashboard"
                    emoji="📊"
                  />
                  <RouteLink
                    path="/programs"
                    label="Cultural Programs"
                    emoji="🎭"
                  />
                  <RouteLink
                    path="/communities"
                    label="Communities"
                    emoji="👥"
                  />
                  <RouteLink
                    path="/community"
                    label="Community Detail"
                    emoji="🏘️"
                  />
                  <RouteLink
                    path="/artisan-workshops"
                    label="Artisan Workshops"
                    emoji="🔨"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="AUTH & ADMIN (13)"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink
                    path="/auth/signin"
                    label="Sign In (Full)"
                    emoji="🔐"
                  />
                  <RouteLink
                    path="/auth/login"
                    label="Quick Login"
                    emoji="⚡"
                  />
                  <RouteLink
                    path="/auth/password"
                    label="Credentials (DEV)"
                    emoji="🗝️"
                  />
                  <RouteLink
                    path="/geo-admin"
                    label="Geo Admin Gate"
                    emoji="🌍"
                  />
                  <RouteLink
                    path="/geo-admin/dashboard"
                    label="Admin Dashboard"
                    emoji="🛡️"
                  />
                  <RouteLink
                    path="/geo-admin/business-verification"
                    label="Business Verification"
                    emoji="✅"
                  />
                  <RouteLink
                    path="/geo-admin/immobilier"
                    label="Immobilier Portal"
                    emoji="🏢"
                  />
                  <RouteLink
                    path="/dashboard"
                    label="User Dashboard"
                    emoji="📈"
                  />
                  <RouteLink
                    path="/admin/database"
                    label="DB Management Center"
                    emoji="🗄️"
                  />
                  <RouteLink
                    path="/admin/verification"
                    label="Verification Admin"
                    emoji="✔️"
                  />
                  <RouteLink
                    path="/admin/tickets"
                    label="Ticket Management"
                    emoji="🎫"
                  />
                  <RouteLink
                    path="/sys/0x7f3a9c"
                    label="Credentials Vault (SU)"
                    emoji="🔐"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="HELP & SUPPORT (9)"
                icon={<BookOpen className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/sav" label="SAV (After-Sales)" emoji="🛠️" />
                  <RouteLink
                    path="/versoai"
                    label="VersoAI Assistant"
                    emoji="🤖"
                  />
                  <RouteLink path="/help" label="Help Center" emoji="❓" />
                  <RouteLink
                    path="/help/account"
                    label="Account Help"
                    emoji="👤"
                  />
                  <RouteLink
                    path="/help/payments"
                    label="Payments Help"
                    emoji="💳"
                  />
                  <RouteLink
                    path="/help/delivery"
                    label="Delivery Help"
                    emoji="📦"
                  />
                  <RouteLink
                    path="/help/product"
                    label="Product Help"
                    emoji="📱"
                  />
                  <RouteLink
                    path="/help/returns"
                    label="Returns Help"
                    emoji="↩️"
                  />
                  <RouteLink
                    path="/help/guarantee"
                    label="Guarantee Help"
                    emoji="🛡️"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="DEVELOPER & DOCS (3)"
                icon={<Code2 className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="grid sm:grid-cols-2 gap-1">
                  <RouteLink path="/api" label="API Documentation" emoji="📖" />
                  <RouteLink
                    path="/api-test"
                    label="API Test Console"
                    emoji="🧪"
                  />
                  <RouteLink
                    path="/docs"
                    label="Platform Documentation"
                    emoji="📚"
                  />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ API ENDPOINTS ═══ */}
          {activeTab === "api" && (
            <>
              <SectionBlock
                title="AUTH ENDPOINTS (/auth)"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <ApiEndpoint
                  method="POST"
                  path="/auth/register"
                  desc="Create account (rate-limited)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/login"
                  desc="Email+password login (JWT)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/logout"
                  desc="Clear auth cookie"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/verify-email"
                  desc="Email verification via token"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/resend-verification"
                  desc="Resend verification email"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/verify"
                  desc="Verify JWT validity"
                />
                <ApiEndpoint
                  method="GET"
                  path="/auth/session"
                  desc="Current user session info"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/forgot-password"
                  desc="Send reset email"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/reset-password"
                  desc="Reset via token"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/admin-gate"
                  desc="6-digit admin gate code"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/geo-admin"
                  desc="Geo-admin login (dev/ops)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/auth/start-trial"
                  desc="Start 7-day free trial"
                />
              </SectionBlock>

              <SectionBlock
                title="BUSINESSES (/api/businesses)"
                icon={<Globe className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses"
                  desc="List (paginated, filtered, tier-sorted)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/:id"
                  desc="Detail + services + reviews"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses"
                  desc="Create business"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id"
                  desc="Update (audit trail)"
                />
                <ApiEndpoint
                  method="DELETE"
                  path="/api/businesses/:id"
                  desc="Delete business"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/stats/summary"
                  desc="Aggregate stats"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/by-category/:id"
                  desc="Filter by category"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses/bulk-update"
                  desc="Transactional bulk update"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/table-counts"
                  desc="PostgreSQL row counts"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/businesses/submit"
                  desc="Submit for approval (PDF)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/pending"
                  desc="Pending approval queue"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id/approve"
                  desc="Approve pending"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/businesses/:id/reject"
                  desc="Reject pending"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/businesses/:id/pdf"
                  desc="Download registration PDF"
                />
              </SectionBlock>

              <SectionBlock
                title="SEARCH (/api/search)"
                icon={<Search className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/search/businesses"
                  desc="Geo-aware Haversine search"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/search/health"
                  desc="DB connection test"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/search/test-business"
                  desc="Create test business (dev)"
                />
              </SectionBlock>

              <SectionBlock
                title="PROPERTIES (/api/properties)"
                icon={<MapPin className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/properties"
                  desc="List (paginated, filtered)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/:id"
                  desc="Property detail"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/properties"
                  desc="Create listing"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/city/:city"
                  desc="By city"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/properties/filters"
                  desc="Distinct cities/types/cats"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/admin/verification/pending"
                  desc="Unverified properties"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/admin/verification/:id/verify"
                  desc="Verify property"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/admin/verification/:id/reject"
                  desc="Reject property"
                />
              </SectionBlock>

              <SectionBlock
                title="TICKETS (/api/tickets)"
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/tickets"
                  desc="List all tickets"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/tickets"
                  desc="Create (with SLA)"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/tickets/:id"
                  desc="Update ticket"
                />
                <ApiEndpoint
                  method="DELETE"
                  path="/api/tickets/:id"
                  desc="Delete ticket"
                />
                <ApiEndpoint
                  method="PUT"
                  path="/api/tickets/:id/assign"
                  desc="Assign ticket"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/tickets/:id/escalate"
                  desc="Escalate to critical"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/tickets/stats/summary"
                  desc="Stats + SLA compliance"
                />
              </SectionBlock>

              <SectionBlock
                title="JOBS (/api/jobs)"
                icon={<FileCode className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/jobs"
                  desc="List (filtered)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/jobs/search"
                  desc="Search + pagination"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs"
                  desc="Create job listing"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/generate"
                  desc="Generate random (dev)"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/:id/apply"
                  desc="Apply for job"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/jobs/:id/save"
                  desc="Save job"
                />
              </SectionBlock>

              <SectionBlock
                title="MUSIC (/api/music)"
                icon={<Radio className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/music/artists"
                  desc="List artists"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/tracks"
                  desc="List tracks"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/analytics"
                  desc="Music analytics"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/music/artists/:id"
                  desc="Artist + tracks"
                />
              </SectionBlock>

              <SectionBlock
                title="SOCIAL / BLOG (/api/social)"
                icon={<Users className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/social/feed"
                  desc="Community feed"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts"
                  desc="Create post"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts/:id/like"
                  desc="Like post"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/posts/:id/comment"
                  desc="Comment"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/social/follow/:id"
                  desc="Follow user"
                />
              </SectionBlock>

              <SectionBlock
                title="DATABASE MANAGEMENT (/api/database)"
                icon={<Database className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/categories"
                  desc="List all categories"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/countries"
                  desc="List countries"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/regions"
                  desc="List regions"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/cities"
                  desc="List cities"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/artists"
                  desc="List artists (CRUD)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/contractors"
                  desc="List contractors (CRUD)"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/stats"
                  desc="DB stats + health"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/tables"
                  desc="All PG table metadata"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/database/export"
                  desc="Export (JSON/CSV)"
                />
              </SectionBlock>

              <SectionBlock
                title="ADMIN V1 (/api/v1/admin)"
                icon={<Crown className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/businesses"
                  desc="Admin business CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/categories"
                  desc="Admin category CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/users"
                  desc="Admin user management"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/roles"
                  desc="Role management"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/campaigns"
                  desc="Ad campaign CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/jobs"
                  desc="Admin job CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/artists"
                  desc="Admin artist CRUD"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/security"
                  desc="Security controls"
                />
                <ApiEndpoint
                  method="ALL"
                  path="/api/v1/admin/verification"
                  desc="Verification mgmt"
                />
              </SectionBlock>

              <SectionBlock
                title="UTILITY ENDPOINTS"
                icon={<Plug className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <ApiEndpoint
                  method="GET"
                  path="/api/csrf-token"
                  desc="Get CSRF token"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/health"
                  desc="Health check"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/status"
                  desc="Server status"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/ping"
                  desc="Connectivity test"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/countries"
                  desc="Country list"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/detect-country"
                  desc="IP geolocation"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/home/stats"
                  desc="Home page stats"
                />
                <ApiEndpoint
                  method="POST"
                  path="/api/ai/chat"
                  desc="VersoAI chat"
                />
                <ApiEndpoint
                  method="GET"
                  path="/api/ai/status"
                  desc="Ollama status"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ DATABASE ═══ */}
          {activeTab === "database" && (
            <>
              <SectionBlock
                title="DATABASE CONFIG"
                icon={<Settings className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow label="Engine" value="PostgreSQL" />
                <InfoRow
                  label="ORM"
                  value="Drizzle ORM 0.39 + drizzle-kit 0.31"
                />
                <InfoRow
                  label="Database"
                  value="versoair_business_intelligence"
                  copyable
                />
                <InfoRow
                  label="Schema File"
                  value="shared/schema.ts (single source of truth)"
                />
                <InfoRow
                  label="Migrations"
                  value="./migrations (drizzle-kit)"
                />
                <InfoRow
                  label="Push Command"
                  value="npm run db:push"
                  copyable
                />
                <InfoRow label="Studio" value="npm run db:studio" copyable />
                <InfoRow
                  label="Validation"
                  value="Auto Zod schemas via drizzle-zod"
                />
              </SectionBlock>

              <SectionBlock
                title="TABLES (28)"
                icon={<Table2 className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <div className="space-y-1.5">
                  <DbTable
                    name="users"
                    columns="id, username, email, password, role, is_verified, failed_login_attempts, locked_until, subscription_tier, subscription_status, trial_tier, trial_started_at, trial_expires_at, reset_token, reset_token_expires, avatar_url, bio, created_at"
                  />
                  <DbTable
                    name="businesses"
                    columns="id, name, description, category_id, country_id, region_id, city_id, address, latitude, longitude, phone, email, website, image_url, rating, revenue, status, subscription_tier, business_type, specialization, approval_status, submitted_by, approved_by, approval_notes, pdf_path, created_at, updated_at"
                  />
                  <DbTable
                    name="businessCategories"
                    columns="id, name, slug, icon, sector, description, created_at"
                  />
                  <DbTable
                    name="countries"
                    columns="id, name, code, flag_emoji"
                  />
                  <DbTable
                    name="regions"
                    columns="id, name, country_id, code"
                  />
                  <DbTable
                    name="cities"
                    columns="id, name, country_id, region_id, population, is_capital"
                  />
                  <DbTable
                    name="properties"
                    columns="id, title, description, property_type, transaction_type, price, currency, surface_area, rooms, bedrooms, bathrooms, address, city, country, latitude, longitude, images, is_verified, created_at"
                  />
                  <DbTable
                    name="jobs"
                    columns="id, title, company, description, location, salary_min, salary_max, currency, job_type, experience_level, category, skills, remote, application_url, created_at"
                  />
                  <DbTable
                    name="artists"
                    columns="id, name, specialty, bio, portfolio_url, image_url, location, rating, created_at"
                  />
                  <DbTable
                    name="contractors"
                    columns="id, name, specialty, company, license_number, email, phone, rating, created_at"
                  />
                  <DbTable
                    name="tickets"
                    columns="id, title, description, status, priority, category, sla_level, sla_deadline, assigned_to, reporter_email, reporter_name, resolution, created_at, updated_at"
                  />
                  <DbTable
                    name="ticketAssignments"
                    columns="id, ticket_id, assigned_to, assigned_at"
                  />
                  <DbTable
                    name="connections"
                    columns="id, requester_id, target_id, status, created_at (unique pair)"
                  />
                  <DbTable
                    name="transactions"
                    columns="id, user_id, amount, type, description, created_at"
                  />
                  <DbTable
                    name="businessReviews"
                    columns="id, business_id, rating, comment, reviewer, created_at"
                  />
                  <DbTable
                    name="auditLogs"
                    columns="id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at"
                  />
                  <DbTable
                    name="adCampaigns"
                    columns="id, name, budget, status, start_date, end_date, target_audience, created_at"
                  />
                  <DbTable
                    name="reservations"
                    columns="id, business_id, customer_name, date, time, party_size, status, created_at"
                  />
                  <DbTable
                    name="analytics"
                    columns="id, entity_id, entity_type, metric_type, value, date, metadata (unique entity+type+date)"
                  />
                  <DbTable
                    name="musicArtists"
                    columns="id, name, genre, bio, image_url, created_at"
                  />
                  <DbTable
                    name="musicTracks"
                    columns="id, title, artist_id, genre, duration, plays, url, created_at"
                  />
                  <DbTable
                    name="musicAnalytics"
                    columns="id, track_id, plays, date"
                  />
                  <DbTable
                    name="notifications"
                    columns="id, user_id, type, title, message, data, read, link, actor_id, created_at"
                  />
                  <DbTable
                    name="verifications"
                    columns="id, user_id, verification_type, status, document_url, notes, submitted_at, reviewed_at, reviewer_id, digital_passport, business_id, property_id"
                  />
                  <DbTable
                    name="verificationTokens"
                    columns="id, user_id, token, type, expires_at, created_at"
                  />
                  <DbTable
                    name="userSettings"
                    columns="id, user_id, sector, setting_key, setting_value, is_active, updated_at (unique userId+sector+key)"
                  />
                  <DbTable
                    name="settingsTemplates"
                    columns="id, sector, default_settings, updated_at"
                  />
                  <DbTable
                    name="emailSubscriptions"
                    columns="id, user_id, type, email, frequency, is_active, sectors, categories, created_at, updated_at (unique userId+type)"
                  />
                  <DbTable
                    name="emailQueue"
                    columns="id, subscription_id, user_id, subject, html_content, text_content, status, scheduled_for, sent_at, error, created_at"
                  />
                  <DbTable
                    name="paymentCardTypes"
                    columns="id, name, brand, icon, created_at"
                  />
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ AUTH SYSTEM ═══ */}
          {activeTab === "auth" && (
            <>
              <SectionBlock
                title="AUTH FLOW"
                icon={<Key className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="Strategy"
                  value="JWT + HttpOnly cookie + Bearer header"
                />
                <InfoRow
                  label="Token Expiry"
                  value="7 days (configurable via JWT_EXPIRES_IN)"
                />
                <InfoRow label="Cookie Name" value="auth_token" copyable />
                <InfoRow
                  label="Cookie Flags"
                  value="HttpOnly, SameSite=Lax, Secure (prod), path=/"
                />
                <InfoRow
                  label="Bearer Format"
                  value="Authorization: Bearer <token>"
                />
                <InfoRow
                  label="Hash Algorithm"
                  value="bcrypt, 12 salt rounds"
                />
                <InfoRow
                  label="Token Payload"
                  value="{ userId, email, role, subscriptionTier }"
                />
              </SectionBlock>

              <SectionBlock
                title="CSRF PROTECTION"
                icon={<Shield className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <InfoRow
                  label="Strategy"
                  value="Hybrid: double-submit cookie + synchronizer token"
                />
                <InfoRow
                  label="Cookie"
                  value="csrf_token (non-HttpOnly, SameSite=Lax)"
                />
                <InfoRow label="Header" value="x-csrf-token" copyable />
                <InfoRow
                  label="TTL"
                  value="24 hours, periodic server-side cleanup"
                />
                <InfoRow
                  label="Exempt Paths"
                  value="/auth/login, /auth/register, /auth/geo-admin"
                />
                <InfoRow
                  label="Fetch Endpoint"
                  value="GET /api/csrf-token"
                  copyable
                />
              </SectionBlock>

              <SectionBlock
                title="ACCOUNT SECURITY"
                icon={<Lock className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <InfoRow label="Failed Login Limit" value="5 attempts" />
                <InfoRow label="Lockout Duration" value="15 minutes" />
                <InfoRow
                  label="Email Verification"
                  value="Required before login (token-based)"
                />
                <InfoRow
                  label="Password Reset"
                  value="1-hour expiry token via email"
                />
                <InfoRow
                  label="Session Sync"
                  value="Cross-tab via localStorage events"
                />
              </SectionBlock>

              <SectionBlock
                title="USER ROLES & TIERS"
                icon={<Crown className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow
                    label="Roles"
                    value="superuser, admin, moderator, business_owner, user"
                  />
                  <InfoRow
                    label="Tier Hierarchy"
                    value="free → essential → verified → max → enterprise"
                  />
                  <InfoRow
                    label="Trial System"
                    value="7-day free trial per tier"
                  />
                  <InfoRow
                    label="Trial Expiry Check"
                    value="Daily cron via node-cron"
                  />
                  <InfoRow
                    label="Middleware"
                    value="requireAuth(roles[]), optionalAuth()"
                  />
                  <InfoRow
                    label="Tier Middleware"
                    value="requireSubscription(feature)"
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="SPECIAL ACCESS METHODS"
                icon={<Zap className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow
                  label="Geo Admin Login"
                  value="POST /auth/geo-admin → username 'geoadmin' + any 7-char pwd"
                />
                <InfoRow
                  label="Admin Gate"
                  value="POST /auth/admin-gate → 6-digit code"
                />
                <InfoRow
                  label="Session Backdoor"
                  value="GET /auth/session → Base64 'geoadmin:*' token"
                />
                <InfoRow
                  label="Blog Auth"
                  value="Client-side gate (community blog posts)"
                />
                <InfoRow
                  label="Careers Auth"
                  value="Client-side gate (job applications)"
                />
              </SectionBlock>

              <SectionBlock
                title="WEBSOCKET AUTH"
                icon={<Radio className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <InfoRow label="Library" value="Socket.io v4 (ws + polling)" />
                <InfoRow
                  label="Auth Flow"
                  value="Client emits 'authenticate' → joins user_<id> room"
                />
                <InfoRow
                  label="User Tracking"
                  value="connectedUsers Map (multi-device)"
                />
                <InfoRow
                  label="Events"
                  value="connection_request, connection_accepted, job_posted, reservation_update, profile_updated, contract_posted"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ SERVICES ═══ */}
          {activeTab === "services" && (
            <>
              <SectionBlock
                title="CORE SERVICES (server/services/)"
                icon={<Blocks className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                {[
                  {
                    name: "email-service.ts",
                    desc: "Nodemailer SMTP transporter — verification emails, password resets, approval/rejection notifications",
                    icon: <Mail className="h-3 w-3 text-blue-400" />,
                  },
                  {
                    name: "email-queue-processor.ts",
                    desc: "Hourly queue processor — batched alerts & digests from emailQueue table",
                    icon: <Mail className="h-3 w-3 text-cyan-400" />,
                  },
                  {
                    name: "notification-service.ts",
                    desc: "EventEmitter-based notifications — connections, jobs, reservations → Socket.io broadcast",
                    icon: <Bell className="h-3 w-3 text-amber-400" />,
                  },
                  {
                    name: "category-integrity-check.ts",
                    desc: "Daily + startup integrity check preventing category data corruption",
                    icon: <Shield className="h-3 w-3 text-red-400" />,
                  },
                  {
                    name: "business-validation.ts",
                    desc: "Category validation preventing orphaned/mismatched business categories",
                    icon: <CheckCircle2 className="h-3 w-3 text-green-400" />,
                  },
                  {
                    name: "category-seed-data.ts",
                    desc: "Seed data for all business categories (initial bootstrap)",
                    icon: <Database className="h-3 w-3 text-purple-400" />,
                  },
                  {
                    name: "analytics-service.ts",
                    desc: "Aggregates analytics data across entities (revenue, performance, trends)",
                    icon: <Activity className="h-3 w-3 text-emerald-400" />,
                  },
                  {
                    name: "pdf-generator.ts",
                    desc: "PDFKit-based business registration PDF generation",
                    icon: <FileText className="h-3 w-3 text-rose-400" />,
                  },
                  {
                    name: "subscription-scheduler.ts",
                    desc: "Daily cron checking expired trials & subscriptions (node-cron)",
                    icon: <Clock className="h-3 w-3 text-orange-400" />,
                  },
                  {
                    name: "versoai-service.ts",
                    desc: "AI chat — tries Ollama (llama3.2) locally, falls back to smart template responses",
                    icon: <Bot className="h-3 w-3 text-violet-400" />,
                  },
                  {
                    name: "ai-context-provider.ts",
                    desc: "Platform knowledge base context for AI conversations",
                    icon: <Bot className="h-3 w-3 text-indigo-400" />,
                  },
                  {
                    name: "gtm-service.ts",
                    desc: "Google Tag Manager event tracking integration",
                    icon: <Activity className="h-3 w-3 text-teal-400" />,
                  },
                ].map((svc, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-gray-800/20 last:border-0"
                  >
                    <div className="mt-0.5 flex-shrink-0">{svc.icon}</div>
                    <div className="min-w-0">
                      <code className="text-[11px] text-green-400 font-mono font-bold">
                        {svc.name}
                      </code>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {svc.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </SectionBlock>

              <SectionBlock
                title="MIDDLEWARE STACK (server/middleware/)"
                icon={<Layers className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                {[
                  {
                    name: "auth.ts",
                    desc: "requireAuth(roles[]) — JWT verification from cookie/header. optionalAuth() for public+auth routes",
                    icon: <Shield className="h-3 w-3 text-red-400" />,
                  },
                  {
                    name: "csrf.ts",
                    desc: "Double-submit cookie + synchronizer token. 24h TTL, periodic cleanup. Exempts auth endpoints",
                    icon: <Lock className="h-3 w-3 text-amber-400" />,
                  },
                  {
                    name: "rate-limiter.ts",
                    desc: "express-rate-limit instances: login (5/15m), register (10/h), API (100/15m), forgot-pwd (5/h)",
                    icon: <Gauge className="h-3 w-3 text-orange-400" />,
                  },
                  {
                    name: "custom-rate-limiter.ts",
                    desc: "In-memory rate limiter with X-RateLimit-* headers + periodic store cleanup",
                    icon: <Gauge className="h-3 w-3 text-yellow-400" />,
                  },
                  {
                    name: "subscription.ts",
                    desc: "requireSubscription(feature) — tier enforcement (free → essential → verified → max → enterprise)",
                    icon: <CreditCard className="h-3 w-3 text-purple-400" />,
                  },
                  {
                    name: "validation.ts",
                    desc: "Zod-based validateBody(schema) + validateQuery(schema) middleware",
                    icon: <CheckCircle2 className="h-3 w-3 text-cyan-400" />,
                  },
                  {
                    name: "error-handler.ts",
                    desc: "Global error handler (DB, JWT, validation, 500). notFoundHandler for 404s",
                    icon: <AlertTriangle className="h-3 w-3 text-red-500" />,
                  },
                  {
                    name: "async-handler.ts",
                    desc: "Wraps async route handlers to catch Promise rejections",
                    icon: <Code2 className="h-3 w-3 text-gray-400" />,
                  },
                ].map((mw, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-gray-800/20 last:border-0"
                  >
                    <div className="mt-0.5 flex-shrink-0">{mw.icon}</div>
                    <div className="min-w-0">
                      <code className="text-[11px] text-blue-400 font-mono font-bold">
                        {mw.name}
                      </code>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {mw.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </SectionBlock>
            </>
          )}

          {/* ═══ ENVIRONMENT ═══ */}
          {activeTab === "env" && (
            <>
              <SectionBlock
                title="REQUIRED"
                icon={<AlertTriangle className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <InfoRow
                  label="DATABASE_URL"
                  value="postgresql://...versoair_business_intelligence"
                  copyable
                />
                <InfoRow
                  label="JWT_SECRET"
                  value="(generate: openssl rand -hex 32)"
                />
                <InfoRow
                  label="SESSION_SECRET"
                  value="(generate: openssl rand -hex 32)"
                />
              </SectionBlock>

              <SectionBlock
                title="SERVER"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <InfoRow label="NODE_ENV" value="development" />
                <InfoRow label="PORT" value="5003" />
                <InfoRow
                  label="CORS_ORIGIN"
                  value="localhost:5003,3000,8080,5173 (comma-sep)"
                />
                <InfoRow label="VITE_API_URL" value="http://localhost:5003" />
                <InfoRow label="BASE_URL" value="http://localhost:5003" />
                <InfoRow
                  label="PRODUCTION_URL"
                  value="http://localhost:5003 (Socket.io CORS)"
                />
              </SectionBlock>

              <SectionBlock
                title="DATABASE (fallbacks)"
                icon={<Database className="w-3.5 h-3.5 text-white" />}
                color="cyan"
              >
                <InfoRow label="PGUSER" value="versoair" />
                <InfoRow label="PGPASSWORD" value="versoair2025" />
                <InfoRow label="PGHOST" value="localhost" />
                <InfoRow label="PGPORT" value="5432" />
                <InfoRow
                  label="PGDATABASE"
                  value="versoair_business_intelligence"
                />
              </SectionBlock>

              <SectionBlock
                title="AUTH"
                icon={<Key className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="JWT_SECRET"
                  value="(required — fatal if missing)"
                />
                <InfoRow label="JWT_EXPIRES_IN" value="7d (default)" />
              </SectionBlock>

              <SectionBlock
                title="EMAIL (SMTP)"
                icon={<Mail className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <InfoRow label="SMTP_HOST" value="smtp.gmail.com" />
                <InfoRow label="SMTP_PORT" value="587" />
                <InfoRow label="SMTP_USER" value="(optional — your Gmail)" />
                <InfoRow label="SMTP_PASS" value="(optional — app password)" />
                <InfoRow label="EMAIL_FROM" value="noreply@versoair.com" />
              </SectionBlock>

              <SectionBlock
                title="INTEGRATIONS"
                icon={<Plug className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <InfoRow label="STRIPE_SECRET_KEY" value="(optional)" />
                <InfoRow label="STRIPE_WEBHOOK_SECRET" value="(optional)" />
                <InfoRow
                  label="OLLAMA_BASE_URL"
                  value="http://localhost:11434"
                />
                <InfoRow label="OLLAMA_MODEL" value="llama3.2" />
                <InfoRow
                  label="SKIP_CATEGORY_CHECK"
                  value="false (set true to skip integrity)"
                />
              </SectionBlock>
            </>
          )}

          {/* ═══ TECH STACK ═══ */}
          {activeTab === "stack" && (
            <>
              <SectionBlock
                title="NPM SCRIPTS"
                icon={<Terminal className="w-3.5 h-3.5 text-white" />}
                color="green"
              >
                <InfoRow
                  label="npm run dev"
                  value="Start full-stack dev server (port 5003)"
                  copyable
                />
                <InfoRow
                  label="npm run build"
                  value="Vite build + esbuild server bundle"
                  copyable
                />
                <InfoRow
                  label="npm run check"
                  value="TypeScript type-check (tsc)"
                  copyable
                />
                <InfoRow
                  label="npm run db:push"
                  value="Push Drizzle schema to DB"
                  copyable
                />
                <InfoRow
                  label="npm run db:studio"
                  value="Open Drizzle Studio (visual DB)"
                  copyable
                />
              </SectionBlock>

              <SectionBlock
                title="FRONTEND (97 deps)"
                icon={<MonitorSmartphone className="w-3.5 h-3.5 text-white" />}
                color="blue"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="React" value="18.x" />
                  <InfoRow label="TypeScript" value="5.6" />
                  <InfoRow label="Vite" value="6.x" />
                  <InfoRow label="Wouter" value="3.x (routing)" />
                  <InfoRow label="TanStack Query" value="5.x (data fetching)" />
                  <InfoRow label="Framer Motion" value="11.x (animations)" />
                  <InfoRow label="GSAP" value="3.x (scroll animations)" />
                  <InfoRow label="Chart.js" value="4.x" />
                  <InfoRow label="Recharts" value="2.x" />
                  <InfoRow label="Tailwind CSS" value="3.x" />
                  <InfoRow label="Radix UI" value="20+ primitives" />
                  <InfoRow label="Lucide React" value="Icons" />
                  <InfoRow label="cmdk" value="Command palette" />
                  <InfoRow label="Embla Carousel" value="Carousel" />
                  <InfoRow label="React Hook Form" value="Forms" />
                  <InfoRow label="Sonner" value="Toasts" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="BACKEND"
                icon={<Server className="w-3.5 h-3.5 text-white" />}
                color="purple"
              >
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                  <InfoRow label="Express" value="4.x" />
                  <InfoRow label="Drizzle ORM" value="0.39" />
                  <InfoRow label="PostgreSQL (pg)" value="8.x" />
                  <InfoRow label="Socket.io" value="4.x" />
                  <InfoRow label="jsonwebtoken" value="JWT auth" />
                  <InfoRow label="bcryptjs" value="Password hashing" />
                  <InfoRow label="Nodemailer" value="8.x (email)" />
                  <InfoRow label="Stripe" value="20.x (payments)" />
                  <InfoRow label="PDFKit" value="0.17 (PDF gen)" />
                  <InfoRow label="node-cron" value="4.x (scheduling)" />
                  <InfoRow label="Zod" value="3.x (validation)" />
                  <InfoRow label="Helmet" value="Security headers" />
                  <InfoRow label="express-rate-limit" value="Rate limiting" />
                  <InfoRow label="memorystore" value="Session store" />
                  <InfoRow label="nanoid" value="ID generation" />
                  <InfoRow label="Puppeteer" value="24.x (dev tooling)" />
                </div>
              </SectionBlock>

              <SectionBlock
                title="DIRECTORY STRUCTURE"
                icon={<GitBranch className="w-3.5 h-3.5 text-white" />}
                color="amber"
              >
                <div className="font-mono text-[11px] text-gray-400 bg-black/40 rounded-lg p-4 leading-relaxed">
                  <div className="text-green-400">client/src/</div>
                  <div className="ml-4">
                    ├── pages/{" "}
                    <span className="text-gray-600">
                      — Route pages (78 files)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── components/{" "}
                    <span className="text-gray-600">
                      — Reusable UI (shadcn/ui)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── components/ui/{" "}
                    <span className="text-gray-600">
                      — 64+ shadcn components
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── hooks/{" "}
                    <span className="text-gray-600">— Custom React hooks</span>
                  </div>
                  <div className="ml-4">
                    ├── contexts/{" "}
                    <span className="text-gray-600">
                      — AuthContext, CountryContext
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── lib/{" "}
                    <span className="text-gray-600">
                      — queryClient, auth utilities
                    </span>
                  </div>
                  <div className="ml-4">
                    └── utils/{" "}
                    <span className="text-gray-600">
                      — query-security, a11y
                    </span>
                  </div>
                  <div className="text-green-400 mt-2">server/</div>
                  <div className="ml-4">
                    ├── routes/{" "}
                    <span className="text-gray-600">
                      — API endpoints by domain
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── routes/api-v1/{" "}
                    <span className="text-gray-600">
                      — v1 API (admin, etc.)
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── middleware/{" "}
                    <span className="text-gray-600">
                      — Auth, CSRF, rate-limit, validation
                    </span>
                  </div>
                  <div className="ml-4">
                    ├── services/{" "}
                    <span className="text-gray-600">
                      — Business logic (12 services)
                    </span>
                  </div>
                  <div className="ml-4">
                    └── websocket/{" "}
                    <span className="text-gray-600">— Socket.io config</span>
                  </div>
                  <div className="text-green-400 mt-2">shared/</div>
                  <div className="ml-4">
                    └── schema.ts{" "}
                    <span className="text-gray-600">
                      — Drizzle tables + Zod validators
                    </span>
                  </div>
                  <div className="text-green-400 mt-2">db/</div>
                  <div className="ml-4">
                    └── index.ts{" "}
                    <span className="text-gray-600">— DB connection pool</span>
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock
                title="PRODUCTION CHECKLIST"
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                color="red"
              >
                <div className="space-y-1.5 text-[11px] font-mono">
                  {[
                    "Generate fresh JWT_SECRET & SESSION_SECRET (openssl rand -hex 32)",
                    "Set NODE_ENV=production",
                    "Set DATABASE_URL to production PostgreSQL",
                    "Set CORS_ORIGIN to your domain only",
                    "Enable HTTPS/TLS (Let's Encrypt)",
                    "Configure firewall (ports 80, 443 only)",
                    "Run npm run build → npm start",
                    "Run npm run db:push (apply schema)",
                    "Set up automatic daily DB backups",
                    "Enable 2FA for admin accounts",
                    "Rotate all test credentials",
                    "Set up PM2 for process management",
                    "Configure Nginx reverse proxy",
                    "Set up monitoring (Sentry, DataDog, New Relic)",
                    "Enable SSL certificate auto-renewal",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-gray-500"
                    >
                      <span className="text-gray-700 flex-shrink-0 mt-0.5">
                        ☐
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            </>
          )}

          {/* ═══ USERS CONTROL ═══ */}
          {activeTab === "users" && <UsersControlPanel />}

          {/* ═══ FINANCE & PAYMENTS ═══ */}
          {activeTab === "finance" && <FinanceControlPanel />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}