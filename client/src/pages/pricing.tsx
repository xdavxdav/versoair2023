import { ArrowRight, CircleHelp, Globe, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";

export default function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3efe9] pb-24 text-slate-900">
      <SeoHead
        title="Plan Availability | VersoAir"
        description="GeoAdmin subscription pricing and availability have not been finalized. Request a business directory listing eligibility review with VersoAir."
        canonicalPath="/pricing"
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16">
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-800">
          <Globe className="h-3.5 w-3.5" />
          GeoAdmin plan information
        </div>

        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Subscription plans are not available yet
        </h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-slate-600">
          GeoAdmin plan scope, included features, fees, billing, cancellation,
          and support terms are still being finalized. No online subscription or
          free trial is currently being offered through this page.
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <Info className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="mb-2 text-lg font-semibold">
                No published prices or purchase commitment
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Earlier tier names and price estimates are not an active offer.
                We will share confirmed details directly before any plan is
                available to purchase.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <h2 className="mb-2 text-lg font-semibold">
                Looking to list a business?
              </h2>
              <p className="mb-5 text-sm leading-relaxed text-slate-600">
                The current directory pathway is an eligibility review.
                Inclusion, availability, requirements, and any fees are
                confirmed before proceeding.
              </p>
              <Link href="/contact?subject=Business%20directory%20listing%20eligibility%20review">
                <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
                  Request a listing review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <ScrollToTop />
    </div>
  );
}
