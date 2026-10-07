import { ArrowRight, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

export default function OngCulturelle() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <span className="mb-6 inline-flex w-fit items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
          Future vision
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Cultural and community initiatives are part of a future vision.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          This future direction is associated with vHeatrz, an organization in
          development and distinct from VERSO AIR INC. Programs, services, and
          launch details will be shared when they are confirmed.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/vheatrz">
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              <Building2 className="mr-2 h-4 w-4" />
              About vHeatrz
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="outline"
              className="border-slate-600 bg-slate-900 text-white hover:bg-slate-800"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact VERSO AIR INC.
            </Button>
          </Link>
        </div>
      </section>
      <ScrollToTop />
    </main>
  );
}
