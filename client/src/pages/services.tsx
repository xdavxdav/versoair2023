import { ArrowRight, CheckCircle2, ClipboardList, Globe } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/seo/SeoHead";

export default function Services() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3efe9] text-slate-900">
      <SeoHead
        title="Business Directory Listing | VersoAir"
        description="Request an eligibility review for a business directory listing with VersoAir. Inclusion, availability, requirements, and fees are confirmed individually."
        canonicalPath="/services"
      />

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#f8f5f1_0%,#f3efe9_28%,#efe7dd_100%)] px-4 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),transparent_30%)]" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto max-w-4xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-4 py-2 text-sm font-medium text-amber-800 backdrop-blur-sm">
            <Globe className="h-4 w-4" />
            Business directory
          </div>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">
            Request a listing review
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 md:text-xl">
            Businesses may request an eligibility review for the VersoAir
            directory. Each request is reviewed before any listing is accepted.
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-slate-500">
            A request does not guarantee inclusion, placement, audience reach,
            or business results. Availability, requirements, and any fees are
            confirmed with you before proceeding.
          </p>
          <Link href="/contact?subject=Business%20directory%20listing%20eligibility%20review">
            <Button className="bg-amber-600 px-6 py-5 text-white hover:bg-amber-700">
              Request an eligibility review
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-12 md:grid-cols-2 md:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="mb-3 text-xl font-semibold">What happens next</h2>
          <ol className="space-y-3 text-sm leading-relaxed text-slate-600">
            <li className="flex gap-3">
              <span className="font-semibold text-amber-700">1.</span>
              Send your business name, website, location, and category.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-amber-700">2.</span>
              The team reviews eligibility and confirms current availability.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-amber-700">3.</span>
              Any listing requirements and fees are shared before you decide.
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mb-3 text-xl font-semibold">Other services</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            GeoAdmin subscriptions, analytics, integrations, and consulting are
            not currently offered for online purchase. Their scope, availability,
            and terms have not been finalized.
          </p>
          <Link href="/pricing">
            <Button
              variant="outline"
              className="mt-5 border-slate-300 text-slate-800"
            >
              View availability information
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
