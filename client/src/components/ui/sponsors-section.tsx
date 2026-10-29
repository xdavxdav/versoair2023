import { Link } from "wouter";
import { ArrowRight, Handshake, Lightbulb } from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getPartnershipSponsorCopy } from "@/lib/partnership-sponsor-content";

export function SponsorsSection({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const { currentLang } = useLanguage();
  const language = currentLang === "en" ? "en" : "fr";
  const copy = getPartnershipSponsorCopy(language);

  return (
    <section
      data-testid="partnership-sponsor-section"
      className="border-t border-slate-200 bg-white px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl">
        {showHeader && (
          <div className="mb-8 text-center sm:mb-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {copy.eyebrow}
            </p>
            <h2 className="mb-4 text-3xl font-bold text-slate-950 sm:text-4xl">
              {copy.heading}
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.introduction}
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7">
          <article
            data-testid="partnership-inquiry-card"
            className="flex flex-col rounded-3xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-white">
              <Handshake aria-hidden="true" className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-950">
              {copy.partnershipTitle}
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              {copy.partnershipDescription}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-800">
              {copy.discussionLabel}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {copy.discussionTopics.map((topic) => (
                <li key={topic} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-700">
                    •
                  </span>
                  {topic}
                </li>
              ))}
            </ul>
            <Link
              href={`/contact?subject=${encodeURIComponent(copy.partnershipSubject)}`}
              data-testid="partnership-inquiry-link"
              className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
            >
              {copy.partnershipCta}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>

          <article
            data-testid="future-sponsor-sample-card"
            className="flex flex-col rounded-3xl border border-amber-900/15 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-950">
              <Lightbulb aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="w-fit rounded-full border border-amber-900/15 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-950">
              {copy.sponsorStatus}
            </p>
            <h3 className="mt-4 text-2xl font-bold text-slate-950">
              {copy.sponsorTitle}
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              {copy.sponsorDescription}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {copy.mentoringExamples.map((example) => (
                <li key={example} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-700">
                    •
                  </span>
                  {example}
                </li>
              ))}
            </ul>
            <p
              data-testid="future-sponsor-disclaimer"
              className="mt-5 border-t border-amber-900/10 pt-4 text-sm leading-6 text-slate-600"
            >
              {copy.sponsorDisclaimer}
            </p>
            <Link
              href="/sponsorship"
              data-testid="sponsorship-concepts-link"
              className="mt-5 inline-flex w-fit items-center gap-2 font-semibold text-amber-950 underline decoration-amber-700/40 underline-offset-4 hover:text-amber-800"
            >
              {copy.sponsorPageLink}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
