import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CreditCard, DollarSign, Receipt, AlertTriangle } from "lucide-react";

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
          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Payment Methods</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Credit & Debit Cards</h3>
                <p className="text-blue-800 text-sm">We accept all major credit and debit cards including Visa, Mastercard, American Express, and Discover. Your card information is encrypted and secure.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Digital Wallets</h3>
                <p className="text-green-800 text-sm">Pay quickly with Apple Pay, Google Pay, or PayPal. These methods offer additional security and faster checkout.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Bank Transfer</h3>
                <p className="text-purple-800 text-sm">For enterprise customers, we support direct bank transfers and wire payments for larger subscription plans.</p>
              </div>
            </div>
          </div>

          {/* Billing & Subscriptions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Billing & Subscriptions</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Monthly vs Annual Plans</h3>
                <p className="text-orange-800 text-sm">Choose monthly flexibility or save 20% with annual billing. You can upgrade or downgrade your plan at any time.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Billing Cycles</h3>
                <p className="text-teal-800 text-sm">Your billing cycle starts from your subscription date. You'll receive invoices 3 days before each billing period.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Usage-Based Pricing</h3>
                <p className="text-indigo-800 text-sm">Some features are priced based on usage. Monitor your usage in the billing dashboard to avoid surprises.</p>
              </div>
            </div>
          </div>

          {/* Invoices & Receipts */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Invoices & Receipts</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Download Invoices</h3>
                <p className="text-gray-800 text-sm">Access all your invoices from the billing section. Download PDF copies for your records or accounting department.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Tax Information</h3>
                <p className="text-blue-800 text-sm">Invoices include applicable taxes based on your location. VAT/GST numbers are supported for business accounts.</p>
              </div>
            </div>
          </div>

          {/* Payment Issues */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold">Payment Issues</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Failed Payments</h3>
                <p className="text-red-800 text-sm">If a payment fails, check your card details and billing address. We'll retry failed payments for 7 days before suspending service.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Refunds & Cancellations</h3>
                <p className="text-yellow-800 text-sm">Refunds are processed within 5-10 business days. Annual subscriptions are eligible for prorated refunds within 30 days.</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Actions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Button className="w-full justify-start" variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Receipt className="h-4 w-4 mr-2" />
                Download Invoices
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Billing Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}