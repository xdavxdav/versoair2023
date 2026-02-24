import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Shield, Award, Clock, Star } from "lucide-react";

export default function GuaranteeHelp() {
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
            <h1 className="text-2xl font-bold text-gray-800">Quality Guarantee</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Service Guarantee */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Service Quality Guarantee</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">99.9% Uptime Guarantee</h3>
                <p className="text-green-800 text-sm">Our platform maintains 99.9% uptime with redundant servers and automatic failover. If we fall below this standard, you receive service credits.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Data Accuracy Promise</h3>
                <p className="text-blue-800 text-sm">All analytics data is verified and processed with enterprise-grade algorithms. Inaccurate data reports are corrected within 24 hours.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Response Time Commitment</h3>
                <p className="text-purple-800 text-sm">Platform response times under 2 seconds guaranteed. Support responses within 1 hour for critical issues, 4 hours for general inquiries.</p>
              </div>
            </div>
          </div>

          {/* Performance Guarantees */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Performance Standards</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Analytics Accuracy</h3>
                <p className="text-orange-800 text-sm">Data processing accuracy of 99.95% or higher. Any discrepancies are automatically flagged and corrected with notification alerts.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Report Generation Speed</h3>
                <p className="text-teal-800 text-sm">Custom reports generated within 30 seconds for standard queries, 5 minutes for complex multi-source analytics.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Real-Time Updates</h3>
                <p className="text-indigo-800 text-sm">Live dashboard updates within 5 seconds of data changes. Critical business alerts delivered instantly via multiple channels.</p>
              </div>
            </div>
          </div>

          {/* Security Guarantees */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Security & Compliance</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Data Security</h3>
                <p className="text-gray-800 text-sm">Bank-level encryption (AES-256) for all data. SOC 2 Type II certified with regular security audits and penetration testing.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Compliance Standards</h3>
                <p className="text-yellow-800 text-sm">GDPR, HIPAA, and SOX compliant. Regular compliance audits ensure your business data meets all regulatory requirements.</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Breach Protection</h3>
                <p className="text-red-800 text-sm">Zero data breaches in our history. Multi-layer security with intrusion detection and immediate incident response protocols.</p>
              </div>
            </div>
          </div>

          {/* Satisfaction Guarantee */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-semibold">Satisfaction Promise</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">30-Day Money Back</h3>
                <p className="text-blue-800 text-sm">Not satisfied with our platform? Get a full refund within 30 days, no questions asked. We'll even help you migrate your data.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Success Guarantee</h3>
                <p className="text-green-800 text-sm">We guarantee measurable business improvements within 90 days of implementation. Our success team works with you to ensure ROI.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Dedicated Support</h3>
                <p className="text-purple-800 text-sm">Every customer gets a dedicated success manager and priority support. Your success is our primary commitment.</p>
              </div>
            </div>
          </div>

          {/* Warranty Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Hardware Warranty</h2>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">3-Year Hardware Warranty</h3>
                <p className="text-orange-800 text-sm">All IoT sensors, analytics hardware, and business intelligence equipment covered for 3 years with free replacement and support.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Extended Coverage Available</h3>
                <p className="text-teal-800 text-sm">Optional extended warranty up to 5 years with on-site service, preventive maintenance, and priority replacement programs.</p>
              </div>
            </div>
          </div>

          {/* Guarantee Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Guarantee Claims</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Button className="w-full justify-start" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                <span>Report Service Issue</span>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Award className="h-4 w-4 mr-2" />
                <span>Check Service Status</span>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                <span>Contact Success Team</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}