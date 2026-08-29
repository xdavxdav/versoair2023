/**
 * Information Hub — Single-page legal & info center for Verso Air™
 *
 * Tab carousel: Overview | Terms | Privacy | GDPR | Cookies | Trademark |
 *               Competition | Contracts | Jurisdiction | FAQ
 *
 * Each tab is a scrollable section within the same page.
 * Route: /information
 */

import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import ScrollableNavbar from "@/components/ScrollableNavbar";
import {
  ArrowLeft,
  Shield,
  FileText,
  Globe,
  Cookie,
  Award,
  Trophy,
  ScrollText,
  Scale,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  BookOpen,
  Gavel,
  MapPin,
  Building2,
  Users,
  Music,
  DollarSign,
  Lock,
  Eye,
  Trash2,
  Download,
  Mail,
  Star,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TAB DEFINITIONS — ranked by importance
   ═══════════════════════════════════════════════════════════ */

const TABS = [
  { id: "overview", label: "Aperçu", icon: BookOpen, priority: 1 },
  {
    id: "terms",
    label: "Conditions d'Utilisation",
    icon: FileText,
    priority: 2,
  },
  { id: "privacy", label: "Confidentialité", icon: Shield, priority: 3 },
  { id: "gdpr", label: "Protection des Données", icon: Lock, priority: 4 },
  { id: "cookies", label: "Cookies", icon: Cookie, priority: 5 },
  { id: "trademark", label: "Marque Déposée", icon: Award, priority: 6 },
  { id: "competition", label: "Concours", icon: Trophy, priority: 7 },
  {
    id: "contracts",
    label: "Contrats Artistes",
    icon: ScrollText,
    priority: 8,
  },
  { id: "jurisdiction", label: "Juridiction", icon: Scale, priority: 9 },
  { id: "faq", label: "FAQ", icon: HelpCircle, priority: 10 },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ═══════════════════════════════════════════════════════════
   ACCORDION COMPONENT
   ═══════════════════════════════════════════════════════════ */

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-amber-700 font-medium">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-slate-700 leading-relaxed space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION HEADING
   ═══════════════════════════════════════════════════════════ */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-xl font-semibold text-amber-600 border-b border-slate-300 pb-2 mt-8 mb-4">
      {number}. {title}
    </h2>
  );
}

