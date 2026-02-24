import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Truck, Clock, MapPin, Package2 } from "lucide-react";

export default function DeliveryHelp() {
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
            <h1 className="text-2xl font-bold text-gray-800">Delivery & Logistics Help</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Delivery Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Delivery Options</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Same-Day Delivery</h3>
                <p className="text-green-800 text-sm">Available in major cities for orders placed before 2 PM. Perfect for urgent business needs and critical analytics reports.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Express Delivery (1-2 Days)</h3>
                <p className="text-blue-800 text-sm">Fast delivery for hardware installations, printed reports, and business documents. Tracking included.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Standard Delivery (3-5 Days)</h3>
                <p className="text-purple-800 text-sm">Cost-effective option for non-urgent deliveries. Free for orders over $100 in most regions.</p>
              </div>
            </div>
          </div>

          {/* Tracking & Updates */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Tracking & Updates</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Real-Time Tracking</h3>
                <p className="text-orange-800 text-sm">Track your deliveries in real-time with GPS updates. Receive SMS and email notifications at each milestone.</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h3 className="font-medium text-teal-900 mb-2">Delivery Notifications</h3>
                <p className="text-teal-800 text-sm">Get notified when your package is out for delivery and when it's been delivered. Photos of delivery location included.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900 mb-2">Delivery Windows</h3>
                <p className="text-indigo-800 text-sm">Choose convenient delivery time slots that work with your business schedule. Reschedule if needed.</p>
              </div>
            </div>
          </div>

          {/* Business Delivery Services */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Business Services</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Hardware Installation</h3>
                <p className="text-gray-800 text-sm">Professional installation of IoT sensors, analytics hardware, and business intelligence equipment at your location.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Bulk Data Delivery</h3>
                <p className="text-yellow-800 text-sm">Secure delivery of large datasets, backup drives, and confidential business documents with chain of custody tracking.</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">White-Glove Service</h3>
                <p className="text-red-800 text-sm">Premium service including unpacking, setup, configuration, and training for complex business intelligence solutions.</p>
              </div>
            </div>
          </div>

          {/* Delivery Issues */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold">Delivery Issues</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">Delayed Deliveries</h3>
                <p className="text-red-800 text-sm">Weather, traffic, or logistics issues may cause delays. We'll notify you immediately and provide updated delivery estimates.</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Failed Delivery Attempts</h3>
                <p className="text-yellow-800 text-sm">If no one's available to receive the package, we'll leave a notice and attempt redelivery the next business day.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Package Damage</h3>
                <p className="text-blue-800 text-sm">Report any damage within 24 hours of delivery. We'll arrange replacement or repair at no additional cost.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}