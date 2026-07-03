import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, Calendar, CheckCircle, AlertCircle } from "lucide-react";

export default function ReturnsHelp() {
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
            <h1 className="text-2xl font-bold text-gray-800">Returns & Exchanges</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Return Policy */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Return Policy</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">30-Day Return Window</h3>
                <p className="text-green-800 text-sm">All software subscriptions and hardware can be returned within 30 days of purchase for a full refund, no questions asked.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Satisfaction Guarantee</h3>
                <p className="text-blue-800 text-sm">If our platform doesn't meet your business needs, we'll work with you to find a solution or provide a complete refund.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Data Portability</h3>
                <p className="text-purple-800 text-sm">Before cancellation, we'll help you export all your data in standard formats for seamless migration to other platforms.</p>
              </div>
            </div>
          </div>

          {/* Return Process */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">How to Return</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Step 1: Request Return</h3>
                <p className="text-orange-800 text-sm">Contact our support team or use the self-service return portal in your account dashboard to initiate the return process.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Step 2: Return Authorization</h3>
                <p className="text-teal-800 text-sm">You'll receive a Return Merchandise Authorization (RMA) number and instructions for returning any physical hardware.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Step 3: Account Deactivation</h3>
                <p className="text-indigo-800 text-sm">For software subscriptions, access will be maintained until the return is processed to ensure business continuity.</p>
              </div>
            </div>
          </div>

          {/* Refund Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold">Refunds</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Processing Time</h3>
                <p className="text-gray-800 text-sm">Refunds are processed within 3-5 business days after we receive your return or cancellation request.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Prorated Refunds</h3>
                <p className="text-yellow-800 text-sm">Annual subscriptions receive prorated refunds based on unused time. Monthly subscriptions are refunded in full if cancelled before renewal.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Refund Methods</h3>
                <p className="text-blue-800 text-sm">Refunds are issued to your original payment method. For corporate accounts, we can process refunds via check or bank transfer.</p>
              </div>
            </div>
          </div>

          {/* Exchange Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <h2 className="text-xl font-semibold">Exchanges & Upgrades</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Plan Changes</h3>
                <p className="text-red-800 text-sm">Upgrade or downgrade your subscription plan at any time. Changes take effect at your next billing cycle.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Hardware Exchanges</h3>
                <p className="text-yellow-800 text-sm">Defective hardware can be exchanged within warranty period. We'll provide a replacement before you return the faulty unit.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Feature Migrations</h3>
                <p className="text-green-800 text-sm">Moving to a different analytics platform? We'll help migrate your configurations and provide training on new features.</p>
              </div>
            </div>
          </div>

          {/* Return Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Return Actions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Button className="w-full justify-start" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                <span>Start Return Process</span>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Track Return Status</span>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Contact Support</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}