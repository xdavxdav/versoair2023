import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Info } from "lucide-react";

export default function GuaranteeHelp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300" />
            <h1 className="text-2xl font-bold text-gray-800">
              Service Terms & Availability
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Current terms</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              Service levels, performance targets, support response times,
              success outcomes, warranties, and refund promises are not
              established on this page. We do not currently offer those as
              guarantees.
            </p>
            <p>
              Any terms for a specific service will be provided in writing
              before an order is accepted. This notice does not replace terms
              already agreed for an existing transaction or rights provided by
              applicable law.
            </p>
          </div>
          <Link href="/contact?subject=Service%20terms%20question">
            <Button className="mt-6" variant="outline">
              Ask about service terms
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
