import {
  ArrowRight,
  Bot,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ScrollToTop from "@/components/ScrollToTop";
import {
  captureCampaignContext,
  getCampaignContext,
  trackEvent,
  withCampaignContext,
} from "@/lib/gtag-tracking";

type Audience = "artists" | "businesses" | "listeners";

type AudienceConfig = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  benefits: string[];
  accent: string;
};

const AUDIENCES: Record<Audience, AudienceConfig> = {
  artists: {
    eyebrow: "Free artist beta",
    title: "Put your music in motion.",
    description:
      "Publish your tracks, shape your artist presence, and learn what listeners respond to from one practical home for your music.",
    primaryLabel: "Join the artist beta",
    primaryHref: "/auth/signin?mode=register&audience=artists",
    secondaryLabel: "Explore the artist portal",
    secondaryHref: "/artist-portal",
    benefits: [
      "Upload tracks and artwork",
      "Manage releases and publishing states",
      "See streams, listeners, and earnings insights",
    ],
    accent: "from-amber-300 via-orange-400 to-rose-500",
  },
  businesses: {
    eyebrow: "Free business beta",
    title: "Make your local business easier to find.",
    description:
      "Create or claim your listing, present the right information, and connect with the communities and customers around you.",
    primaryLabel: "Join the business beta",
    primaryHref: "/auth/signin?mode=register&audience=businesses",
    secondaryLabel: "Explore the business directory",
    secondaryHref: "/businesses-directory",
    benefits: [
      "Create or claim a business listing",
      "Add photos, services, and contact details",
      "Move through verification with GeoAdmin support",
    ],
    accent: "from-cyan-300 via-teal-400 to-emerald-500",
  },
  listeners: {
    eyebrow: "Free listener beta",
    title: "Find your next favorite sound.",
    description:
      "Stream emerging artists, follow the people behind the music, and take part in a community built around discovery.",
    primaryLabel: "Join the listener beta",
    primaryHref: "/auth/signin?mode=register&audience=listeners",
    secondaryLabel: "Enter the music vault",
    secondaryHref: "/music/vault",
    benefits: [
      "Stream tracks and discover new artists",
      "Save favorites and build your listening trail",
      "Comment, connect, and stay close to the community",
    ],
    accent: "from-fuchsia-300 via-violet-400 to-indigo-500",
  },
};

export default function BetaAudiencePage({ audience }: { audience: Audience }) {
  const config = AUDIENCES[audience];
  const canonicalPath = `/for-${audience}`;
  const campaign = captureCampaignContext();

  useEffect(() => {
    trackEvent("ad_landing_view", "acquisition", audience, undefined, {
      audience,
      landing_path: window.location.pathname,
      ...getCampaignContext(),
    });
  }, [audience]);

  const trackCta = (destination: string, label: string) => {
    trackEvent("beta_cta_click", "acquisition", label, undefined, {
      audience,
      destination,
      ...campaign,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <Helmet>
        <title>{config.title} | VersoAir</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={`${window.location.origin}${canonicalPath}`} />
        <meta property="og:title" content={`${config.title} | VersoAir`} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={`${window.location.origin}${canonicalPath}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${config.title} | VersoAir`} />
        <meta name="twitter:description" content={config.description} />
      </Helmet>
      <ScrollToTop />
      <section className="relative isolate px-6 pb-20 pt-16 sm:px-10 lg:px-16 lg:pb-28 lg:pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_32%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
              {config.eyebrow}
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              {config.title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              {config.description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-amber-300 font-bold text-slate-950 hover:bg-amber-200"
              >
                <Link
                  href={withCampaignContext(config.primaryHref)}
                  onClick={() => trackCta(config.primaryHref, "primary")}
                >
                  {config.primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link
                  href={withCampaignContext(config.secondaryHref)}
                  onClick={() => trackCta(config.secondaryHref, "secondary")}
                >
                  {config.secondaryLabel}
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              No payment required. This is a free, invite-led beta.
            </p>
          </div>

          <div className="relative">
            <div
              className={`absolute -inset-10 -z-10 rounded-full bg-gradient-to-br ${config.accent} opacity-20 blur-3xl`}
            />
            <Card className="border-white/15 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur">
              <CardContent className="p-7 sm:p-9">
                <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Your first door
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      Start with one clear next step.
                    </p>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-amber-300" />
                </div>
                <ul className="space-y-5">
                  {config.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-3 text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-900/70 px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <SupportCard
            icon={HelpCircle}
            title="Questions first"
            href={withCampaignContext("/faq")}
            text="Browse practical answers before you create an account."
          />
          <SupportCard
            icon={Bot}
            title="Ask VersoAI"
            href={withCampaignContext("/versoai")}
            text="Get help choosing the right door for where you are starting."
          />
          <SupportCard
            icon={Users}
            title="One account, more doors"
            href={withCampaignContext("/auth/signin?mode=register")}
            text="Begin with one role and explore the rest of Verso Air later."
          />
        </div>
      </section>
    </main>
  );
}

function SupportCard({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof HelpCircle;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]"
    >
      <Icon className="h-6 w-6 text-amber-300" />
      <h2 className="mt-5 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      <span className="mt-5 inline-flex items-center text-sm font-semibold text-amber-200">
        Open{" "}
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export function ArtistsBetaPage() {
  return <BetaAudiencePage audience="artists" />;
}

export function BusinessesBetaPage() {
  return <BetaAudiencePage audience="businesses" />;
}

export function ListenersBetaPage() {
  return <BetaAudiencePage audience="listeners" />;
}
