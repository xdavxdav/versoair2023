import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";

export default function PrivacyPolicy() {
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
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-gray-400 text-sm">
              Last updated: March 13, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-amber max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              1. Introduction
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Verso Air™ ("we," "our," or "us") operates the Verso Air business
              intelligence platform, including all related services such as the
              Business Directory, Geo Admin Portal, Artist Portal
              (StreamRoyale), Marketplace, and VersoAI assistant (collectively,
              the "Platform"). This Privacy Policy explains how we collect, use,
              disclose, and safeguard your personal information when you use our
              Platform.
            </p>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using Verso Air, you agree to the terms of this
              Privacy Policy. If you do not agree, please discontinue use of the
              Platform immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              2. Information We Collect
            </h2>
            <h3 className="text-lg font-medium text-white mt-4">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                <strong>Account Data:</strong> Email address, username, password
                (hashed), display name when you register
              </li>
              <li>
                <strong>Profile Data:</strong> Business information, artist
                profiles (stage name, genre, country), contractor details
                (specialization, hourly rate)
              </li>
              <li>
                <strong>Portal Data:</strong> Subscription tier, payment
                information (processed by Stripe — we never store card numbers),
                billing history
              </li>
              <li>
                <strong>Content:</strong> Marketplace listings, business
                reviews, messages, and any content you upload
              </li>
              <li>
                <strong>Communications:</strong> Contact form submissions, SAV
                support tickets, VersoAI chat conversations
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used,
                search queries, session duration
              </li>
              <li>
                <strong>Device Data:</strong> Browser type, operating system,
                screen resolution, IP address
              </li>
              <li>
                <strong>Analytics:</strong> Google Analytics (G-V74QCY3MYD) for
                anonymous usage statistics
              </li>
              <li>
                <strong>Cookies:</strong> Session cookies for authentication,
                preference cookies (see our{" "}
                <Link href="/cookies" className="text-amber-400 underline">
                  Cookie Policy
                </Link>
                )
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                Provide, operate, and maintain the Platform (business directory,
                analytics dashboards, reservations)
              </li>
              <li>
                Authenticate users and manage portal access (General, Artist,
                Geo Admin, Contractor, Community)
              </li>
              <li>Process payments and subscriptions through Stripe</li>
              <li>
                Power VersoAI — our AI assistant uses your queries to provide
                grounded, database-backed answers (conversations are not stored
                permanently)
              </li>
              <li>
                Send transactional emails (verification, password reset, booking
                confirmations)
              </li>
              <li>
                Generate anonymized analytics for sector dashboards (Commerce,
                Hospitality, Construction, etc.)
              </li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              4. Data Sharing & Third Parties
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We do not sell your personal data. We share data only with:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>
                <strong>Stripe:</strong> Payment processing (PCI-DSS compliant)
              </li>
              <li>
                <strong>Groq / Ollama:</strong> AI inference for VersoAI chat
                (queries only, no personal identifiers sent)
              </li>
              <li>
                <strong>Google Analytics:</strong> Anonymous usage statistics
              </li>
              <li>
                <strong>Neon / PostgreSQL:</strong> Database hosting (your data
                is stored encrypted at rest)
              </li>
              <li>
                <strong>Render:</strong> Application hosting infrastructure
              </li>
              <li>
                <strong>Law enforcement:</strong> When required by valid legal
                process
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              5. Data Retention
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account data for as long as your account is active.
              Business directory listings, reviews, and artist profiles remain
              on the Platform until you delete them or request removal. VersoAI
              chat conversations are not stored beyond the active session.
              Payment records are retained for 7 years for legal compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              6. Your Rights
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-2">
              For GDPR-specific rights, see our{" "}
              <Link href="/gdpr" className="text-amber-400 underline">
                GDPR page
              </Link>
              . To exercise any rights, contact us at{" "}
              <strong className="text-white">privacy@versoair.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              7. Security
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures including bcrypt
              password hashing (12 salt rounds), JWT-based authentication with
              HTTP-only cookies, rate limiting on auth endpoints, CSRF
              protection, and encrypted database connections (SSL/TLS). However,
              no system is 100% secure — use strong, unique passwords.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              8. Children's Privacy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Verso Air is not directed to individuals under 16. We do not
              knowingly collect data from children. If you believe a child has
              provided us with personal data, contact us and we will promptly
              delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated "Last updated" date.
              Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 border-b border-gray-800 pb-2">
              10. Contact
            </h2>
            <p className="text-gray-300 leading-relaxed">
              For privacy inquiries, data requests, or complaints:
            </p>
            <div className="bg-white/5 rounded-xl p-4 mt-2 border border-gray-800">
              <p className="text-white font-medium">
                Verso Air™ — Privacy Team
              </p>
              <p className="text-gray-400 text-sm">
                Email: privacy@versoair.com
              </p>
              <p className="text-gray-400 text-sm">
                Platform:{" "}
                <Link href="/contact" className="text-amber-400 underline">
                  Contact Page
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
