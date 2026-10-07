import { AlertCircle, Clock } from "lucide-react";
import ScrollToTop from "@/components/ScrollToTop";

export default function SystemStatus() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-[95vw] mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-center">
            System Status
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            Verified service health and uptime information is not yet published.
          </p>
        </div>
      </div>

      {/* Status Dashboard */}
      <div className="max-w-[95vw] mx-auto px-4 py-16">
        {/* Overall Status */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 rounded-xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Live monitoring is not available
              </h2>
              <p className="text-slate-300">
                This page does not currently publish verified service status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <span className="text-amber-400 font-semibold">
                Monitoring setup pending
              </span>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="space-y-4 mb-16">
          <h3 className="text-xl font-bold text-white mb-4">Services</h3>

          {[
            "API Servers",
            "Database",
            "Analytics Engine",
            "Dashboard",
            "Authentication",
          ].map((service) => (
            <div
              key={service}
              className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">{service}</p>
                    <p className="text-slate-400 text-sm">
                      Status not published
                    </p>
                  </div>
                </div>
                <p className="text-slate-400 font-semibold text-sm">
                  No verified data
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Incident History */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">
            Recent Incidents
          </h3>

          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-slate-500 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-white">
                  Incident history not published
                </p>
                <p className="text-slate-400 text-sm">
                  A verified incident log is not available on this page yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="max-w-[95vw] mx-auto px-4 py-16">
        <h3 className="text-xl font-bold text-white mb-4">
          Scheduled Maintenance
        </h3>

        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-400">
            A verified maintenance schedule is not currently published.
          </p>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
