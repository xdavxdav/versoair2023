import { Button } from "@/components/ui/button";
import BackLink from "@/components/BackLink";
import { Link } from "wouter";
import { ArrowLeft, Info } from "lucide-react";

export default function DeliveryHelp() {
  return (
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <BackLink>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </BackLink>
            </Button>
            <div className="h-6 border-l border-gray-300" />
            <h1 className="text-2xl font-bold text-gray-800">
              Delivery & Fulfillment
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Current availability</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              Verso Air does not offer hardware installation or guaranteed
              shipping timelines. Checkout for print products collects a
              shipping address (Canada and the United States) but does not
              calculate shipping; Marketing packs are digital and need none.
            </p>
            <p>
              Delivery or pickup arrangements, any fees, and estimated dates for
              printed products are confirmed with you by email after your
              order. A directory-listing inquiry does not create an order.
            </p>
          </div>
          <Link href="/contact?subject=Delivery%20availability">
            <Button className="mt-6" variant="outline">
              Ask about availability
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
