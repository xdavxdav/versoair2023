import { ArrowRight, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

export default function VHeatrzPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <span className="mb-6 inline-flex w-fit items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
          Coming soon
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          vHeatrz is an upcoming organization.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          vHeatrz is preparing to launch as an organization for cultural and
          community initiatives, separate from VERSO AIR INC. Program and
          participation details will be shared closer to launch.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/about">
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              <Building2 className="mr-2 h-4 w-4" />
              About VERSO AIR INC.
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="border-slate-600 bg-slate-900 text-white hover:bg-slate-800">
              <Mail className="mr-2 h-4 w-4" />
              Contact VERSO AIR INC.
            </Button>
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Current policy
          </p>
          <p className="mt-3 text-base leading-relaxed">
            Programs, partnerships, and impact figures will be announced as
            vHeatrz prepares to launch. No impact claims are published without
            supporting evidence.
          </p>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
