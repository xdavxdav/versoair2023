import { ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { SeoHead } from "@/components/seo/SeoHead";

export default function Impact() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SeoHead
        title="Impact | VersoAir"
        description="Verso Air is preparing its first business-directory market. Verified customer outcomes will be published when evidence is available."
        canonicalPath="/impact"
      />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-20 text-center text-white">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h1 className="mb-5 text-4xl font-bold md:text-5xl">Our Impact</h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Verso Air is preparing its first business-directory market. We do not
          currently publish verified customer outcomes, case studies, or
          aggregate impact figures.
        </p>
        <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-400">
          We will share results only when they are supported by evidence and
          approved for publication. The directory is opening market by market,
          not everywhere at once.
        </p>
        <Link href="/services">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
            Request a listing review
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </main>
      <ScrollToTop />
    </div>
  );
}
