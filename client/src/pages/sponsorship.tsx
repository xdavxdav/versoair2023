"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Target,
  Users,
  TrendingUp,
  Award,
  Heart,
  Globe,
  Briefcase,
  CheckCircle,
  Star,
  ArrowRight,
  Building2,
  Megaphone,
  PieChart,
  Lightbulb,
  Gift,
  Handshake,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import SponsorSlotMachine from "@/components/SponsorSlotMachine";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const viewport = { once: true, margin: "-80px" };

const WHY_SPONSOR = [
  {
    icon: Users,
    title: "Access to 800+ Artisans",
    desc: "Direct network to traditional craftspeople across 12 regions of Côte d'Ivoire — partners for authentic sourcing, cultural collaboration, or workforce development.",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: Megaphone,
    title: "Brand Visibility & Impact",
    desc: "Logo placement across all platforms, social media, events, and marketing materials reaching 50,000+ engaged community members monthly.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Heart,
    title: "Measurable Social Impact",
    desc: "Quarterly impact reports showing real outcomes — families supported, artisans trained, cultural traditions preserved. Document your ESG commitments.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: Globe,
    title: "International Visibility",
    desc: "Featured at global cultural forums, UNESCO events, and pan-African initiatives. Position your brand as a leader in cultural sustainability.",
    color: "from-teal-500 to-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Market Access & Growth",
    desc: "Reach emerging artisan entrepreneurs, cultural markets, and West African economic corridors expanding at 12%+ annually.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Briefcase,
    title: "Strategic Partnership Opportunities",
    desc: "Co-develop programs, training initiatives, product lines, or B2B channels that tap into $500M+ African cultural economy.",
    color: "from-violet-500 to-fuchsia-600",
  },
];

const SPONSORSHIP_TIERS = [
  {
    name: "PATRON",
    subtitle: "Cultural Champion",
    investment: "$100,000+/year",
    color: "from-slate-700 to-slate-600",
    border: "border-slate-400/50",
    badge: "bg-gradient-to-r from-slate-600 to-slate-500 text-white",
    icon: "👑",
    benefits: [
      "Premium logo on all channels (website, events, publications)",
      "Dedicated partnership manager & quarterly strategy sessions",
      "Speaking slot at annual ArtiHuman gala (VIP table, 10 guests)",
      "Co-branded marketing campaign & joint press releases",
      "Exclusive artisan sourcing/procurement access (first right of refusal)",
      "Naming rights to one major program or workshop series",
      "Full impact reporting with verified metrics & case studies",
      "Invitation to international cultural delegations",
      "Recognition in annual Patron Excellence Awards ceremony",
    ],
    ideal: "Global corporations, foundations, major financial institutions",
  },
  {
    name: "AMBASSADOR",
    subtitle: "Cultural Leader",
    investment: "$50,000–$100,000/year",
    color: "from-amber-600 to-yellow-500",
    border: "border-amber-400/60",
    badge: "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900",
    icon: "🌟",
    highlight: true,
    benefits: [
      "Primary logo placement (website, events, select campaigns)",
      "Partnership manager & bi-monthly check-ins",
      "Keynote opportunity at 2 major events per year",
      "Co-created program (artisan training, cultural exchange, etc.)",
      "Curated artisan network access for B2B partnerships",
      "Semi-annual impact reports & custom analytics",
      "Media features in newsletters & social channels",
      "2–3 event invitations (VIP seating)",
      "Joint CSR/ESG impact documentation",
    ],
    ideal: "Mid-size companies, regional foundations, NGOs, social enterprises",
  },
  {
    name: "SUPPORTER",
    subtitle: "Cultural Partner",
    investment: "$15,000–$50,000/year",
    color: "from-emerald-600 to-teal-500",
    border: "border-emerald-400/50",
    badge: "bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-900",
    icon: "🤝",
    benefits: [
      "Logo on website partner directory & select events",
      "Annual partnership review & updates",
      "Co-branded workshop or training session",
      "Access to artisan network for specific initiatives",
      "Annual impact summary with participation metrics",
      "Social media features & newsletter mentions",
      "Event attendance (2 invitations per year)",
      "Listing in annual sponsorship report",
    ],
    ideal:
      "Small to mid-size businesses, local foundations, emerging social enterprises",
  },
  {
    name: "FRIEND",
    subtitle: "Cultural Contributor",
    investment: "Custom (from $5,000)",
    color: "from-sky-600 to-blue-500",
    border: "border-sky-400/50",
    badge: "bg-gradient-to-r from-sky-500 to-blue-400 text-sky-900",
    icon: "💝",
    benefits: [
      "Website listing in partner directory",
      "Annual report acknowledgment",
      "Tax deductibility documentation",
      "Event invitation (1 per year)",
      "Social media shout-out",
      "Monthly newsletter updates on impact",
    ],
    ideal: "Startups, boutique agencies, individual donors, local businesses",
  },
];

