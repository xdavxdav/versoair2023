import { useState } from "react";
import { Search, Copy, Eye, EyeOff, LogIn, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CREDENTIALS,
  Credential,
  searchCredentials,
  getCredentialsByRole,
  getRoleColor,
  getRoleIcon,
} from "@/pages/passwd";

export default function PasswordPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{
    [key: string]: boolean;
  }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] =
    useState<Credential | null>(null);

  // Filter credentials
  let displayedCredentials = CREDENTIALS;

  if (searchQuery) {
    displayedCredentials = searchCredentials(searchQuery);
  } else if (selectedRole) {
    displayedCredentials = getCredentialsByRole(selectedRole);
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoginClick = (credential: Credential) => {
    // Store credential in sessionStorage for quick login
    sessionStorage.setItem("quick_login_email", credential.email);
    sessionStorage.setItem("quick_login_password", credential.password);
    window.location.href = "/auth/signin";
  };

  const roles = [
    {
      id: "superuser",
      label: "Superuser",
      count: getCredentialsByRole("superuser").length,
    },
    {
      id: "admin",
      label: "Admin",
      count: getCredentialsByRole("admin").length,
    },
    {
      id: "moderator",
      label: "Moderator",
      count: getCredentialsByRole("moderator").length,
    },
    {
      id: "business-owner",
      label: "Business Owner",
      count: getCredentialsByRole("business-owner").length,
    },
    { id: "user", label: "User", count: getCredentialsByRole("user").length },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Quick Navigation Bar */}
      <div className="bg-slate-900/50 border-b border-slate-700 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-[95vw] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">🔐 Secured Session</span>
          </div>
          <div className="flex gap-2">
            <a href="/geo-admin">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-600 text-blue-400 hover:bg-blue-600/10"
              >
                🌍 Geo Admin
              </Button>
            </a>
            <a href="/geo-admin/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
              >
                🛡️ Admin Dashboard
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-slate-700 sticky top-0 z-40 bg-slate-900/95 backdrop-blur">
        <div className="max-w-[95vw] mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                🔐 Credentials Vault
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Development & Admin Account Quick Access
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">
                {displayedCredentials.length}
              </div>
              <p className="text-slate-400 text-xs">Available Accounts</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by username, email, business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedRole(null)}
              variant={selectedRole === null ? "default" : "outline"}
              size="sm"
              className={selectedRole === null ? "bg-emerald-600" : ""}
            >
              All ({CREDENTIALS.length})
            </Button>
            {roles.map((role) => (
              <Button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                variant={selectedRole === role.id ? "default" : "outline"}
                size="sm"
                className={selectedRole === role.id ? "bg-emerald-600" : ""}
              >
                {role.label} ({role.count})
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[95vw] mx-auto px-4 py-8">
        {displayedCredentials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              No credentials found matching your search.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCredentials.map((credential) => (
              <div
                key={credential.id}
                className={`bg-gradient-to-br ${credential.color} p-0.5 rounded-lg hover:shadow-lg transition-shadow`}
              >
                <div className="bg-slate-800 rounded-lg p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{credential.icon}</span>
                        <span className="bg-slate-700 text-slate-300 text-xs font-semibold px-2 py-1 rounded">
                          {credential.role.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {credential.firstName} {credential.lastName}
                      </h3>
                    </div>
                  </div>

                  {/* Business Name */}
                  <p className="text-slate-300 text-sm font-medium mb-4">
                    {credential.businessName}
                  </p>

                  {/* Description */}
                  <p className="text-slate-400 text-xs mb-4">
                    {credential.description}
                  </p>

                  {/* Divider */}
                  <div className="border-t border-slate-700 my-4"></div>

                  {/* Credentials */}
                  <div className="space-y-3 flex-1 mb-4">
                    {/* Username */}
                    <div>
                      <label className="text-slate-500 text-xs font-semibold uppercase">
                        Username
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-slate-900 text-emerald-400 px-2 py-1 rounded text-xs flex-1 overflow-x-auto font-mono">
                          {credential.username}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              credential.username,
                              `user-${credential.id}`,
                            )
                          }
                          className={`p-2 rounded transition-colors ${
                            copiedId === `user-${credential.id}`
                              ? "bg-green-600 text-white"
                              : "hover:bg-slate-700 text-slate-400"
                          }`}
                          title="Copy username"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-slate-500 text-xs font-semibold uppercase">
                        Email
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-slate-900 text-emerald-400 px-2 py-1 rounded text-xs flex-1 overflow-x-auto font-mono">
                          {credential.email}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              credential.email,
                              `email-${credential.id}`,
                            )
                          }
                          className={`p-2 rounded transition-colors ${
                            copiedId === `email-${credential.id}`
                              ? "bg-green-600 text-white"
                              : "hover:bg-slate-700 text-slate-400"
                          }`}
                          title="Copy email"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-slate-500 text-xs font-semibold uppercase">
                        Password
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code
                          className={`bg-slate-900 px-2 py-1 rounded text-xs flex-1 overflow-x-auto font-mono ${
                            showPasswords[credential.id]
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {showPasswords[credential.id]
                            ? credential.password
                            : "••••••••••"}
                        </code>
                        <button
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              [credential.id]: !prev[credential.id],
                            }))
                          }
                          className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400"
                          title="Toggle password visibility"
                        >
                          {showPasswords[credential.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              credential.password,
                              `pass-${credential.id}`,
                            )
                          }
                          className={`p-2 rounded transition-colors ${
                            copiedId === `pass-${credential.id}`
                              ? "bg-green-600 text-white"
                              : "hover:bg-slate-700 text-slate-400"
                          }`}
                          title="Copy password"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sector (if applicable) */}
                    {credential.sector && (
                      <div>
                        <label className="text-slate-500 text-xs font-semibold uppercase">
                          Sector
                        </label>
                        <div className="text-emerald-400 text-sm mt-1 capitalize">
                          {credential.sector}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleLoginClick(credential)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Quick Login
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Warning */}
      <div className="max-w-[95vw] mx-auto px-4 py-8 border-t border-slate-700">
        <div className="bg-red-950/30 border border-red-700/50 rounded-lg p-6 text-red-200 text-sm">
          <p className="font-semibold mb-2">⚠️ Security Notice</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              This page is for <strong>development and admin use only</strong>
            </li>
            <li>Never share or expose these credentials in production</li>
            <li>
              All passwords are test credentials and should be changed before
              production deployment
            </li>
            <li>
              Access to this page should be restricted to authorized personnel
              only
            </li>
            <li>
              Consider implementing IP whitelisting and additional
              authentication layers
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 text-center text-slate-500 text-xs">
        <p>Verso Air Business Intelligence Platform — Credentials Vault</p>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          📖 DOCUMENTATION SECTIONS — Everything you need in one place
          ═══════════════════════════════════════════════════════════════════════════════ */}

      {/* SECTION 1: ADMIN ACCESS GUIDE */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 border-t border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-8">
          📍 Admin Section Access Guide
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">
              🛡️ Admin Dashboard
            </h3>
            <p className="text-slate-300 mb-4">
              <strong>URL:</strong>{" "}
              <code className="bg-slate-900 px-2 py-1 rounded">
                /geo-admin/dashboard
              </code>
            </p>
            <p className="text-slate-300 mb-4">
              <strong>What You Can Do:</strong>
            </p>
            <ul className="text-slate-400 text-sm space-y-2 ml-4">
              <li>✅ Manage Businesses (CRUD)</li>
              <li>✅ Manage Categories (CRUD)</li>
              <li>✅ Manage Users (CRUD)</li>
              <li>✅ Manage Artists (CRUD)</li>
              <li>✅ Manage Jobs (CRUD)</li>
              <li>✅ Execute SQL Queries</li>
              <li>✅ Create Database Backups</li>
              <li>✅ Monitor System Health (CPU/Memory/Disk)</li>
            </ul>
            <p className="text-slate-400 text-xs mt-4">
              <strong>Auth:</strong> JWT token required (login first)
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-amber-400 mb-4">
              📊 Analytics Dashboards
            </h3>
            <p className="text-slate-300 mb-4">
              <strong>Available by Sector:</strong>
            </p>
            <ul className="text-slate-400 text-sm space-y-1 ml-4">
              <li>
                📱 <code>/commerce</code> — E-commerce analytics
              </li>
              <li>
                🏨 <code>/hotellerie</code> — Hotel & hospitality
              </li>
              <li>
                🏗️ <code>/batiment</code> — Construction & building
              </li>
              <li>
                🚗 <code>/automobile</code> — Auto dealership & services
              </li>
              <li>
                💰 <code>/finances</code> — Financial services
              </li>
              <li>
                🎭 <code>/divertissement</code> — Entertainment & arts
              </li>
              <li>
                🏥 <code>/sante</code> — Healthcare
              </li>
            </ul>
            <p className="text-slate-400 text-xs mt-4">
              <strong>Features:</strong> Real-time KPIs, charts, business
              directory
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-blue-400 mb-4">
              🔐 Auth Pages
            </h3>
            <ul className="text-slate-400 text-sm space-y-2 ml-4">
              <li>
                🔑 <code>/auth/signin</code> — Main login (full form)
              </li>
              <li>
                ⚡ <code>/auth/login</code> — Quick login
              </li>
              <li>
                🗝️ <code>/auth/password</code> — This page (dev only)
              </li>
            </ul>
            <p className="text-slate-300 mb-2 mt-4">
              <strong>Quick Login Tip:</strong>
            </p>
            <p className="text-slate-400 text-xs">
              Click "Quick Login" on any credential to auto-fill signin form
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-purple-400 mb-4">
              🎯 Other Portals
            </h3>
            <ul className="text-slate-400 text-sm space-y-1 ml-4">
              <li>
                🌍 <code>/geo-admin</code> — Geographic admin portal
              </li>
              <li>
                ✅ <code>/geo-admin/business-verification</code> — Verify
                businesses
              </li>
              <li>
                📁 <code>/admin/database</code> — Database management center
              </li>
              <li>
                🏠 <code>/admin/verification</code> — Verification page
              </li>
              <li>
                🎫 <code>/admin/tickets</code> — Ticket management
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERFORMANCE OPTIMIZATION */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 border-t border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-8">
          ⚡ Performance Optimization Checklist
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-emerald-700/50">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">
              ✅ Database Optimization
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>☑️ Enable query caching (Redis)</li>
              <li>☑️ Add database indexes on search fields</li>
              <li>☑️ Set up connection pooling (PgBouncer)</li>
              <li>☑️ Enable write-ahead logging (WAL)</li>
              <li>☑️ Schedule VACUUM ANALYZE daily</li>
              <li>☑️ Monitor slow queries with pg_stat_statements</li>
              <li>☑️ Partition large tables by date</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-amber-700/50">
            <h3 className="text-xl font-bold text-amber-400 mb-4">
              🚀 Frontend Optimization
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>☑️ Enable code splitting in Vite</li>
              <li>☑️ Lazy-load components with React.lazy()</li>
              <li>☑️ Optimize images (WebP, responsive)</li>
              <li>☑️ Use React Query staleTime: 5min</li>
              <li>☑️ Enable gzip compression</li>
              <li>☑️ Cache assets with Service Worker</li>
              <li>☑️ Minimize bundle size (&lt;500KB gzipped)</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-cyan-700/50">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              🔧 Server Optimization
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>☑️ Enable HTTP/2 push</li>
              <li>☑️ Set up reverse proxy (Nginx)</li>
              <li>☑️ Configure rate limiting</li>
              <li>☑️ Enable GZIP compression</li>
              <li>☑️ Use PM2 for process management</li>
              <li>☑️ Monitor with New Relic/DataDog</li>
              <li>☑️ Set up horizontal scaling</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-purple-700/50">
            <h3 className="text-xl font-bold text-purple-400 mb-4">
              📊 Monitoring & Metrics
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>☑️ Track Core Web Vitals</li>
              <li>☑️ Monitor database query times</li>
              <li>☑️ Set up error tracking (Sentry)</li>
              <li>☑️ Track API response times</li>
              <li>☑️ Monitor disk usage & backups</li>
              <li>☑️ Set up uptime monitoring</li>
              <li>☑️ Create performance dashboards</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 3: PRODUCTION DEPLOYMENT */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 border-t border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-8">
          🚀 Production Deployment Checklist
        </h2>

        <div className="bg-slate-800 rounded-lg p-8 border border-rose-700/50">
          <h3 className="text-xl font-bold text-rose-400 mb-6">
            ⚠️ Pre-Deployment (CRITICAL)
          </h3>

          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                1. Environment Variables
              </p>
              <code className="text-xs text-emerald-400 block mb-2">
                # Generate these FRESH for production:
              </code>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>
                  SESSION_SECRET=
                  <code className="bg-slate-800 px-1">
                    openssl rand -hex 32
                  </code>
                </li>
                <li>
                  JWT_SECRET=
                  <code className="bg-slate-800 px-1">
                    openssl rand -hex 32
                  </code>
                </li>
                <li>DATABASE_URL=postgresql://user:pass@host:5432/db</li>
                <li>
                  NODE_ENV=<code className="bg-slate-800 px-1">production</code>
                </li>
                <li>
                  VITE_API_URL=
                  <code className="bg-slate-800 px-1">
                    https://yourdomain.com
                  </code>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                2. Security Hardening
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>☑️ Enable HTTPS/TLS (Let's Encrypt)</li>
                <li>☑️ Set CORS_ORIGIN to your domain only</li>
                <li>☑️ Enable rate limiting on auth endpoints</li>
                <li>☑️ Configure firewall (ports 80, 443 only)</li>
                <li>☑️ Set strong database password (20+ chars)</li>
                <li>☑️ Enable 2FA for admin accounts</li>
                <li>
                  ☑️ Remove Credentials Vault (auto-disabled with
                  NODE_ENV=production)
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                3. Database Preparation
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>
                  ☑️ Run schema migration:{" "}
                  <code className="bg-slate-800 px-1">npm run db:push</code>
                </li>
                <li>☑️ Verify database backups are working</li>
                <li>☑️ Test restore procedure</li>
                <li>☑️ Set up automatic daily backups</li>
                <li>☑️ Create SSL connection from Node → PostgreSQL</li>
              </ul>
            </div>

            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                4. Build & Test
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>
                  ☑️ Run type check:{" "}
                  <code className="bg-slate-800 px-1">npm run check</code>
                </li>
                <li>
                  ☑️ Build production:{" "}
                  <code className="bg-slate-800 px-1">npm run build</code>
                </li>
                <li>☑️ Test all CRUD operations</li>
                <li>☑️ Test authentication & permissions</li>
                <li>☑️ Load test with 100+ concurrent users</li>
              </ul>
            </div>

            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                5. Deployment Steps
              </p>
              <code className="text-xs text-emerald-400 block space-y-1">
                <div>1. npm install --production</div>
                <div>2. npm run build</div>
                <div>3. npm run db:push</div>
                <div>
                  4. npm start (or use PM2: pm2 start npm --name verso-air --
                  start)
                </div>
                <div>5. Verify on https://yourdomain.com</div>
              </code>
            </div>

            <div className="bg-slate-900 p-4 rounded">
              <p className="text-slate-300 font-semibold mb-2">
                6. Post-Deployment
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>☑️ Test all endpoints with cURL</li>
                <li>☑️ Monitor server logs for errors</li>
                <li>☑️ Set up alerting & monitoring</li>
                <li>☑️ Enable SSL certificate auto-renewal</li>
                <li>
                  ☑️ Document credentials in secure vault (LastPass/1Password)
                </li>
                <li>☑️ Create incident response playbook</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: CREDENTIALS REFERENCE */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 border-t border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-8">
          🔑 Credentials Format & Reference
        </h2>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">
            📋 All Credentials in This Vault
          </h3>
          <p className="text-slate-300 mb-4">
            Total:{" "}
            <strong className="text-emerald-400">
              {displayedCredentials.length}
            </strong>{" "}
            test accounts
          </p>
          <p className="text-slate-400 text-sm">
            All passwords follow format:{" "}
            <code className="bg-slate-900 px-2 py-1 rounded">
              [Role/Name]@2026!
            </code>
          </p>
          <p className="text-slate-400 text-sm">
            Examples: SuperAdmin@2026!, CommAdmin@2026!, Business@2026!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-amber-400 mb-4">
              👤 By Role Type
            </h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>
                <strong className="text-white">Superuser:</strong> Full system
                access
              </li>
              <li>
                <strong className="text-white">Admin:</strong> Sector management
              </li>
              <li>
                <strong className="text-white">Moderator:</strong> Content
                moderation
              </li>
              <li>
                <strong className="text-white">Business Owner:</strong> Business
                management
              </li>
              <li>
                <strong className="text-white">User:</strong> Regular user
                access
              </li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-purple-400 mb-4">
              🌍 By Sector
            </h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>📱 Commerce (E-commerce)</li>
              <li>🏨 Hotellerie (Hotels)</li>
              <li>🏗️ Batiment (Construction)</li>
              <li>🚗 Automobile (Auto)</li>
              <li>💰 Finance (Financial)</li>
              <li>🎭 Divertissement (Entertainment)</li>
              <li>🏥 Sante (Healthcare)</li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-emerald-700/50 mt-6">
          <p className="text-emerald-400 text-sm font-semibold mb-2">
            💡 Pro Tips for Organization:
          </p>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>✅ Use the search bar above to find credentials quickly</li>
            <li>✅ Filter by role type to test different permission levels</li>
            <li>✅ Click "Quick Login" to auto-fill the signin form</li>
            <li>
              ✅ Copy credentials (passwords show on hover) to test manually
            </li>
            <li>
              ✅ Use Superuser@2026! for full admin access during development
            </li>
          </ul>
        </div>
      </div>

      {/* FOOTER */}
      <div className="max-w-[95vw] mx-auto px-4 py-12 text-center text-slate-500 text-xs border-t border-slate-700">
        <p className="mb-2">
          🔐 Verso Air Business Intelligence Platform — Complete Developer
          Reference
        </p>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        <p className="text-slate-600">
          Keep this page bookmarked for quick access to credentials, API
          endpoints, and deployment info
        </p>
      </div>
    </div>
  );
}
