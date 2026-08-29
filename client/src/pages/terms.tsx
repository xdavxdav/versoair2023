import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      <ScrollableNavbar isAuthenticated={false} />
      <div className="mx-auto max-w-4xl px-4 py-16">
        {/* Back link */}
        <Link href="/">
          <a className="mb-8 inline-flex items-center gap-2 text-amber-600 transition-colors hover:text-amber-700">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </Link>

        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Terms of Service
            </h1>
            <p className="text-sm text-slate-500">
              Last updated: March 13, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose max-w-none space-y-8 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using the Verso Air™ platform ("Platform"),
              including the Business Directory, Analytics Dashboards,
              StreamRoyale Artist Portal, Marketplace, VersoAI assistant, and
              any associated services, you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree, you may not use the
              Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              2. Eligibility
            </h2>
            <p className="text-slate-700 leading-relaxed">
              You must be at least 16 years old to use Verso Air. By creating an
              account, you represent that you meet this age requirement and have
              the legal authority to enter into these Terms. Business accounts
              must be operated by individuals authorized to represent their
              organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              3. User Accounts
            </h2>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>
                You are responsible for maintaining the confidentiality of your
                password and account credentials
              </li>
              <li>
                You may not share account access or transfer your account to
                another person
              </li>
              <li>
                You must immediately notify us of any unauthorized access at{" "}
                <strong className="text-white">support@versoair.com</strong>
              </li>
              <li>
                Accounts inactive for more than 12 months may be deactivated
                after notice
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              4. Portal Access & Subscriptions
            </h2>
            <p className="text-slate-700 leading-relaxed">
              Verso Air offers multiple portal tiers:
            </p>
            <div className="grid gap-3 mt-3">
              <div className="bg-white/5 border border-slate-300 rounded-lg p-3">
                <p className="text-white font-medium">General Portal (Free)</p>
                <p className="text-slate-500 text-sm">
                  Browse businesses, view public analytics, basic search
                  functionality
                </p>
              </div>
              <div className="bg-white/5 border border-slate-300 rounded-lg p-3">
                <p className="text-white font-medium">
                  Artist Portal — StreamRoyale
                </p>
                <p className="text-slate-500 text-sm">
                  Artist profiles, release tracking, royalty analytics,
                  promotional tools
                </p>
              </div>
              <div className="bg-white/5 border border-slate-300 rounded-lg p-3">
                <p className="text-white font-medium">
                  Geo Admin Portal (Premium)
                </p>
                <p className="text-slate-500 text-sm">
                  Geographic data management, regional business oversight,
                  advanced analytics
                </p>
              </div>
              <div className="bg-white/5 border border-slate-300 rounded-lg p-3">
                <p className="text-white font-medium">Contractor Portal</p>
                <p className="text-slate-500 text-sm">
                  Apply for projects, manage bids, track assignments across
                  sectors
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mt-3">
              Premium subscriptions are billed monthly or annually via Stripe.
              Cancellations take effect at the end of the current billing
              period. No refunds are provided for partial months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              5. Marketplace Rules
            </h2>
            <p className="text-slate-700 leading-relaxed">
              The Verso Air Marketplace connects buyers and sellers. By listing
              or purchasing:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>Listings must be accurate and not misleading</li>
              <li>
                Prohibited items: counterfeit goods, illegal products, weapons,
                drugs, or any items violating applicable law
              </li>
              <li>
                Sellers are responsible for fulfillment and customer service for
                their listings
              </li>
              <li>
                Verso Air may remove listings that violate these Terms without
                notice
              </li>
              <li>
                Transaction disputes should first be resolved between buyer and
                seller; Verso Air may mediate if needed
              </li>
              <li>
                Verso Air may charge a platform fee on completed transactions
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              6. VersoAI Usage
            </h2>
            <p className="text-slate-700 leading-relaxed">
              VersoAI is an AI-powered assistant that uses large language models
              (powered by Groq and Ollama) to answer questions. You understand
              that:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>
                VersoAI responses are generated by AI and may not always be
                accurate
              </li>
              <li>
                VersoAI should not be used as a substitute for professional
                legal, medical, or financial advice
              </li>
              <li>
                Conversations are not permanently stored but may be processed by
                third-party AI providers
              </li>
              <li>
                You must not use VersoAI to generate harmful, illegal, or
                abusive content
              </li>
              <li>
                Verso Air is not liable for decisions made based on VersoAI
                responses
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              7. Content & Intellectual Property
            </h2>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>
                You retain ownership of content you upload (listings, reviews,
                business profiles)
              </li>
              <li>
                By posting content, you grant{" "}
                <span className="notranslate">Verso Air</span> a worldwide,
                non-exclusive, royalty-free license to display, distribute, and
                promote your content within the Platform
              </li>
              <li>
                The <span className="notranslate">Verso Air</span> brand,{" "}
                <span className="notranslate">"STRΔΦGHT TΩ THΞ PΩΦΠT"</span>{" "}
                tagline, design elements, and source code are proprietary
              </li>
              <li>
                You may not scrape, reverse-engineer, or replicate Platform
                functionality without written permission
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              8. Prohibited Conduct
            </h2>
            <p className="text-slate-700 leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li>
                Use bots, scrapers, or automated tools to access the Platform
                without permission
              </li>
              <li>
                Attempt to bypass authentication, security features, or rate
                limiting
              </li>
              <li>
                Post false reviews, fake business listings, or misleading
                information
              </li>
              <li>Impersonate another user, business, or Verso Air staff</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Use the Platform for spamming, phishing, or harassment</li>
              <li>
                Violate any applicable local, national, or international law
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              9. Termination
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We may suspend or terminate your account at any time for violation
              of these Terms or for any reason with reasonable notice. You may
              delete your account at any time through your account settings.
              Upon termination, your right to use the Platform ceases
              immediately. Data deletion follows our{" "}
              <Link href="/privacy" className="text-amber-600 underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              10. Disclaimers
            </h2>
            <p className="text-slate-700 leading-relaxed uppercase text-sm">
              The Platform is provided "as is" and "as available" without
              warranties of any kind, express or implied. Verso Air does not
              guarantee the accuracy, completeness, or reliability of business
              listings, analytics data, or AI-generated responses. Use the
              Platform at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              11. Limitation of Liability
            </h2>
            <p className="text-slate-700 leading-relaxed">
              To the maximum extent permitted by law, Verso Air shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Platform, including
              but not limited to loss of profits, data, or business
              opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              12. Governing Law
            </h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms are governed by and construed in accordance with the
              laws of the State of California, United States, without regard to
              conflict-of-law provisions. Any disputes shall be resolved in the
              courts of California.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              13. Changes to Terms
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. Material
              changes will be communicated via email or prominent Platform
              notice. Continued use after changes constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2">
              14. Contact
            </h2>
            <div className="bg-white/5 rounded-xl p-4 border border-slate-300">
              <p className="text-white font-medium">Verso Air™ — Legal Team</p>
              <p className="text-slate-500 text-sm">
                Email: legal@versoair.com
              </p>
              <p className="text-slate-500 text-sm">
                Platform:{" "}
                <Link href="/contact" className="text-amber-600 underline">
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
