import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, User, Settings, Shield, Bell } from "lucide-react";

export default function AccountHelp() {
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
            <h1 className="text-2xl font-bold text-gray-800">Account Help</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Account Management */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Account Management</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Creating Your Account</h3>
                <p className="text-blue-800 text-sm">Sign up with your email and create a secure password. Verify your email to activate your account and access all features.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Profile Setup</h3>
                <p className="text-green-800 text-sm">Complete your business profile with company details, industry type, and contact information to get personalized analytics.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Account Recovery</h3>
                <p className="text-purple-800 text-sm">Forgot your password? Use the "Reset Password" link on the login page to receive recovery instructions via email.</p>
              </div>
            </div>
          </div>

          {/* Settings & Preferences */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Settings & Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Dashboard Customization</h3>
                <p className="text-orange-800 text-sm">Personalize your dashboard by selecting which analytics cards to display and arranging them according to your priorities.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Notification Settings</h3>
                <p className="text-teal-800 text-sm">Configure email and in-app notifications for business alerts, analytics reports, and system updates.</p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Security</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Password Security</h3>
                <p className="text-red-800 text-sm">Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Two-Factor Authentication</h3>
                <p className="text-yellow-800 text-sm">Enable 2FA for extra security. We support authentication apps and SMS verification methods.</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/signin">
                <Button className="w-full justify-start" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Sign In / Register
                </Button>
              </Link>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Notification Center
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}