import { useLocalizedContent } from "@/hooks/use-localized-content";
import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";
import { SeoHead } from "@/components/seo/SeoHead";

export default function AcceptableUsePolicy() {
  const localize = useLocalizedContent();

  return (
    <>
      <SeoHead
        title="Acceptable Use Policy | Verso Air"
        description="Review the rules for using Verso Air, including prohibited conduct, business listings, and user content."
        canonicalPath="/aup"
      />
      {localize((
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      <ScrollableNavbar isAuthenticated={false} />
      <div className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-amber-800 transition-colors hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
          <FileText className="h-6 w-6 text-slate-900" />
        </div>
        <div>
      <h1 className="text-3xl font-bold text-slate-900">Acceptable Use Policy</h1>
      
      <p className="text-sm text-slate-700">
        <strong>Effective Date:</strong> November 15, 2026<br />
        <strong>Last Updated:</strong> November 15, 2026
      </p>
        </div>
      </div>

      <div className="prose max-w-none space-y-8 text-slate-700">

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">Overview</h2>
        <p>
          Verso Air is committed to providing a safe, trustworthy directory for businesses and users. This Acceptable Use Policy (AUP) defines prohibited conduct and content. By using Verso Air, you agree to comply with this AUP.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">1. Prohibited Activities</h2>
        
        <h3 className="text-lg font-semibold mt-6">1.1 Illegal Activities</h3>
        <p>You must not use Verso Air for:</p>
        <ul>
          <li>Violating Canadian federal, provincial or territorial laws</li>
          <li>Money laundering, fraud or deception</li>
          <li>Human trafficking or exploitation</li>
          <li>Sanctions evasion or export control violations</li>
          <li>Tax evasion or financial crimes</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.2 Harmful Content</h3>
        <p>You must not post or transmit:</p>
        <ul>
          <li>Hate speech, discrimination or harassment targeting protected groups</li>
          <li>Threats of violence or intimidation</li>
          <li>Sexual content involving minors</li>
          <li>Glorification of violence or self-harm</li>
          <li>Defamatory, libelous or slanderous content</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.3 Misinformation</h3>
        <p>You must not:</p>
        <ul>
          <li>Misrepresent business credentials, licenses or authorizations</li>
          <li>Post fake, fabricated or fraudulent reviews</li>
          <li>Artificially inflate ratings or engagement metrics</li>
          <li>Make unsupported health, medical or scientific claims</li>
          <li>Mislead about geographic location or service area</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.4 Technical Abuse</h3>
        <p>You must not:</p>
        <ul>
          <li>Scrape, crawl or automatically access Verso Air using bots</li>
          <li>Conduct denial-of-service (DoS) attacks or network scanning</li>
          <li>Attempt SQL injection, cross-site scripting (XSS) or other injection attacks</li>
          <li>Reverse engineer, decompile or attempt to access source code</li>
          <li>Bypass security controls or authentication mechanisms</li>
          <li>Use automated tools to mass-upload, mass-modify or mass-delete content</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.5 Spam & Manipulation</h3>
        <p>You must not:</p>
        <ul>
          <li>Create duplicate or multiple listings for the same business without authorization</li>
          <li>Artificially boost your ranking through manipulation</li>
          <li>Post unsolicited commercial messages (spam)</li>
          <li>Send referral spam, comment spam or link spam</li>
          <li>Manipulate review counts, ratings or metrics</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.6 Intellectual Property Violation</h3>
        <p>You must not:</p>
        <ul>
          <li>Use copyrighted images, text or media without proper licensing or permission</li>
          <li>Infringe on trademarks, service marks or brand names</li>
          <li>Post plagiarized or uncredited content</li>
          <li>Violate third-party intellectual property rights</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.7 Impersonation</h3>
        <p>You must not:</p>
        <ul>
          <li>Impersonate another person, business or organization</li>
          <li>Create fake business entities or shell companies</li>
          <li>Misrepresent your identity or authority</li>
          <li>Authorize others to act on your behalf without proper consent</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">1.8 Privacy & Data Violations</h3>
        <p>You must not:</p>
        <ul>
          <li>Collect, use or disclose personal information without consent</li>
          <li>Share customer data, email lists or contact information</li>
          <li>Violate another user's privacy or confidentiality</li>
          <li>Post private information (phone, address, SSN) without authorization</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">2. Content Guidelines</h2>
        
        <h3 className="text-lg font-semibold mt-6">2.1 Business Listings</h3>
        <p>Your business listing must be:</p>
        <ul>
          <li>Accurate and up-to-date</li>
          <li>Representative of a real, operating business</li>
          <li>Compliant with all applicable laws and regulations</li>
          <li>Free of misleading claims or exaggerations</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">2.2 Descriptions & Media</h3>
        <p>Your business description and media must:</p>
        <ul>
          <li>Describe the business accurately</li>
          <li>Use original images or properly licensed photos</li>
          <li>Not contain spam, promotional codes or links to competitors</li>
          <li>Not include inappropriate, offensive or adult content</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">2.3 Reviews & Ratings</h3>
        <p>Reviews and ratings must:</p>
        <ul>
          <li>Be based on genuine personal experience</li>
          <li>Not be written by employees, competitors or affiliates</li>
          <li>Not be incentivized or paid for</li>
          <li>Not include links, promotional material or contact information</li>
          <li>Comply with this AUP and apply local consumer protection laws</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">3. Enforcement & Consequences</h2>
        
        <h3 className="text-lg font-semibold mt-6">3.1 Warning</h3>
        <p>
          For minor or first-time violations, Verso Air may issue a warning and request remediation within 7 days.
        </p>

        <h3 className="text-lg font-semibold mt-6">3.2 Suspension</h3>
        <p>
          For repeated violations or serious breaches, Verso Air may suspend your account or business listing, restricting access for 7–90 days.
        </p>

        <h3 className="text-lg font-semibold mt-6">3.3 Termination</h3>
        <p>
          For severe violations (illegal activity, repeated abuse, impersonation), Verso Air may permanently terminate your account and delete your content.
        </p>

        <h3 className="text-lg font-semibold mt-6">3.4 Immediate Action</h3>
        <p>
          Verso Air may take immediate action (suspension or termination) without prior warning if the violation is:
        </p>
        <ul>
          <li>Illegal or poses imminent harm</li>
          <li>Involves exploitation, abuse or threats</li>
          <li>Contains malware or security threats</li>
          <li>Violates third-party rights egregiously</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">3.5 Appeal Process</h3>
        <p>
          If your account is suspended or terminated, you may appeal within 30 days by contacting support@versoair.com. Verso Air will review your appeal and respond within 10 business days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">4. Reporting Violations</h2>
        <p>
          If you believe a user, listing or content violates this AUP, please report it to support@versoair.com with details and evidence. Include:
        </p>
        <ul>
          <li>Business or user ID</li>
          <li>Specific violation (reference section)</li>
          <li>Screenshots, links or supporting evidence</li>
          <li>Your contact information</li>
        </ul>
        <p className="mt-4">
          Verso Air will investigate and take appropriate action within 10 business days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">5. Disclaimer</h2>
        <p>
          Verso Air does not endorse, warrant or guarantee any business, product or service listed on the platform. Users rely on their own due diligence to verify credentials, quality and legitimacy. Verso Air is not liable for harm, fraud or disputes between users and businesses.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">6. Changes to This Policy</h2>
        <p>
          Verso Air may modify this AUP at any time. Changes are effective upon posting. Continued use of the service constitutes acceptance of the updated AUP.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-amber-800 border-b border-slate-300 pb-2">7. Contact</h2>
        <p>
          For questions or concerns about this AUP, contact:
        </p>
        <div className="bg-white/5 rounded-xl p-4 border border-slate-300">
          <p className="text-slate-900 font-medium">VERSO AIR INC.</p>
          <p className="text-slate-700 text-sm">Email: support@versoair.com</p>
          <p className="text-slate-700 text-sm">
            Platform:{" "}
            <Link href="/contact" className="text-amber-800 underline">
              Contact Page
            </Link>
          </p>
        </div>
      </section>

      <hr className="my-8" />
      <p className="text-sm text-gray-600">
        <strong>Last Reviewed:</strong> November 15, 2026<br />
        <strong>Next Review:</strong> May 15, 2027
      </p>
      </div>
      </div>
    </div>
      ))}
    </>
  );
}
