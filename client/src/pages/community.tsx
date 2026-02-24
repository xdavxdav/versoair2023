import { MapPin, Users, TrendingUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useState } from "react";

export default function CommunityDetail() {
  const [selectedTab, setSelectedTab] = useState("overview");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative pt-20 pb-16 px-4 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Community Hub
              </h1>
              <p className="text-slate-300 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Global Community
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-slate-600">
                ← Back
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active Members", value: "15,234" },
              { label: "Resources", value: "8,492" },
              { label: "Events", value: "142" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              >
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-4 border-b border-slate-700 mb-8">
          {["overview", "members", "discussions", "events"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 font-semibold capitalize transition-all ${
                selectedTab === tab
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {selectedTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  About This Community
                </h2>
                <p className="text-slate-300">
                  Join thousands of Verso Air users sharing insights, best
                  practices, and success stories. This is a space to
                  collaborate, learn, and grow together.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Users className="h-6 w-6" />,
                    title: "Network",
                    desc: "Connect with professionals in your industry",
                  },
                  {
                    icon: <TrendingUp className="h-6 w-6" />,
                    title: "Learn",
                    desc: "Share knowledge and best practices",
                  },
                  {
                    icon: <MessageSquare className="h-6 w-6" />,
                    title: "Discuss",
                    desc: "Engage in meaningful conversations",
                  },
                  {
                    icon: <MapPin className="h-6 w-6" />,
                    title: "Participate",
                    desc: "Join local chapters and events",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/30 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="text-emerald-400 mb-3">{item.icon}</div>
                    <h3 className="font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === "members" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-3"></div>
                  <p className="font-semibold text-white">Community Member</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Member since 2024
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedTab === "discussions" && (
            <div className="space-y-4">
              {[
                "Best practices for data analysis",
                "How to optimize dashboards",
                "Industry insights Q1 2024",
              ].map((topic, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{topic}</h3>
                    <span className="text-emerald-400 text-sm">12 replies</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    Last updated 2 days ago
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedTab === "events" && (
            <div className="space-y-4">
              {[
                "Monthly Webinar - Data Insights 101",
                "Community Meetup - New York",
                "Annual Summit 2024",
              ].map((event, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
                >
                  <h3 className="font-semibold text-white">{event}</h3>
                  <p className="text-slate-400 text-sm mt-2">Next month</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-emerald-400"
                  >
                    Learn More →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
