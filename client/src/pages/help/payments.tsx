import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CreditCard, Info } from "lucide-react";

export default function PaymentsHelp() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-800">Payment Help</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Payment Availability */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Online payment availability</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Online checkout and subscription billing are not currently
              available. We will confirm current options, fees, and terms
              directly before accepting any payment.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-3">Need information?</h2>
            <p className="mb-4 text-sm text-gray-600">
              Ask the team about availability. An inquiry does not create an
              order or authorize a charge.
            </p>
            <Link href="/contact?subject=Payment%20availability">
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Contact the team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}