const SPONSORSHIP_OPTIONS = [
  {
    title: "Program Sponsorship",
    desc: "Sponsor a specific artisan training program, workshop series, or cultural initiative.",
    examples: [
      "Textile Weaving Bootcamp",
      "Music Production Academy",
      "Business Skills Training",
    ],
    icon: Lightbulb,
    color: "from-indigo-500 to-purple-600",
  },
  {
    title: "Event Sponsorship",
    desc: "Title or major sponsorship of cultural festivals, exhibitions, or community events.",
    examples: [
      "Annual Artisan Showcase",
      "World Music Festival",
      "Cultural Heritage Month",
    ],
    icon: Gift,
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "Artisan Sponsorship",
    desc: "Directly support a master artisan or emerging craftsperson's development and market access.",
    examples: [
      "Master Weaver Fellowship",
      "Young Artist Residency",
      "Craft Shop Setup",
    ],
    icon: Heart,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Scholarship Sponsorship",
    desc: "Fund training scholarships, apprenticeships, or international cultural exchanges.",
    examples: [
      "100 Artisan Training Scholarships",
      "Youth Leadership Program",
      "International Exchange",
    ],
    icon: Award,
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Infrastructure Sponsorship",
    desc: "Support workshop facilities, equipment, or community centers that serve artisans.",
    examples: [
      "Digital Marketing Studio",
      "Textile Workshop Setup",
      "Community Hub",
    ],
    icon: Building2,
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "Research & Documentation",
    desc: "Fund impact research, cultural documentation, or knowledge preservation initiatives.",
    examples: [
      "Impact Study Partnership",
      "Digital Archive Project",
      "Craft Skills Documentation",
    ],
    icon: PieChart,
    color: "from-violet-500 to-fuchsia-600",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Connect",
    desc: "Schedule a call with our Partnership Team to explore your CSR goals, business objectives, and cultural interests.",
  },
  {
    step: "2",
    title: "Co-design",
    desc: "Together, we craft a custom sponsorship package aligned with your brand values and investment level.",
  },
  {
    step: "3",
    title: "Activate",
    desc: "Launch joint marketing, announce partnership, and begin program rollout. Your support transforms lives.",
  },
  {
    step: "4",
    title: "Measure & Report",
    desc: "Quarterly impact reports, case studies, and verified metrics document real-world outcomes for your stakeholders.",
  },
  {
    step: "5",
    title: "Grow Together",
    desc: "Annual reviews inform next year's strategy — expanding reach, deepening impact, and strengthening partnership.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Sponsoring ArtiHuman aligned our CSR strategy with authentic community impact. Our team loves the transparency and real-time metrics.",
    author: "Sarah Chen",
    role: "VP Corporate Responsibility",
    org: "Global Fortune 500 Tech Company",
    color: "from-indigo-500 to-purple-600",
  },
  {
    quote:
      "This partnership opened new markets for us while preserving cultural heritage. Win-win in every sense.",
    author: "Kwesi Mensah",
    role: "CEO",
    org: "West African Crafts Collective",
    color: "from-amber-500 to-orange-500",
  },
  {
    quote:
      "The artisan network they connected us with became our most loyal supplier base. Plus, real impact for families.",
    author: "Marina Rossi",
    role: "Director of Sourcing",
    org: "International Design House",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function Sponsorship() {
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-[95vw] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold mb-6"
          >
            <Gift className="w-4 h-4" />
            Sponsorship Opportunities
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Invest in Culture.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Impact Lives.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Companies sponsoring <span className="notranslate">ArtiHuman</span>{" "}
            gain more than brand visibility — they access a network of 800+
            artisans, support measurable cultural impact, and build authentic
            ESG credentials. Let's create lasting value together.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#tiers">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-8 py-6 rounded-2xl text-lg shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all">
                See Sponsorship Tiers
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <Link to="/contact">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-6 rounded-2xl text-lg"
              >
                Schedule a Call
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── WHY SPONSOR ───────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest mb-3 block">
              The Opportunity
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Why Companies Choose to Sponsor
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Sponsorship with <span className="notranslate">ArtiHuman</span>{" "}
              aligns CSR, business growth, and authentic cultural impact in one
              powerful partnership.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {WHY_SPONSOR.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-emerald-200 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SPONSORSHIP OPTIONS ───────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest mb-3 block">
              Flexible Models
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              How You Can Sponsor
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Sponsorships are customizable. Choose what aligns with your
              mission and goals.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {SPONSORSHIP_OPTIONS.map((opt, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center mb-4 shadow-md`}
                >
                  <opt.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">
                  {opt.title}
                </h3>
                <p className="text-slate-500 text-sm mb-4">{opt.desc}</p>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Examples:
                  </p>
                  <ul className="space-y-1">
                    {opt.examples.map((ex, j) => (
                      <li
                        key={j}
                        className="text-xs text-slate-500 flex items-center gap-2"
                      >
                        <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SPONSORSHIP TIERS ─────────────────────────────────── */}
      <section id="tiers" className="py-20 bg-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-16"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest mb-3 block">
              Investment Levels
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Sponsorship Tiers
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              From Friend to Patron — choose the level that fits your budget and
              ambitions.
            </p>
            <div className="mt-8">
              <SponsorSlotMachine
                words={["Patron", "Ambassador", "Supporter", "Friend"]}
                duration={2.5}
                cycleDelay={9}
              />
            </div>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid lg:grid-cols-2 gap-6 mb-6"
          >
            {SPONSORSHIP_TIERS.slice(0, 2).map((tier, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className={`relative bg-white rounded-3xl overflow-hidden border-2 ${tier.border} shadow-xl transition-all ${tier.highlight ? "ring-2 ring-amber-400/50 shadow-amber-400/20 lg:col-span-1" : ""}`}
              >
                {tier.highlight && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 text-xs font-black px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div
                  className={`bg-gradient-to-r ${tier.color} p-6 text-white`}
                >
                  <div className="text-2xl mb-2">{tier.icon}</div>
                  <h3 className="text-2xl font-black mb-1">{tier.name}</h3>
                  <p className="text-white/80 text-sm font-semibold mb-2">
                    {tier.subtitle}
                  </p>
                  <p className="text-white font-bold">{tier.investment}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs text-slate-500 font-semibold mb-4 uppercase tracking-wide">
                    What You Get:
                  </p>
                  <ul className="space-y-2 mb-6">
                    {tier.benefits.map((benefit, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-3">Ideal for:</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {tier.ideal}
                    </p>
                  </div>
                  <Link to="/contact">
                    <Button
                      className={`w-full mt-4 font-bold rounded-xl ${tier.highlight ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-amber-900" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"}`}
                    >
                      Explore {tier.name}
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid sm:grid-cols-2 gap-6"
          >
            {SPONSORSHIP_TIERS.slice(2).map((tier, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                className={`bg-white rounded-2xl overflow-hidden border-2 ${tier.border} shadow-lg transition-all`}
              >
                <div
                  className={`bg-gradient-to-r ${tier.color} p-5 text-white`}
                >
                  <div className="text-xl mb-1">{tier.icon}</div>
                  <h3 className="text-xl font-black mb-1">{tier.name}</h3>
                  <p className="text-white/80 text-xs font-semibold mb-1">
                    {tier.subtitle}
                  </p>
                  <p className="text-white font-bold text-sm">
                    {tier.investment}
                  </p>
                </div>
                <div className="p-5">
                  <ul className="space-y-1.5 mb-4">
                    {tier.benefits.slice(0, 5).map((benefit, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-xs text-slate-700"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact">
                    <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg text-sm">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest mb-3 block">
              Process
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              From Conversation to Impact
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="space-y-4"
          >
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black">
                    {item.step}
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-lg font-black text-slate-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(16,185,129,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-[95vw] mx-auto px-6 relative z-10">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="text-center mb-14"
          >
            <span className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 block">
              From Our Sponsors
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why They Sponsor
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="grid md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}
                  >
                    {t.author.split(" ")[0][0]}
                    {t.author.split(" ")[1][0]}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {t.author}
                    </div>
                    <div className="text-emerald-400 text-xs">{t.role}</div>
                    <div className="text-slate-400 text-xs">{t.org}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT CTA ───────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Ready to Make a Difference?
            </h2>
            <p className="text-white/85 text-lg mb-8 max-w-2xl mx-auto">
              Let's talk about how your company can support artisan communities
              while achieving your business and CSR goals. Our sponsorship team
              is ready to build a custom partnership.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link to="/contact">
                <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-black px-8 py-6 rounded-2xl text-lg shadow-2xl hover:scale-105 transition-all">
                  Schedule Sponsorship Call
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center text-white/85 text-sm">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                partnerships@artihuman.ci
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +225 27 20 21 22 23
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Abidjan, Côte d'Ivoire
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
