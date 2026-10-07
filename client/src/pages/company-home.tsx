import { ArrowRight, Building2, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo/SeoHead";

const copy = {
  en: {
    title: "VERSO AIR INC. | Company information",
    description:
      "Meet VERSO AIR INC., an Ontario company preparing the VERSO AIR platform for its Toronto launch.",
    badge: "An Ontario corporation",
    headline: "A company building what comes next.",
    introduction:
      "VERSO AIR INC. is developing a digital platform for business visibility and creative projects. Public services and directory listings will be introduced as they are ready and verified.",
    about: "About the company",
    contact: "Contact",
    focus: "Toronto launch focus",
    foundersLabel: "Co-founded by",
    founders: "Boussou Elvis Jonathan and Joel Vanga",
    hierarchyHeading: "One company. A clear brand architecture.",
    hierarchyIntro:
      "The company identity and umbrella brand have distinct roles.",
    legalEntity: "Legal company",
    companyDetail: "The incorporated Ontario business.",
    umbrella: "Umbrella brand",
    umbrellaDetail:
      "The public-facing brand for the platform and its services.",
    futureProjects: "Future projects",
    futureDetail:
      "Additional products and services will be announced when they are ready.",
    readinessHeading: "Services are being prepared",
    readiness:
      "Listings, ratings, audience figures, service levels, and payment availability are not being presented as verified live results. Availability will be announced as each service is ready.",
    email: "Email",
    canada: "Canada",
    coteDivore: "Côte d’Ivoire",
  },
  fr: {
    title: "VERSO AIR INC. | Informations sur l’entreprise",
    description:
      "Découvrez VERSO AIR INC., une société ontarienne qui prépare le lancement à Toronto de la plateforme VERSO AIR.",
    badge: "Société constituée en Ontario",
    headline: "Une entreprise qui prépare la suite.",
    introduction:
      "VERSO AIR INC. développe une plateforme numérique dédiée à la visibilité des entreprises et aux projets créatifs. Les services publics et les annonces de l’annuaire seront présentés lorsqu’ils seront prêts et vérifiés.",
    about: "À propos de l’entreprise",
    contact: "Nous joindre",
    focus: "Lancement axé sur Toronto",
    foundersLabel: "Cofondée par",
    founders: "Boussou Elvis Jonathan et Joel Vanga",
    hierarchyHeading: "Une société. Une architecture de marque claire.",
    hierarchyIntro:
      "L’identité de l’entreprise et la marque parapluie ont des rôles distincts.",
    legalEntity: "Société juridique",
    companyDetail: "L’entreprise constituée en Ontario.",
    umbrella: "Marque parapluie",
    umbrellaDetail:
      "La marque publique de la plateforme et de ses services.",
    futureProjects: "Projets futurs",
    futureDetail:
      "Les autres produits et services seront annoncés lorsqu’ils seront prêts.",
    readinessHeading: "Services en préparation",
    readiness:
      "Les annonces, notes, statistiques d’audience, niveaux de service et options de paiement ne sont pas présentés comme des résultats réels vérifiés. La disponibilité sera annoncée lorsque chaque service sera prêt.",
    email: "Courriel",
    canada: "Canada",
  },
} as const;

export default function CompanyHome() {
  const { currentLang } = useLanguage();
  const text = currentLang === "en" ? copy.en : copy.fr;

  return (
    <main className="min-h-screen bg-[#f3efe9] text-slate-900">
      <SeoHead
        title={text.title}
        description={text.description}
        canonicalPath="/"
      />
      <section className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),transparent_40%),linear-gradient(135deg,#0f172a,#111827)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
              <Building2 className="h-4 w-4" />
              {text.badge}
            </span>
            <h1 className="mt-7 text-4xl font-bold tracking-tight sm:text-6xl">
              VERSO AIR INC.
            </h1>
            <p className="mt-5 text-2xl font-semibold text-amber-200 sm:text-3xl">
              {text.headline}
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {text.introduction}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300 sm:w-auto"
              >
                <a href="/about">
                  {text.about}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <a href="mailto:support@versoair.com">
                <Button
                  variant="outline"
                  className="w-full border-slate-500 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {text.contact}
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-300" />
                {text.focus}
              </span>
              <span>
                {text.foundersLabel}: {text.founders}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {text.hierarchyHeading}
            </h2>
            <p className="mt-3 text-slate-600">{text.hierarchyIntro}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Building2 className="mb-4 h-7 w-7 text-amber-600" />
              <h3 className="text-lg font-bold">{text.legalEntity}</h3>
              <p className="mt-2 text-xl font-semibold">VERSO AIR INC.</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {text.companyDetail}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ArrowRight className="mb-4 h-7 w-7 text-amber-600" />
              <h3 className="text-lg font-bold">{text.umbrella}</h3>
              <p className="mt-2 text-xl font-semibold">VERSO AIR™</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {text.umbrellaDetail}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Building2 className="mb-4 h-7 w-7 text-amber-600" />
              <h3 className="text-lg font-bold">{text.futureProjects}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {text.futureDetail}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-amber-200 bg-amber-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">{text.readinessHeading}</h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            {text.readiness}
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:p-8">
          <div>
            <h2 className="text-xl font-bold">{text.contact}</h2>
            <a
              className="mt-2 inline-flex items-center gap-2 text-slate-700 underline"
              href="mailto:support@versoair.com"
            >
              <Mail className="h-4 w-4" />
              {text.email}: support@versoair.com
            </a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <a
              className="inline-flex items-center gap-2 text-slate-700"
              href="tel:+14374359726"
            >
              <Phone className="h-4 w-4" />
              +1 437-435-9726 — {text.canada}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
