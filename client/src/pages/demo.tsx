import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

export default function Demo() {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const demoSlots = [
    { time: "10:00 AM", date: "Today", available: true },
    { time: "2:00 PM", date: "Today", available: true },
    { time: "10:00 AM", date: "Tomorrow", available: true },
    { time: "3:00 PM", date: "Tomorrow", available: false },
    { time: "11:00 AM", date: "Next Monday", available: true },
    { time: "4:00 PM", date: "Next Monday", available: true },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-center">
            Schedule Your Demo
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            See Verso Air in action. Our platform experts will guide you through
            all the features and answer your questions.
          </p>
        </div>
      </div>

      {/* Demo Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Info Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-8">
                What's Included
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                  <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">
                      15-Min Overview
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Platform features and capabilities walkthrough
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                  <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">Q&A Session</h3>
                    <p className="text-slate-400 text-sm">
                      Ask our experts anything about Verso Air
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                  <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">
                      Custom Use Cases
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Solutions tailored to your business
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                  <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">
                      Free Trial Access
                    </h3>
                    <p className="text-slate-400 text-sm">
                      30-day free trial for your organization
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 p-6 rounded-xl mb-6">
              <h3 className="font-semibold text-white mb-4">Demo Access</h3>
              <p className="text-slate-300 text-sm mb-4">
                Use these credentials to explore the platform immediately:
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 text-xs">Email</p>
                  <p className="text-amber-300 font-mono text-sm">
                    superuser@versoair.com
                  </p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                  <p className="text-slate-400 text-xs">Password</p>
                  <p className="text-amber-300 font-mono text-sm">
                    sudopass007
                  </p>
                </div>
              </div>
              <Link href="/auth/login">
                <Button className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white">
                  Sign In Now
                </Button>
              </Link>
            </div>

            {/* Why Choose */}
            <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-6 rounded-xl">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Why Choose Verso Air?
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>✓ Real-time Business Intelligence</li>
                <li>✓ Multi-sector Platform</li>
                <li>✓ Enterprise-grade Analytics</li>
                <li>✓ 24/7 Customer Support</li>
              </ul>
            </div>
          </div>

          {/* Booking Section */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-8 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-400" />
              Select a Time
            </h2>

            <div className="space-y-4 mb-8">
              {demoSlots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    slot.available &&
                    setSelectedSlot(`${slot.time} - ${slot.date}`)
                  }
                  disabled={!slot.available}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedSlot === `${slot.time} - ${slot.date}`
                      ? "border-emerald-500 bg-emerald-500/10"
                      : slot.available
                        ? "border-slate-600 bg-slate-800/30 hover:border-emerald-500/50"
                        : "border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {slot.time}
                      </p>
                      <p className="text-slate-400 text-sm">{slot.date}</p>
                    </div>
                    {!slot.available && (
                      <span className="text-xs text-slate-500">Booked</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {selectedSlot && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg mb-6">
                <p className="text-emerald-400 font-semibold">
                  Selected: {selectedSlot}
                </p>
              </div>
            )}

            <button
              disabled={!selectedSlot}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
              onClick={() => {
                if (selectedSlot) {
                  alert(
                    `Demo scheduled for ${selectedSlot}. Check your email for confirmation!`,
                  );
                  setSelectedSlot(null);
                }
              }}
            >
              Confirm Demo <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-slate-400 text-xs text-center mt-4">
              You'll receive a confirmation email with Zoom link and agenda
            </p>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
