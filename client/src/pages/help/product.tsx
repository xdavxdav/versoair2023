import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Package, BarChart3, Database, Cog } from "lucide-react";

export default function ProductHelp() {
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
            <h1 className="text-2xl font-bold text-gray-800">Product Help</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Platform Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Business Intelligence Platform</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Multi-Sector Analytics</h3>
                <p className="text-blue-800 text-sm">Comprehensive analytics for Commerce, Hotels, Construction, Automotive, Finance, and Entertainment sectors with industry-specific metrics.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Real-Time Dashboard</h3>
                <p className="text-green-800 text-sm">Live business metrics with customizable dashboards, interactive charts, and automated reporting for informed decision-making.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Location Intelligence</h3>
                <p className="text-purple-800 text-sm">Advanced GPS services, network analytics, and location-based insights for better business positioning and coverage analysis.</p>
              </div>
            </div>
          </div>

          {/* Analytics Features */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Analytics Features</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Performance Metrics</h3>
                <p className="text-orange-800 text-sm">Track sales performance, conversion rates, customer acquisition costs, and ROI across all business channels and touchpoints.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Predictive Analytics</h3>
                <p className="text-teal-800 text-sm">AI-powered forecasting for sales trends, market opportunities, and risk assessment to help you stay ahead of the competition.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Custom Reports</h3>
                <p className="text-indigo-800 text-sm">Generate detailed reports with custom parameters, automated scheduling, and export options for stakeholder presentations.</p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Data Management</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Data Integration</h3>
                <p className="text-gray-800 text-sm">Connect multiple data sources including CRM, ERP, social media, and third-party APIs for comprehensive business insights.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Data Security</h3>
                <p className="text-yellow-800 text-sm">Enterprise-grade encryption, access controls, and compliance with GDPR, HIPAA, and other data protection regulations.</p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-medium text-pink-900 mb-2">Backup & Recovery</h3>
                <p className="text-pink-800 text-sm">Automated daily backups with point-in-time recovery options. Your business data is always safe and accessible.</p>
              </div>
            </div>
          </div>

          {/* Configuration & Setup */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Cog className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Setup & Configuration</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Quick Start Guide</h3>
                <p className="text-blue-800 text-sm">Get started in minutes with our guided setup wizard. Connect your data sources and configure your first dashboard.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">API Integration</h3>
                <p className="text-green-800 text-sm">Robust REST API and webhooks for custom integrations. Complete documentation and SDKs available for developers.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">White-Label Options</h3>
                <p className="text-purple-800 text-sm">Customize the platform with your branding, colors, and domain for a seamless client experience.</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Product Actions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/commerce">
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Demo Dashboard
                </Button>
              </Link>
              <Button className="w-full justify-start" variant="outline">
                <Database className="h-4 w-4 mr-2" />
                <span>API Documentation</span>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Cog className="h-4 w-4 mr-2" />
                <span>Setup Wizard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}