function SubHeading({ title }: { title: string }) {
  return (
    <h3 className="text-lg font-medium text-amber-700/80 mt-5 mb-2">{title}</h3>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
  variant = "default",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  variant?: "default" | "warning" | "success" | "info";
}) {
  const colors = {
    default: "border-slate-300 bg-gray-900/50",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };
  const iconColors = {
    default: "text-amber-600",
    warning: "text-amber-600",
    success: "text-emerald-400",
    info: "text-blue-400",
  };
  return (
    <div className={`border rounded-xl p-5 ${colors[variant]}`}>
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[variant]}`}
        />
        <div>
          <p className="font-medium text-slate-900 mb-2">{title}</p>
          <div className="text-slate-700 text-sm leading-relaxed space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB CONTENT SECTIONS
   ═══════════════════════════════════════════════════════════ */

function OverviewTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-700 leading-relaxed text-lg">
        Bienvenue au{" "}
        <strong className="text-slate-900">Centre d'Information Verso Air™</strong>{" "}
        — votre référence unique pour tous les documents juridiques, politiques
        de la plateforme, règles de concours, conditions des contrats artistes
        et informations de conformité réglementaire.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={Building2} title="À Propos de Verso Air™">
          <p>
            Verso Air est une plateforme d'intelligence d'affaires full-stack
            pour l'analytique multi-sectorielle — commerce, hôtellerie,
            construction, automobile, finance, santé, immobilier et
            divertissement. Siège social à Toronto, Canada, opérant
            mondialement.
          </p>
        </InfoCard>
        <InfoCard icon={Music} title="Plateforme Artiste StreamRoyale™">
          <p>
            Notre portail artiste intégré et système de compétition streaming.
            Les artistes téléchargent leur musique originale, gagnent des
            redevances par écoute, participent à des pools hebdomadaires et
            progressent via notre système de badges (Initié → Titan Légendaire).
          </p>
        </InfoCard>
        <InfoCard icon={Globe} title="Opérations Mondiales">
          <p>
            Verso Air opère dans tous les pays où les utilisateurs peuvent
            accéder à la plateforme. Nous respectons les lois de protection des
            données dans plus de 10 juridictions, dont le RGPD UE, le RGPD UK,
            le CCPA/CPRA US, le PIPEDA Canada, le LGPD Brésil, et plus.
          </p>
        </InfoCard>
        <InfoCard icon={Shield} title="Vos Droits Comptent">
          <p>
            Vous avez le droit d'accéder, de rectifier, de supprimer et de
            porter vos données à tout moment. Contactez{" "}
            <a
              href="mailto:privacy@versoair.com"
              className="text-amber-600 hover:underline"
            >
              privacy@versoair.com
            </a>{" "}
            pour toute demande relative aux données.
          </p>
        </InfoCard>
      </div>

      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-amber-600 mb-3">
          Navigation Rapide
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TABS.filter((t) => t.id !== "overview").map((tab) => (
            <span
              key={tab.id}
              className="text-sm text-slate-700 flex items-center gap-2"
            >
              <tab.icon className="w-3.5 h-3.5 text-amber-600/60" />
              {tab.label}
            </span>
          ))}
        </div>
      </div>

      <InfoCard
        icon={Clock}
        title="Statut de la Marque — Nouveau Dépôt en Cours"
        variant="info"
      >
        <p>
          <strong>VERSO AIR</strong> — Office de la Propriété Intellectuelle du
          Canada (OPIC) Demande #2264074. Déposée initialement le 14 juin 2023.
          Catégorie : Marque (Design). Classe Nice 41 — Services de
          divertissement, production et distribution de contenu multimédia. La
          demande initiale a nécessité un nouveau dépôt en raison d'une question
          de traitement administratif.{" "}
          <strong>
            Une nouvelle demande est en cours de préparation et sera soumise
            prochainement.
          </strong>{" "}
          Le nom Verso Air et le logo de l'aigle restent protégés par les droits
          de marque de common law.
        </p>
      </InfoCard>
    </div>
  );
}

function TermsTab() {
  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm italic">
        Last updated: March 22, 2026 — Effective immediately upon access.
      </p>

      <SectionHeading number="1" title="Acceptance of Terms" />
      <p className="text-slate-700 leading-relaxed">
        By accessing or using Verso Air™ (the "Platform"), including all
        sub-platforms (StreamRoyale, Marketplace, Geo Admin, VersoAI, Artist
        Portal), you agree to be bound by these Terms of Service ("Terms"). If
        you do not agree, you must discontinue use immediately. These Terms
        constitute a legally binding agreement between you and Verso Air Inc.
        ("Company", "we", "us").
      </p>

      <SectionHeading number="2" title="Eligibility" />
      <p className="text-slate-700 leading-relaxed">
        You must be at least 16 years old to use the Platform. Users under 18
        require parental or guardian consent. By registering, you represent that
        all information provided is truthful and that you have the legal
        capacity to enter into this agreement in your jurisdiction.
      </p>

      <SectionHeading number="3" title="Account Registration & Security" />
      <p className="text-slate-700 leading-relaxed">
        You are responsible for maintaining the confidentiality of your account
        credentials. Sharing login information is prohibited. You must notify us
        immediately of unauthorized access. Accounts may be suspended or
        terminated for violation of these Terms. Multi-account abuse for the
        purpose of manipulating competitions, royalties, or analytics is grounds
        for permanent ban and forfeiture of pending earnings.
      </p>

      <SectionHeading number="4" title="Services de la Plateforme" />
      <div className="space-y-3">
        <p className="text-slate-700 leading-relaxed">
          Verso Air provides the following services, each subject to additional
          sector-specific terms:
        </p>
        <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
          <li>
            <strong>Business Intelligence</strong> — Analytics dashboards across
            8+ sectors
          </li>
          <li>
            <strong>Business Directory</strong> — Verified listings with ratings
            and search
          </li>
          <li>
            <strong>Geo Admin Portal</strong> — Geographic data management and
            administration
          </li>
          <li>
            <strong>StreamRoyale™</strong> — Artist streaming platform with
            royalty distribution
          </li>
          <li>
            <strong>Marketplace</strong> — E-commerce platform for goods and
            services
          </li>
          <li>
            <strong>VersoAI</strong> — AI-powered business analytics assistant
          </li>
          <li>
            <strong>Marketing Hub</strong> — Print services, newsletters, and ad
            campaigns
          </li>
          <li>
            <strong>SAV 24/7</strong> — Customer support and ticket management
          </li>
        </ul>
      </div>

      <SectionHeading number="5" title="Niveaux d'Abonnement" />
      <div className="space-y-3">
        <p className="text-slate-700 leading-relaxed">
          Access levels are tiered as follows:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Free", desc: "Basic directory access, limited analytics" },
            { name: "Essential", desc: "Enhanced search, bookmarks, export" },
            {
              name: "Verified",
              desc: "Verified badge, priority support, full analytics",
            },
            { name: "Max", desc: "All features, API access, custom reports" },
            { name: "Enterprise", desc: "White-label, dedicated support, SLA" },
          ].map((tier) => (
            <div
              key={tier.name}
              className="border border-slate-300 rounded-lg p-3"
            >
              <p className="text-amber-600 font-medium text-sm">{tier.name}</p>
              <p className="text-slate-500 text-xs">{tier.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionHeading number="6" title="Propriété Intellectuelle" />
      <p className="text-slate-700 leading-relaxed">
        All content, code, designs, trademarks, logos, and branding on the
        Platform are the property of Verso Air Inc. or its licensors. The Verso
        Air name, logo (eagle design), "STRΔΦGHT TΩ THΞ PΩΦΠT" tagline, and
        StreamRoyale are trademarks of Verso Air Inc. Unauthorized use,
        reproduction, or distribution is prohibited and may result in legal
        action. Users retain ownership of content they upload but grant Verso
        Air a worldwide, non-exclusive, royalty-free license to display,
        distribute, and promote said content within the Platform.
      </p>

      <SectionHeading number="7" title="Contenu Artiste & Musique" />
      <p className="text-slate-700 leading-relaxed">
        Artists uploading music to StreamRoyale represent and warrant that they
        own or have all necessary rights, licenses, and permissions for the
        content. Uploading copyrighted material without authorization is
        strictly prohibited and will result in immediate content removal,
        account suspension, and forfeiture of earnings. We comply with DMCA
        takedown procedures. Counter-notifications may be filed as per
        applicable law.
      </p>

      <SectionHeading number="8" title="Conduite Interdite" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>
          Artificial stream inflation (bots, scripts, loops, VPN manipulation)
        </li>
        <li>Harassment, hate speech, or threatening behavior</li>
        <li>Uploading malware, viruses, or malicious code</li>
        <li>Attempting to reverse-engineer, scrape, or exploit the Platform</li>
        <li>Creating misleading listings or fraudulent business profiles</li>
        <li>
          Using VersoAI to generate harmful, illegal, or deceptive content
        </li>
        <li>Circumventing geographic restrictions or access controls</li>
        <li>Impersonating another user, artist, or business</li>
      </ul>

      <SectionHeading number="9" title="Paiement & Remboursements" />
      <p className="text-slate-700 leading-relaxed">
        Subscription fees are billed in advance on a monthly or annual basis.
        Refunds are available within 14 days of initial purchase if no
        significant platform usage has occurred. Artist royalty payouts require
        a minimum balance of $10.00 USD and are processed within 7–14 business
        days. Verso Air reserves the right to withhold payouts pending fraud
        investigation. Marketplace purchases are subject to the seller's
        individual refund policy, with Verso Air acting as an intermediary.
      </p>

      <SectionHeading number="10" title="Limitation de Responsabilité" />
      <p className="text-slate-700 leading-relaxed">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, VERSO AIR SHALL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES ARISING FROM YOUR USE OF THE PLATFORM. Our total liability for
        any claim shall not exceed the amount paid by you to Verso Air in the
        twelve (12) months preceding the claim. The Platform is provided "AS IS"
        without warranties of any kind, express or implied.
      </p>

      <SectionHeading number="11" title="Résiliation" />
      <p className="text-slate-700 leading-relaxed">
        We may suspend or terminate your account at any time for violation of
        these Terms, with or without notice. Upon termination, your right to use
        the Platform ceases immediately. Data retention post-termination follows
        our Privacy Policy. You may request account deletion at any time by
        contacting support@versoair.com.
      </p>

      <SectionHeading number="12" title="Modifications" />
      <p className="text-slate-700 leading-relaxed">
        We reserve the right to modify these Terms at any time. Material changes
        will be communicated via email or in-platform notification at least 30
        days before taking effect. Continued use after changes constitutes
        acceptance.
      </p>

      <SectionHeading number="13" title="Droit Applicable" />
      <p className="text-slate-700 leading-relaxed">
        Ces Conditions sont régies par les lois de la Province de l'Ontario,
        Canada, without regard to conflict of law principles. Any disputes shall
        be resolved in the courts of Toronto, Ontario, Canada. For users in the
        European Union, mandatory consumer protection laws of your country of
        residence apply in addition. See the Jurisdiction tab for
        country-specific provisions.
      </p>

      <SectionHeading number="14" title="Contact" />
      <p className="text-slate-700 leading-relaxed">
        For questions about these Terms, contact us at{" "}
        <a
          href="mailto:legal@versoair.com"
          className="text-amber-600 hover:underline"
        >
          legal@versoair.com
        </a>{" "}
        or write to: Verso Air Inc., 80 Mornelle Crt, Toronto, Ontario, Canada
        M1E 4P8.
      </p>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm italic">
        Last updated: March 22, 2026
      </p>

      <InfoCard icon={Shield} title="Votre Vie Privée en Bref" variant="info">
        <p>
          We collect only what's necessary to operate the Platform. We never
          sell your personal data. You can request deletion at any time. Full
          compliance with GDPR, PIPEDA, CCPA, and 7 other data protection
          frameworks.
        </p>
      </InfoCard>

      <SectionHeading number="1" title="Données Collectées" />
      <div className="space-y-3">
        <SubHeading title="Informations que Vous Fournissez" />
        <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
          <li>Account details — name, email, password (bcrypt-hashed)</li>
          <li>
            Business profiles — company name, address, sector, description
          </li>
          <li>
            Artist profiles — stage name, genre, country, bio, social links
          </li>
          <li>Uploaded content — music files, images, documents</li>
          <li>Messages, support tickets, and forum posts</li>
        </ul>
        <SubHeading title="Informations Collectées Automatiquement" />
        <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
          <li>
            IP address and approximate geolocation (for country detection)
          </li>
          <li>Browser type, device type, operating system</li>
          <li>Pages visited, click patterns, session duration</li>
          <li>
            Stream events (play, pause, skip, duration) for royalty calculation
          </li>
          <li>Cookies and local storage preferences</li>
        </ul>
      </div>

      <SectionHeading number="2" title="Comment Nous Utilisons Vos Données" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Provide and maintain Platform services</li>
        <li>Calculate and distribute artist royalties accurately</li>
        <li>Detect and prevent fraud, bot activity, and stream manipulation</li>
        <li>Improve user experience through analytics</li>
        <li>
          Send essential communications (account verification, security alerts)
        </li>
        <li>Comply with legal obligations and regulatory requirements</li>
      </ul>

      <SectionHeading number="3" title="Partage des Données" />
      <p className="text-slate-700 leading-relaxed">
        We do <strong className="text-slate-900">NOT</strong> sell personal data. We
        may share data with:
      </p>
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>
          <strong>Service providers</strong> — hosting (Render/Neon), email
          delivery, payment processing
        </li>
        <li>
          <strong>Legal authorities</strong> — when required by law, subpoena,
          or court order
        </li>
        <li>
          <strong>Business transfer</strong> — in the event of merger,
          acquisition, or asset sale
        </li>
      </ul>

      <SectionHeading number="4" title="Conservation des Données" />
      <p className="text-slate-700 leading-relaxed">
        Account data is retained while your account is active. After deletion
        request, personal data is removed within 30 days. Anonymized analytics
        may be retained indefinitely. Financial records (royalties, payments)
        are retained for 7 years per tax regulations. Stream event logs are
        retained for 2 years.
      </p>

      <SectionHeading number="5" title="Your Rights" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            icon: Eye,
            right: "Access",
            desc: "Request a copy of all data we hold about you",
          },
          {
            icon: FileText,
            right: "Rectification",
            desc: "Correct inaccurate or incomplete data",
          },
          {
            icon: Trash2,
            right: "Erasure",
            desc: "Request deletion of your personal data",
          },
          {
            icon: Download,
            right: "Portability",
            desc: "Receive your data in machine-readable format",
          },
          {
            icon: Lock,
            right: "Restriction",
            desc: "Limit how we process your data",
          },
          {
            icon: Mail,
            right: "Objection",
            desc: "Object to processing for marketing or profiling",
          },
        ].map((item) => (
          <div
            key={item.right}
            className="border border-slate-300 rounded-lg p-3 flex items-start gap-3"
          >
            <item.icon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-700 font-medium text-sm">{item.right}</p>
              <p className="text-slate-500 text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-slate-700 leading-relaxed">
        Exercise any right by emailing{" "}
        <a
          href="mailto:privacy@versoair.com"
          className="text-amber-600 hover:underline"
        >
          privacy@versoair.com
        </a>
        . We respond within 30 days (72 hours for breach notifications).
      </p>

      <SectionHeading number="6" title="Security" />
      <p className="text-slate-700 leading-relaxed">
        We employ industry-standard security measures: bcrypt password hashing
        (12 salt rounds), JWT authentication with HttpOnly secure cookies, CSRF
        token protection, rate limiting, SQL injection prevention via
        parameterized queries, HTTPS everywhere, and regular security audits.
      </p>

      <SectionHeading number="7" title="Children's Privacy" />
      <p className="text-slate-700 leading-relaxed">
        The Platform is not intended for children under 16. We do not knowingly
        collect personal information from children. If we discover such data has
        been collected, it will be deleted immediately. Parents may contact us
        at privacy@versoair.com.
      </p>
    </div>
  );
}

function GdprTab() {
  const regions = [
    {
      name: "European Union — GDPR",
      flag: "🇪🇺",
      law: "General Data Protection Regulation (EU) 2016/679",
      authority: "National DPA of your EU member state",
      basis:
        "Consent (Art. 6(1)(a)), Contractual Necessity (Art. 6(1)(b)), Legitimate Interest (Art. 6(1)(f))",
      rights:
        "Access, rectification, erasure, restriction, portability, objection, automated decision-making",
      transfer: "Standard Contractual Clauses (SCCs) for transfers outside EEA",
      dpo: "dpo@versoair.com",
    },
    {
      name: "United Kingdom — UK GDPR",
      flag: "🇬🇧",
      law: "UK GDPR + Data Protection Act 2018",
      authority: "Information Commissioner's Office (ICO)",
      basis: "Mirrors EU GDPR with UK-specific adequacy decisions",
      rights:
        "Same as EU GDPR, with UK-specific supervisory authority complaint rights",
      transfer: "UK International Data Transfer Agreement (IDTA)",
      dpo: "dpo@versoair.com",
    },
    {
      name: "Canada — PIPEDA",
      flag: "🇨🇦",
      law: "Personal Information Protection and Electronic Documents Act (PIPEDA)",
      authority: "Office of the Privacy Commissioner of Canada (OPC)",
      basis: "Meaningful consent (express or implied depending on sensitivity)",
      rights: "Access, correction, withdrawal of consent, complaint to OPC",
      transfer: "Contractual safeguards ensuring comparable protection",
      dpo: "privacy@versoair.com",
    },
    {
      name: "United States — CCPA/CPRA",
      flag: "🇺🇸",
      law: "California Consumer Privacy Act + California Privacy Rights Act",
      authority: "California Privacy Protection Agency (CPPA)",
      basis: "Notice at collection, right to opt-out of sale/sharing",
      rights:
        "Know, delete, correct, opt-out, non-discrimination, limit sensitive data use",
      transfer: "No specific transfer restrictions (domestic)",
      dpo: "privacy@versoair.com",
    },
    {
      name: "Brazil — LGPD",
      flag: "🇧🇷",
      law: "Lei Geral de Proteção de Dados (LGPD)",
      authority: "Autoridade Nacional de Proteção de Dados (ANPD)",
      basis: "Consent, contractual necessity, legitimate interest",
      rights:
        "Confirmation, access, correction, anonymization, deletion, portability, revoke consent",
      transfer: "Adequate protection or SCCs",
      dpo: "privacy@versoair.com",
    },
    {
      name: "South Africa — POPIA",
      flag: "🇿🇦",
      law: "Protection of Personal Information Act (POPIA)",
      authority: "Information Regulator",
      basis:
        "Consent, contractual necessity, legal obligation, legitimate interest",
      rights: "Access, correction, deletion, object to processing",
      transfer: "Adequate level of protection or consent",
      dpo: "privacy@versoair.com",
    },
    {
      name: "India — DPDPA",
      flag: "🇮🇳",
      law: "Digital Personal Data Protection Act 2023",
      authority: "Data Protection Board of India",
      basis: "Consent, legitimate uses (employment, state functions)",
      rights:
        "Access, correction, erasure, grievance redressal, nominate representative",
      transfer: "Permitted except to restricted countries",
      dpo: "privacy@versoair.com",
    },
    {
      name: "Japan — APPI",
      flag: "🇯🇵",
      law: "Act on the Protection of Personal Information (APPI)",
      authority: "Personal Information Protection Commission (PPC)",
      basis: "Consent for sensitive data, specified purposes",
      rights: "Disclosure, correction, suspension of use, deletion",
      transfer: "Consent or equivalent protection level",
      dpo: "privacy@versoair.com",
    },
    {
      name: "Sub-Saharan Africa",
      flag: "🌍",
      law: "Various: NDPR (Nigeria), DPA (Kenya), PDPA (Ghana), DPL (Senegal/ECOWAS)",
      authority: "National data protection agencies per country",
      basis: "Consent-based with legitimate interest provisions",
      rights: "Access, rectification, erasure, object to processing",
      transfer: "Adequate safeguards or consent",
      dpo: "privacy@versoair.com",
    },
  ];

  return (
    <div className="space-y-4">
      <InfoCard
        icon={Globe}
        title="Multi-Jurisdiction Compliance"
        variant="success"
      >
        <p>
          Verso Air is designed for global compliance. We apply the highest
          standard of data protection across all jurisdictions where we operate.
          If your local law provides stronger protections than our baseline,
          those protections apply to you.
        </p>
      </InfoCard>

      <div className="space-y-3">
        {regions.map((region) => (
          <Accordion key={region.name} title={`${region.flag} ${region.name}`}>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Applicable Law", value: region.law },
                { label: "Supervisory Authority", value: region.authority },
                { label: "Legal Basis", value: region.basis },
                { label: "Your Rights", value: region.rights },
                { label: "International Transfers", value: region.transfer },
                { label: "Contact", value: region.dpo },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:gap-3"
                >
                  <span className="text-amber-600/70 text-sm font-medium sm:w-48 flex-shrink-0">
                    {row.label}:
                  </span>
                  <span className="text-slate-700 text-sm">{row.value}</span>
                </div>
              ))}
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

function CookiesTab() {
  const cookies = [
    {
      name: "connect.sid",
      purpose: "Express session identifier",
      duration: "Session",
      type: "Essential",
    },
    {
      name: "auth_token",
      purpose: "JWT authentication token (HttpOnly, Secure)",
      duration: "7 days",
      type: "Essential",
    },
    {
      name: "csrf_token",
      purpose: "Cross-site request forgery protection",
      duration: "Session",
      type: "Essential",
    },
    {
      name: "googtrans",
      purpose: "Google Translate language preference",
      duration: "Persistent",
      type: "Functional",
    },
    {
      name: "verso_portal",
      purpose: "Selected portal/dashboard preference",
      duration: "30 days",
      type: "Functional",
    },
    {
      name: "verso_theme",
      purpose: "Light/dark mode preference",
      duration: "1 year",
      type: "Functional",
    },
    {
      name: "_ga / _gid",
      purpose: "Google Analytics visitor identification",
      duration: "2 years / 24h",
      type: "Analytics",
    },
  ];

  const localStorage = [
    { name: "fsa_selected_language", purpose: "Cached language selection" },
    { name: "fsa_selected_country", purpose: "Cached country selection" },
    { name: "artist_token", purpose: "Artist portal authentication" },
    { name: "artist_profile", purpose: "Cached artist profile data" },
    { name: "browsing_history", purpose: "Recent page visit history" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-700 leading-relaxed">
        Verso Air uses cookies and local storage to provide essential
        functionality, remember your preferences, and improve the platform.
      </p>

      <SectionHeading number="1" title="Cookies We Use" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left text-amber-600 py-2 px-3">Cookie</th>
              <th className="text-left text-amber-600 py-2 px-3">Purpose</th>
              <th className="text-left text-amber-600 py-2 px-3">Duration</th>
              <th className="text-left text-amber-600 py-2 px-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((c) => (
              <tr key={c.name} className="border-b border-slate-300/50">
                <td className="py-2 px-3 font-mono text-xs text-amber-700">
                  {c.name}
                </td>
                <td className="py-2 px-3 text-slate-700">{c.purpose}</td>
                <td className="py-2 px-3 text-slate-500">{c.duration}</td>
                <td className="py-2 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.type === "Essential"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : c.type === "Functional"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {c.type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading number="2" title="Local Storage" />
      <div className="space-y-2">
        {localStorage.map((item) => (
          <div key={item.name} className="flex items-center gap-3 text-sm">
            <code className="text-amber-700 bg-gray-800/50 px-2 py-0.5 rounded text-xs">
              {item.name}
            </code>
            <span className="text-slate-500">—</span>
            <span className="text-slate-700">{item.purpose}</span>
          </div>
        ))}
      </div>

      <SectionHeading number="3" title="Managing Cookies" />
      <p className="text-slate-700 leading-relaxed">
        You can control cookies through your browser settings. Disabling
        essential cookies will prevent core functionality (authentication,
        sessions). Functional cookies can be disabled without breaking the
        platform but your preferences won't persist.
      </p>
    </div>
  );
}

function TrademarkTab() {
  return (
    <div className="space-y-4">
      <InfoCard
        icon={Award}
        title="CIPO Trademark — VERSO AIR (Pending Re-Filing)"
        variant="info"
      >
        <p>
          Canadian Intellectual Property Office (CIPO) Application{" "}
          <strong>#2264074</strong> — currently being re-filed with updated
          classification.
        </p>
      </InfoCard>

      <SectionHeading number="1" title="Registration Details" />
      <div className="border border-slate-300 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
          {[
            { label: "Application Number", value: "2264074" },
            { label: "Mark", value: "VERSO AIR" },
            { label: "Category", value: "Trademark (Design)" },
            { label: "Type", value: "Design Mark" },
            { label: "Filing Date", value: "June 14, 2023" },
            { label: "Applicant", value: "Joel Vanga — Toronto, ON, Canada" },
            {
              label: "Nice Classification",
              value: "Class 41 — Entertainment Services",
            },
            {
              label: "Current Status",
              value: "Pending Re-Filing — New application in preparation",
            },
          ].map((item) => (
            <div key={item.label} className="p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                {item.label}
              </p>
              <p className="text-slate-900 font-medium text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionHeading number="2" title="Services Covered (Nice Class 41)" />
      <div className="bg-gray-900/50 border border-slate-300 rounded-lg p-4">
        <p className="text-slate-700 text-sm leading-relaxed">
          Development, creation, production, distribution, and post-production
          of multimedia entertainment content, namely television series and
          documentaries; entertainment services, namely, a multimedia program
          series featuring music and musicians distributed via the internet.
        </p>
      </div>

      <SectionHeading number="3" title="Design Description" />
      <p className="text-slate-700 leading-relaxed">
        The VERSO AIR trademark features a customized eagle design with color
        claimed as a feature. The design incorporates elements classified under
        the Vienna Classification: stars, luminous rays, eagles/birds in flight,
        triangular geometric formations, and stylized letterforms.
      </p>

      <SectionHeading number="4" title="Status History" />
      <div className="space-y-2">
        {[
          { date: "June 14, 2023", event: "Application Filed", status: "✅" },
          {
            date: "June 14, 2023",
            event: "Application Created & Formalized",
            status: "✅",
          },
          { date: "October 25, 2024", event: "Search Recorded", status: "✅" },
          {
            date: "October 25, 2024",
            event: "Examiner's First Report Issued",
            status: "📋",
          },
          {
            date: "April 25, 2025",
            event: "Response Deadline (Examiner's Report)",
            status: "⚠️",
          },
          { date: "May 13, 2025", event: "Default Notice Sent", status: "⚠️" },
          {
            date: "July 31, 2025",
            event: "Application paused — Re-filing initiated",
            status: "🔄",
          },
        ].map((item) => (
          <div
            key={item.date + item.event}
            className="flex items-start gap-3 text-sm"
          >
            <span className="text-lg leading-none">{item.status}</span>
            <div>
              <span className="text-amber-600">{item.date}</span>
              <span className="text-gray-500 mx-2">—</span>
              <span className="text-slate-700">{item.event}</span>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading number="5" title="Re-Filing Plan" />
      <InfoCard icon={Info} title="New Application In Progress" variant="info">
        <p>
          The original application is being re-filed with updated classification
          coverage following an administrative processing matter during the
          examination stage. CIPO trademark application fees:{" "}
          <strong>CAD $347.27</strong> base filing fee (online) for the first
          Nice class, <strong>CAD $105.26</strong> for each additional class.
          Registration fee upon approval: <strong>CAD $231.51</strong> for the
          first class. Total estimated cost for re-filing:{" "}
          <strong>~CAD $580–700</strong> (Class 41 + potential additional
          classes for software/technology services under Class 42).
        </p>
      </InfoCard>

      <SectionHeading number="6" title="CIPO Reference" />
      <p className="text-slate-700 leading-relaxed">
        Official CIPO record:{" "}
        <a
          href="https://ised-isde.canada.ca/cipo/trademark-search/2264074?lang=eng"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:underline inline-flex items-center gap-1"
        >
          View on CIPO
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}

function CompetitionTab() {
  return (
    <div className="space-y-4">
      <InfoCard
        icon={Trophy}
        title="StreamRoyale™ — Official Competition Rules"
        variant="success"
      >
        <p>
          StreamRoyale is Verso Air's competitive streaming platform where
          artists earn royalties, compete in weekly pools, and climb badge tiers
          based on genuine listener engagement.
        </p>
      </InfoCard>

      <SectionHeading number="1" title="Eligibility" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>
          Open to artists aged 16+ in all countries where Verso Air operates
        </li>
        <li>
          Must have a registered Artist Portal account with verified email
        </li>
        <li>Must have at least one uploaded track with valid audio file</li>
        <li>Artists under 18 must have parental/guardian consent documented</li>
        <li>
          Employees and immediate family of Verso Air Inc. may participate but
          are excluded from weekly prize pools
        </li>
        <li>
          One account per artist/group — multi-account abuse results in
          permanent disqualification
        </li>
      </ul>

      <SectionHeading number="2" title="How It Works" />
      <div className="space-y-3">
        <SubHeading title="Weekly Pool Cycle" />
        <p className="text-slate-700 leading-relaxed">
          Each competition week runs Sunday 00:00 UTC to Saturday 23:59 UTC.
          Listener contributions (tips, boosts, subscriptions) accumulate into a
          weekly pool. At the end of each week, the pool is distributed
          automatically based on the following split:
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            {
              pct: "20%",
              label: "Guaranteed Fund",
              desc: "Base payout to all eligible artists",
            },
            {
              pct: "70%",
              label: "Performance Pool",
              desc: "Distributed by stream count ranking",
            },
            {
              pct: "10%",
              label: "Platform Fee",
              desc: "Sustains infrastructure & development",
            },
          ].map((split) => (
            <div
              key={split.label}
              className="border border-slate-300 rounded-lg p-4"
            >
              <p className="text-2xl font-bold text-amber-600">{split.pct}</p>
              <p className="text-slate-900 text-sm font-medium mt-1">
                {split.label}
              </p>
              <p className="text-slate-500 text-xs mt-1">{split.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-700 leading-relaxed text-sm">
          <strong className="text-slate-900">
            90% of all listener contributions go directly to artists.
          </strong>{" "}
          Only 10% is retained by the platform.
        </p>
      </div>

      <SectionHeading number="3" title="Per-Stream Revenue Rates" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left text-amber-600 py-2 px-3">
                Contract Grade
              </th>
              <th className="text-left text-amber-600 py-2 px-3">Per Stream</th>
              <th className="text-left text-amber-600 py-2 px-3">
                Artist Share
              </th>
              <th className="text-left text-amber-600 py-2 px-3">
                Platform Share
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                grade: "S (Superstar)",
                rate: "$0.0085",
                artist: "85%",
                platform: "15%",
              },
              {
                grade: "A (Advanced)",
                rate: "$0.0075",
                artist: "75%",
                platform: "25%",
              },
              {
                grade: "B (Building)",
                rate: "$0.0065",
                artist: "65%",
                platform: "35%",
              },
              {
                grade: "C (Core)",
                rate: "$0.0055",
                artist: "55%",
                platform: "45%",
              },
              {
                grade: "Ungraded (New)",
                rate: "$0.004",
                artist: "50%",
                platform: "50%",
              },
            ].map((row) => (
              <tr key={row.grade} className="border-b border-slate-300/50">
                <td className="py-2 px-3 text-slate-900 font-medium">
                  {row.grade}
                </td>
                <td className="py-2 px-3 text-emerald-400">{row.rate}</td>
                <td className="py-2 px-3 text-slate-700">{row.artist}</td>
                <td className="py-2 px-3 text-slate-500">{row.platform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading number="4" title="Badge Tier System" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          {
            tier: 1,
            name: "Initiate",
            streams: "0+",
            boost: "0%",
            color: "text-slate-500",
          },
          {
            tier: 2,
            name: "Bronze Warrior",
            streams: "1,000+",
            boost: "0%",
            color: "text-amber-700",
          },
          {
            tier: 3,
            name: "Silver Gladiator",
            streams: "10,000+",
            boost: "0%",
            color: "text-slate-700",
          },
          {
            tier: 4,
            name: "Gold Champion",
            streams: "50,000+",
            boost: "0%",
            color: "text-yellow-400",
          },
          {
            tier: 5,
            name: "Platinum Conqueror",
            streams: "250,000+",
            boost: "0%",
            color: "text-cyan-300",
          },
          {
            tier: 6,
            name: "Diamond Warlord",
            streams: "1,000,000+",
            boost: "+2%",
            color: "text-blue-400",
          },
          {
            tier: 7,
            name: "Legendary Titan",
            streams: "5,000,000+",
            boost: "+5%",
            color: "text-purple-400",
          },
        ].map((badge) => (
          <div
            key={badge.tier}
            className="border border-slate-300 rounded-lg p-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold">
              <span className={badge.color}>{badge.tier}</span>
            </div>
            <div>
              <p className={`font-medium text-sm ${badge.color}`}>
                {badge.name}
              </p>
              <p className="text-gray-500 text-xs">
                {badge.streams} streams • Revenue boost: {badge.boost}
              </p>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading number="5" title="Stream Validation" />
      <p className="text-slate-700 leading-relaxed">
        Streams are tracked via a heartbeat system — a listener's device sends a
        ping every 10 seconds during playback. Only validated streams (minimum
        30 seconds of continuous play from a unique session) count toward
        royalties and competition rankings. The following are automatically
        detected and excluded:
      </p>
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Duplicate sessions from the same IP within a 5-minute window</li>
        <li>Irregular heartbeat patterns (bot signatures)</li>
        <li>Bulk plays from a single account exceeding reasonable listening</li>
        <li>VPN-masked IP clusters associated with stream farming</li>
      </ul>

      <SectionHeading number="6" title="Payouts" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>
          Minimum payout threshold:{" "}
          <strong className="text-slate-900">$10.00 USD</strong>
        </li>
        <li>Payout requests processed within 7–14 business days</li>
        <li>
          Supported methods: bank transfer, PayPal, mobile money
          (region-dependent)
        </li>
        <li>Earnings below threshold roll over to the next period</li>
        <li>Pending payouts may be held during fraud investigation</li>
      </ul>

      <SectionHeading number="7" title="Disqualification" />
      <p className="text-slate-700 leading-relaxed">
        The following result in immediate disqualification from competition
        pools, potential account termination, and forfeiture of pending
        earnings:
      </p>
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Stream manipulation (bots, click farms, automated scripts)</li>
        <li>Copyright infringement (uploading content you don't own)</li>
        <li>Multi-account abuse for self-streaming</li>
        <li>Collusion with other artists to artificially inflate metrics</li>
        <li>Misrepresentation of identity or credentials</li>
      </ul>

      <SectionHeading number="8" title="Governing Law" />
      <p className="text-slate-700 leading-relaxed">
        StreamRoyale competitions are governed by the laws of Ontario, Canada.
        For artists in the European Union, mandatory local consumer protection
        laws apply in addition. Competitions comply with promotional contest
        laws in all participating jurisdictions.{" "}
        <strong>No purchase necessary</strong> to participate — artists earn
        royalties through genuine listener engagement, not entry fees.
      </p>
    </div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-4">
      <InfoCard
        icon={ScrollText}
        title="Artist Contract Framework"
        variant="info"
      >
        <p>
          All artists on StreamRoyale operate under a standard contract
          framework. Contract grades determine revenue share, feature access,
          and audio quality tiers.
        </p>
      </InfoCard>

      <SectionHeading number="1" title="Contract Application Process" />
      <div className="space-y-2">
        {[
          {
            step: "1",
            title: "Apply",
            desc: "Submit your profile, demo, social links, and motivation through the Artist Portal",
          },
          {
            step: "2",
            title: "Review",
            desc: "Our team evaluates your submission — typically within 5–10 business days",
          },
          {
            step: "3",
            title: "Grade Assignment",
            desc: "Receive your contract grade (S/A/B/C) based on portfolio quality and market readiness",
          },
          {
            step: "4",
            title: "Activation",
            desc: "Accept terms, start uploading, and begin earning royalties immediately",
          },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-600 text-sm font-bold">
                {item.step}
              </span>
            </div>
            <div>
              <p className="text-slate-900 font-medium">{item.title}</p>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading number="2" title="Contract Grades" />
      <div className="space-y-3">
        {[
          {
            grade: "S — Superstar",
            share: "85% Artist / 15% Platform",
            features:
              "Unlimited uploads, FLAC quality, featured placement, priority support, can be featured in collaborations",
            criteria:
              "Established artists with proven catalog and significant streaming history",
          },
          {
            grade: "A — Advanced",
            share: "75% Artist / 25% Platform",
            features:
              "Up to 50 uploads, 320kbps quality, featured eligibility, standard support",
            criteria:
              "Experienced artists with quality portfolio and growing audience",
          },
          {
            grade: "B — Building",
            share: "65% Artist / 35% Platform",
            features:
              "Up to 20 uploads, 256kbps quality, catalog access, standard support",
            criteria: "Promising artists building their catalog and audience",
          },
          {
            grade: "C — Core",
            share: "55% Artist / 45% Platform",
            features:
              "Up to 5 uploads, 128kbps quality, basic analytics, community support",
            criteria: "New artists starting their journey on the platform",
          },
        ].map((contract) => (
          <div
            key={contract.grade}
            className="border border-slate-300 rounded-xl p-5"
          >
            <h4 className="text-amber-600 font-semibold mb-3">
              {contract.grade}
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Revenue Split:</span>{" "}
                <span className="text-emerald-400 font-medium">
                  {contract.share}
                </span>
              </p>
              <p>
                <span className="text-gray-500">Features:</span>{" "}
                <span className="text-slate-700">{contract.features}</span>
              </p>
              <p>
                <span className="text-gray-500">Criteria:</span>{" "}
                <span className="text-slate-700">{contract.criteria}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading number="3" title="Rights & Obligations" />
      <SubHeading title="Artist Rights" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Retain full ownership of all uploaded content</li>
        <li>
          Withdraw content at any time (subject to contractual notice period)
        </li>
        <li>Request contract grade review after 90 days</li>
        <li>Access transparent earnings analytics and stream data</li>
        <li>Dispute resolution through formal appeal process</li>
      </ul>
      <SubHeading title="Artist Obligations" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Upload only original content or properly licensed material</li>
        <li>Maintain accurate profile information</li>
        <li>Comply with community guidelines and platform rules</li>
        <li>Not engage in stream manipulation or fraudulent activity</li>
        <li>Report copyright claims promptly</li>
      </ul>
      <SubHeading title="Platform Obligations" />
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>Process royalty payments within stated timeframes</li>
        <li>Provide transparent analytics and earnings reports</li>
        <li>Protect uploaded content with industry-standard security</li>
        <li>Respond to disputes and appeals within 14 business days</li>
        <li>Notify artists 30 days before any material term changes</li>
      </ul>

      <SectionHeading number="4" title="Termination" />
      <p className="text-slate-700 leading-relaxed">
        Either party may terminate the contract with 30 days written notice.
        Upon termination: pending royalties will be paid out within 30 days
        (subject to minimum threshold), uploaded content will be removed from
        the platform within 7 days, and the artist's catalog data will be
        available for export for 90 days. Termination for cause (fraud,
        copyright violation) is immediate with no notice period required.
      </p>
    </div>
  );
}

function JurisdictionTab() {
  const jurisdictions = [
    {
      region: "Canada",
      flag: "🇨🇦",
      law: "Provincial and federal laws of Ontario, Canada",
      court: "Superior Court of Justice, Toronto, Ontario",
      notes:
        "Primary jurisdiction. CIPO trademark registration. PIPEDA compliance for personal data. Competition Act applies to promotional activities.",
      consumers:
        "Consumer Protection Act, 2002 (Ontario). 10-day cooling-off for internet agreements over $50.",
    },
    {
      region: "European Union",
      flag: "🇪🇺",
      law: "GDPR, Consumer Rights Directive 2011/83/EU, Digital Services Act",
      court: "Court of competent jurisdiction in the consumer's member state",
      notes:
        "EU consumers cannot be required to litigate outside their home country for consumer disputes. GDPR applies regardless of data processor location.",
      consumers:
        "14-day withdrawal right for digital purchases. Unfair Contract Terms Directive protection.",
    },
    {
      region: "United Kingdom",
      flag: "🇬🇧",
      law: "UK GDPR, Consumer Rights Act 2015, Competition Act 1998",
      court:
        "Courts of England and Wales (or Scotland/Northern Ireland for residents there)",
      notes:
        "UK consumers retain EU-style protections post-Brexit. ICO oversight for data protection.",
      consumers:
        "14-day cancellation for online services. Unfair terms protections under CRA 2015.",
    },
    {
      region: "United States",
      flag: "🇺🇸",
      law: "Federal law + state laws (CCPA/CPRA for California residents)",
      court: "State and federal courts in California or New York",
      notes:
        "No single federal privacy law — state laws apply. FTC Act Section 5 for unfair/deceptive practices. DMCA for copyright.",
      consumers:
        "CCPA: right to know, delete, opt-out. State-specific contest/sweepstakes laws for StreamRoyale.",
    },
    {
      region: "West Africa (ECOWAS)",
      flag: "🌍",
      law: "ECOWAS Supplementary Act A/SA.1/01/10 on Personal Data Protection",
      court: "National courts of the artist's country of residence",
      notes:
        "Applies to Senegal, Côte d'Ivoire, Ghana, Nigeria, Cameroon, Togo, Benin, Guinea, Mali, Burkina Faso, Niger, and other member states. Local data protection authorities supervise.",
      consumers:
        "Consumer protection varies by country. OHADA Uniform Acts apply in many francophone states.",
    },
    {
      region: "Central & East Africa",
      flag: "🌍",
      law: "National DPA laws: Kenya DPA 2019, Rwanda DPL 2021, Tanzania PDPA, Uganda DPP 2019",
      court: "National courts per artist's residence",
      notes:
        "Each country has its own data protection framework. Democratic Republic of Congo operates under national privacy provisions.",
      consumers:
        "Consumer rights enforced through national competition and consumer authorities.",
    },
    {
      region: "Brazil",
      flag: "🇧🇷",
      law: "LGPD (Lei Geral de Proteção de Dados), Consumer Protection Code (CDC)",
      court: "Courts in the consumer's domicile",
      notes:
        "Brazilian consumers have strong protections under CDC. ANPD supervises LGPD compliance.",
      consumers:
        "7-day reflection period for remote purchases. Strict liability for service defects.",
    },
    {
      region: "Asia-Pacific",
      flag: "🌏",
      law: "APPI (Japan), PDPA (Singapore, Thailand), DPDPA (India), Privacy Act (Australia)",
      court: "National courts per user's country of residence",
      notes:
        "Diverse regulatory landscape. Japan has EU-adequacy. India's DPDPA effective from 2024.",
      consumers:
        "Australian Consumer Law (ACL) for Australian users. Japan's Specified Commercial Transaction Act.",
    },
  ];

  return (
    <div className="space-y-4">
      <InfoCard
        icon={Scale}
        title="Multi-Jurisdictional Operations"
        variant="info"
      >
        <p>
          Verso Air operates globally and complies with the laws of each country
          where our users and artists reside. This section outlines which laws
          govern your relationship with us based on your location.
        </p>
      </InfoCard>

      <SectionHeading number="1" title="Primary Jurisdiction" />
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
        <p className="text-slate-700 leading-relaxed">
          Verso Air Inc. is incorporated in{" "}
          <strong className="text-slate-900">Ontario, Canada</strong>. Unless
          overridden by mandatory local consumer protection laws, the laws of
          Ontario, Canada govern these Terms and the Platform's operation.
          Disputes are subject to the exclusive jurisdiction of the courts of
          Toronto, Ontario — <strong className="text-slate-900">except</strong>{" "}
          where local law grants you the right to bring proceedings in your own
          jurisdiction (e.g., EU Consumer Rights Directive).
        </p>
      </div>

      <SectionHeading number="2" title="Country-Specific Provisions" />
      <div className="space-y-3">
        {jurisdictions.map((j) => (
          <Accordion key={j.region} title={`${j.flag} ${j.region}`}>
            <div className="space-y-3">
              <div>
                <p className="text-amber-600/70 text-xs uppercase tracking-wide mb-1">
                  Applicable Law
                </p>
                <p className="text-slate-700 text-sm">{j.law}</p>
              </div>
              <div>
                <p className="text-amber-600/70 text-xs uppercase tracking-wide mb-1">
                  Competent Court
                </p>
                <p className="text-slate-700 text-sm">{j.court}</p>
              </div>
              <div>
                <p className="text-amber-600/70 text-xs uppercase tracking-wide mb-1">
                  Key Notes
                </p>
                <p className="text-slate-700 text-sm">{j.notes}</p>
              </div>
              <div>
                <p className="text-amber-600/70 text-xs uppercase tracking-wide mb-1">
                  Consumer Protection
                </p>
                <p className="text-slate-700 text-sm">{j.consumers}</p>
              </div>
            </div>
          </Accordion>
        ))}
      </div>

      <SectionHeading number="3" title="Competition Law Compliance" />
      <p className="text-slate-700 leading-relaxed">
        StreamRoyale competitions comply with promotional contest regulations in
        all participating countries. Key compliance points:
      </p>
      <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
        <li>
          <strong>No purchase necessary</strong> — artists earn through genuine
          streams, not entry fees
        </li>
        <li>
          <strong>Canada</strong> — Competition Act compliant; no Régie des
          alcools, des courses et des jeux (RACJ) registration required (not a
          game of chance)
        </li>
        <li>
          <strong>EU</strong> — Compliant with Unfair Commercial Practices
          Directive (not a lottery)
        </li>
        <li>
          <strong>US</strong> — State-by-state contest registration not required
          (skill-based, no consideration)
        </li>
        <li>
          <strong>Africa</strong> — Compliant with national lotteries and gaming
          acts (royalties, not prizes)
        </li>
      </ul>

      <SectionHeading number="4" title="Dispute Resolution" />
      <p className="text-slate-700 leading-relaxed">
        Before initiating legal proceedings, both parties agree to attempt
        resolution through: (1) direct communication with support@versoair.com,
        (2) formal complaint to legal@versoair.com with 30-day response window,
        (3) mediation through a mutually agreed neutral mediator. If unresolved,
        disputes proceed to the courts specified above.
      </p>
    </div>
  );
}

function FaqTab() {
  const faqs = [
    {
      category: "Account & Security",
      questions: [
        {
          q: "How do I delete my account?",
          a: "Go to Account Settings → scroll to Danger Zone → Request Deletion. Alternatively email privacy@versoair.com. Your data is removed within 30 days. Financial records are retained 7 years per tax law.",
        },
        {
          q: "I forgot my password — how do I reset it?",
          a: "Click 'Forgot Password' on the login page. A reset link is sent to your registered email. Links expire after 1 hour. If you don't receive it, check spam or contact support@versoair.com.",
        },
        {
          q: "Is my data safe?",
          a: "Yes. We use bcrypt password hashing, JWT tokens in HttpOnly secure cookies, CSRF protection, rate limiting, parameterized SQL queries, and HTTPS everywhere. We never store plain-text passwords.",
        },
      ],
    },
    {
      category: "StreamRoyale & Royalties",
      questions: [
        {
          q: "How are royalties calculated?",
          a: "Each validated stream (30+ seconds, unique session) earns a per-stream rate based on your contract grade: $0.004 (ungraded) to $0.0085 (S-grade). Plus weekly pool distributions and badge-tier revenue boosts.",
        },
        {
          q: "When do I get paid?",
          a: "Payout requests are processed within 7–14 business days. Minimum threshold: $10 USD. Earnings below threshold roll over. Weekly pool distributions happen automatically every Monday at 06:00 UTC.",
        },
        {
          q: "What counts as a valid stream?",
          a: "Minimum 30 seconds of continuous play from a unique session. Our heartbeat tracker (10-second pings) validates authenticity. Bot streams, duplicate sessions, and VPN-masked click farms are automatically excluded.",
        },
        {
          q: "Can I participate from any country?",
          a: "Yes. StreamRoyale is open to artists worldwide. Your country code is embedded in your artist ID. Local tax regulations apply to payouts — we may require W-8BEN or equivalent forms.",
        },
      ],
    },
    {
      category: "Artist Portal",
      questions: [
        {
          q: "What file formats can I upload?",
          a: "MP3, WAV, FLAC, AIFF, OGG, and M4A. Maximum file size: 100MB. We recommend WAV or FLAC for best quality. Files are streamed to listeners in their original format.",
        },
        {
          q: "How do I get a better contract grade?",
          a: "Contract grades (S/A/B/C) are assigned based on portfolio quality, streaming history, and audience engagement. You can request a review after 90 days. Consistent growth and quality uploads improve your grade over time.",
        },
        {
          q: "What is my Artist Code?",
          a: "Your unique alphanumeric identifier in format VA_[PREFIX]_[DIV]_[DATE]_[CODE]. PREFIX is derived from your stage name, DIV is your division, DATE is your join date, and CODE includes your country calling code interleaved with status indicators.",
        },
      ],
    },
    {
      category: "Privacy & Data",
      questions: [
        {
          q: "Can I download all my data?",
          a: "Yes. Under GDPR Article 20 and equivalent laws, you have the right to data portability. Email privacy@versoair.com with 'Data Export Request' as subject. We'll provide a machine-readable export within 30 days.",
        },
        {
          q: "Do you sell my data?",
          a: "No. We never sell personal data to third parties. We share data only with essential service providers (hosting, email, payments) and when legally required.",
        },
        {
          q: "How long do you keep my data?",
          a: "Account data: while active + 30 days after deletion. Financial records: 7 years (tax). Stream logs: 2 years. Anonymized analytics: indefinitely.",
        },
      ],
    },
    {
      category: "Trademark & Legal",
      questions: [
        {
          q: "Is Verso Air a registered trademark?",
          a: "CIPO Application #2264074 was filed June 14, 2023 for Class 41 (Entertainment). The application is currently being re-filed after an administrative processing issue. The Verso Air name and eagle logo are protected under common law trademark rights.",
        },
        {
          q: "Can I use the Verso Air logo on my materials?",
          a: "Registered artists may use the 'Featured on Verso Air' badge in their promotional materials. The Verso Air logo, eagle design, and STRΔΦGHT TΩ THΞ PΩΦΠT tagline may not be used without written permission.",
        },
        {
          q: "What happens if someone copies my music on the platform?",
          a: "We comply with DMCA and equivalent international copyright frameworks. File a copyright claim through the Artist Portal or email legal@versoair.com. We investigate within 48 hours and remove infringing content immediately upon verification.",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {faqs.map((category) => (
        <div key={category.category}>
          <h3 className="text-lg font-semibold text-amber-600 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            {category.category}
          </h3>
          <div className="space-y-2">
            {category.questions.map((faq) => (
              <Accordion key={faq.q} title={faq.q}>
                <p>{faq.a}</p>
              </Accordion>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB CONTENT MAP
   ═══════════════════════════════════════════════════════════ */

const TAB_CONTENT: Record<TabId, () => JSX.Element> = {
  overview: OverviewTab,
  terms: TermsTab,
  privacy: PrivacyTab,
  gdpr: GdprTab,
  cookies: CookiesTab,
  trademark: TrademarkTab,
  competition: CompetitionTab,
  contracts: ContractsTab,
  jurisdiction: JurisdictionTab,
  faq: FaqTab,
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function InformationHub() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update hash on tab change
  useEffect(() => {
    window.history.replaceState(null, "", `#${activeTab}`);
  }, [activeTab]);

  // Scroll tab into view
  const scrollToTab = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    const scrollAmount = 200;
    tabsRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const ActiveContent = TAB_CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      <ScrollableNavbar isAuthenticated={false} />

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'Accueil
          </a>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Centre d'Information</h1>
            <p className="text-slate-500 text-sm">
              Documents juridiques, politiques, règles de concours & FAQ — Verso
              Air™
            </p>
          </div>
        </div>

        {/* Tab Carousel */}
        <div className="relative mb-10">
          {/* Left arrow */}
          <button
            onClick={() => scrollToTab("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-gray-900/90 border border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-gray-500 transition-colors -ml-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable tabs */}
          <div
            ref={tabsRef}
            className="flex items-center gap-2 overflow-x-auto px-10 py-2 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    isActive
                      ? "bg-amber-500/20 text-amber-600 border border-amber-500/40"
                      : "bg-gray-900/50 text-slate-500 border border-slate-300 hover:text-gray-200 hover:border-slate-300"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scrollToTab("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-gray-900/90 border border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-gray-500 transition-colors -mr-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Active Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="prose   max-w-none"
          >
            <ActiveContent />
          </motion.div>
        </AnimatePresence>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-slate-300">
          <p className="text-gray-500 text-sm text-center">
            © {new Date().getFullYear()} Verso Air Inc. Tous droits réservés.
            <br />
            80 Mornelle Crt, Toronto, Ontario, Canada M1E 4P8
            <br />
            <a
              href="mailto:legal@versoair.com"
              className="text-amber-600/60 hover:text-amber-600 transition-colors"
            >
              legal@versoair.com
            </a>
            {" · "}
            <a
              href="mailto:privacy@versoair.com"
              className="text-amber-600/60 hover:text-amber-600 transition-colors"
            >
              privacy@versoair.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
