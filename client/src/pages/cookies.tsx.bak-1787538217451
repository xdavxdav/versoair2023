import { Link } from "wouter";
import { Cookie, ArrowLeft } from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ScrollableNavbar isAuthenticated={false} />
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Cookie className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cookie Policy</h1>
            <p className="text-gray-400 text-sm">
              Last updated: March 13, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-amber max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              1. What Are Cookies?
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Cookies are small text files stored on your device when you visit
              a website. They help the website remember your preferences, keep
              you logged in, and understand how you interact with the site.
              Verso Air™ uses cookies to provide a secure, personalized
              experience across our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              2. Cookies We Use
            </h2>

            {/* Cookie Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-amber-400 font-semibold">
                      Cookie
                    </th>
                    <th className="text-left py-3 px-2 text-amber-400 font-semibold">
                      Type
                    </th>
                    <th className="text-left py-3 px-2 text-amber-400 font-semibold">
                      Purpose
                    </th>
                    <th className="text-left py-3 px-2 text-amber-400 font-semibold">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      connect.sid
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                        Essential
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      Express session cookie — keeps you logged in and
                      authenticated
                    </td>
                    <td className="py-3 px-2">Session</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      token
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                        Essential
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      JWT authentication token (HTTP-only, secure) for API
                      access
                    </td>
                    <td className="py-3 px-2">7 days</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      verso_portal
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                        Functional
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      Remembers your selected portal (General, Artist, Geo
                      Admin, Contractor)
                    </td>
                    <td className="py-3 px-2">30 days</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      verso_theme
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                        Functional
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      Stores dark/light theme preference
                    </td>
                    <td className="py-3 px-2">1 year</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      _ga / _gid
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs">
                        Analytics
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      Google Analytics (G-V74QCY3MYD) — anonymous usage tracking
                    </td>
                    <td className="py-3 px-2">2 years / 24h</td>
                  </tr>
                  <tr className="border-b border-gray-800/50">
                    <td className="py-3 px-2 font-mono text-xs text-white">
                      _gat
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs">
                        Analytics
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      Google Analytics throttle cookie — limits request rate
                    </td>
                    <td className="py-3 px-2">1 minute</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              3. Cookie Categories Explained
            </h2>

            <div className="space-y-4 mt-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Essential Cookies
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  Required for the Platform to function. These handle
                  authentication, session management, and security (CSRF
                  protection). Disabling these would prevent login and core
                  features.{" "}
                  <strong className="text-white">Cannot be opted out.</strong>
                </p>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Functional Cookies
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  Enhance your experience by remembering preferences like portal
                  selection and theme. The Platform works without these, but
                  you'd need to re-select preferences each visit.
                </p>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                <h3 className="text-yellow-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Analytics Cookies
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  Help us understand how visitors interact with the Platform via
                  Google Analytics. Data is anonymized — no personally
                  identifiable information is collected. Used to improve
                  features and user experience.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              4. Local Storage & Session Storage
            </h2>
            <p className="text-gray-300 leading-relaxed">
              In addition to cookies, Verso Air uses browser local storage for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                <strong className="text-white font-mono text-xs">
                  verso_favorites
                </strong>{" "}
                — Your saved/bookmarked businesses
              </li>
              <li>
                <strong className="text-white font-mono text-xs">
                  verso_search_history
                </strong>{" "}
                — Recent search queries (stored locally only)
              </li>
              <li>
                <strong className="text-white font-mono text-xs">
                  verso_notification_prefs
                </strong>{" "}
                — Notification preferences
              </li>
              <li>
                <strong className="text-white font-mono text-xs">
                  tanstack_query_cache
                </strong>{" "}
                — React Query data cache for faster page loads
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-2">
              Local storage data never leaves your browser and is not
              transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              5. Managing Cookies
            </h2>
            <p className="text-gray-300 leading-relaxed">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                <strong className="text-white">Chrome:</strong> Settings →
                Privacy and Security → Cookies and Other Site Data
              </li>
              <li>
                <strong className="text-white">Firefox:</strong> Settings →
                Privacy & Security → Cookies and Site Data
              </li>
              <li>
                <strong className="text-white">Safari:</strong> Preferences →
                Privacy → Manage Website Data
              </li>
              <li>
                <strong className="text-white">Edge:</strong> Settings →
                Privacy, Search and Services → Cookies
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-2">
              To opt out of Google Analytics specifically, install the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 underline"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              6. Changes to This Policy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Cookie Policy to reflect changes in technology
              or legal requirements. Check this page periodically for updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              7. Contact
            </h2>
            <div className="bg-white/5 rounded-xl p-4 border border-gray-800">
              <p className="text-white font-medium">
                Verso Air™ — Privacy Team
              </p>
              <p className="text-gray-400 text-sm">
                Email: privacy@versoair.com
              </p>
              <p className="text-gray-400 text-sm">
                See also:{" "}
                <Link href="/privacy" className="text-amber-400 underline">
                  Privacy Policy
                </Link>{" "}
                ·{" "}
                <Link href="/gdpr" className="text-amber-400 underline">
                  GDPR
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
