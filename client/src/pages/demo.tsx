import { ArrowRight, CalendarClock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";

export default function Demo() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SeoHead
        title="Demo Availability | VersoAir"
        description="VersoAir product demonstrations are not currently scheduled. Request information about the current business directory listing review."
        canonicalPath="/demo"
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20 text-center text-white">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
          <CalendarClock className="h-7 w-7" />
        </div>
        <h1 className="mb-5 text-4xl font-bold md:text-5xl">
          Demos are not currently scheduled
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          No demo appointments or demo accounts are currently available. We will
          publish a booking option when a verified demonstration process is
          ready.
        </p>
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm leading-relaxed text-slate-300">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p>
            The current business inquiry pathway is a directory-listing
            eligibility review. It does not promise listing approval, placement,
            or performance.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/services">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              Request a listing review
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact?subject=VersoAir%20demo%20availability">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Ask about demo availability
            </Button>
          </Link>
        </div>
      </main>
      <ScrollToTop />
    </div>
  );
}
