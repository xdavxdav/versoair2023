import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Info } from "lucide-react";

export default function ReturnsHelp() {
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
              Returns & Refund Information
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
              Online checkout and a self-service return portal are not
              currently available. We are not publishing a general refund
              window, processing time, or hardware return policy here.
            </p>
            <p>
              Terms for any specific purchase must be provided in writing
              before an order is accepted. For an existing transaction, refer
              to the terms provided at purchase. Nothing on this page limits
              rights that apply under applicable law.
            </p>
          </div>
          <Link href="/contact?subject=Returns%20and%20refund%20question">
            <Button className="mt-6" variant="outline">
              Ask about a transaction
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
