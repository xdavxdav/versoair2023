import {
  Code2,
  FileText,
  GitBranch,
  Zap,
  Shield,
  BarChart3,
  Check,
  X,
  Network,
  Loader,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useState } from "react";

export default function APIDocumentation() {
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});
  const [connectionStatus, setConnectionStatus] = useState<
    "loading" | "connected" | "error"
  >("loading");

  // Test API connection on mount
  const [mounted, setMounted] = useState(false);

  const endpoints = [
    {
      method: "GET",
      endpoint: "/api/status",
      description: "Health check - Returns server status",
      fullUrl: "http://localhost:5003/api/status",
    },
    {
      method: "GET",
      endpoint: "/api/countries",
      description: "Get all countries",
      fullUrl: "http://localhost:5003/api/countries",
    },
    {
      method: "GET",
      endpoint: "/api/v1/businesses",
      description: "List all businesses with pagination",
      fullUrl: "http://localhost:5003/api/v1/businesses?page=1&limit=10",
    },
    {
      method: "GET",
      endpoint: "/api/v1/categories",
      description: "Get all business categories",
      fullUrl: "http://localhost:5003/api/v1/categories",
    },
  ];

  // Initialize connection status
  if (!mounted) {
    setMounted(true);
    testEndpoint("/api/status", "initialization").then((result) => {
      setConnectionStatus(result.success ? "connected" : "error");
    });
  }

  async function testEndpoint(endpoint: string, key: string) {
    const fullUrl = `http://localhost:5003${endpoint}`;
    setTestingEndpoint(key);
    try {
      const startTime = performance.now();
      const response = await fetch(fullUrl);
      const endTime = performance.now();
      const data = await response.json();
      const result = {
        success: response.ok,
        status: response.status,
        time: `${(endTime - startTime).toFixed(2)}ms`,
        data: data,
      };
      setTestResults((prev) => ({ ...prev, [key]: result }));
      return result;
    } catch (error) {
      const result = {
        success: false,
        status: 0,
        time: "N/A",
        error: (error as Error).message,
      };
      setTestResults((prev) => ({ ...prev, [key]: result }));
      return result;
    } finally {
      setTestingEndpoint(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Network className="h-8 w-8 text-emerald-400" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              API Documentation
            </h1>
          </div>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            Build powerful integrations with the Verso Air Business Intelligence
            Platform
          </p>

          {/* Connection Status Badge */}
          <div className="flex justify-center mt-6">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                connectionStatus === "connected"
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : connectionStatus === "error"
                    ? "bg-red-500/20 text-red-400 border border-red-500/50"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/50"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-400 animate-pulse"
                    : connectionStatus === "error"
                      ? "bg-red-400"
                      : "bg-amber-400 animate-pulse"
                }`}
              ></div>
              {connectionStatus === "connected"
                ? "API Connected"
                : connectionStatus === "error"
                  ? "API Unreachable"
                  : "Checking connection..."}
            </div>
          </div>
        </div>
      </div>

      {/* Purpose & Scope Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-700">
        <div className="grid md:grid-cols-2 gap-8">
          {/* FOR */}
          <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/20 border border-emerald-700/50 rounded-xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <Check className="h-6 w-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-emerald-100">
                What the API Is For
              </h2>
            </div>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Business Discovery</strong> -
                  Search and retrieve business data across multiple sectors
                  (commerce, hospitality, construction, etc.)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Analytics Queries</strong> -
                  Access aggregated business intelligence and performance
                  metrics
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Category Management</strong> -
                  Query business categories and industry classifications
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Reservation Systems</strong> -
                  Enable booking and reservation management for hospitality
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Geographic Services</strong> -
                  Location-based filtering and region/country data
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">Real-time Updates</strong> -
                  WebSocket connections for live notifications and data
                  synchronization
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold min-w-fit">✓</span>
                <span>
                  <strong className="text-white">
                    Third-party Integration
                  </strong>{" "}
                  - Connect external applications via REST endpoints
                </span>
              </li>
            </ul>
          </div>

          {/* NOT FOR */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 border border-red-700/50 rounded-xl p-8">
            <div className="flex items-center gap-2 mb-6">
              <X className="h-6 w-6 text-red-400" />
              <h2 className="text-2xl font-bold text-red-100">
                What the API Is NOT For
              </h2>
            </div>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Data Scraping</strong> - Bulk
                  extraction of business databases for external purposes
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">
                    Competitive Intelligence
                  </strong>{" "}
                  - Systematic data collection for competitor analysis outside
                  Verso Air ecosystem
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Spam or Harassment</strong> -
                  Automated contact campaigns or malicious communications
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Unauthorized Resale</strong> -
                  Selling or redistributing Verso Air data without licensing
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Reverse Engineering</strong> -
                  Attempting to replicate proprietary business logic or
                  algorithms
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Data Manipulation</strong> -
                  Unauthorized creation, modification, or deletion of business
                  records
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold min-w-fit">✗</span>
                <span>
                  <strong className="text-white">Excessive Load Testing</strong>{" "}
                  - DDoS attacks or unthrottled traffic exceeding rate limits
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Architecture & Network */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Code2 className="h-8 w-8 text-emerald-400" />
          Technical Architecture
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-emerald-400 mb-3">
              Backend Stack
            </h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>
                • <strong>Node.js + Express.ts</strong>
              </li>
              <li>
                • <strong>PostgreSQL</strong> database
              </li>
              <li>
                • <strong>Drizzle ORM</strong> for queries
              </li>
              <li>
                • <strong>TypeScript</strong> type safety
              </li>
              <li>
                • <strong>REST + WebSocket</strong> protocols
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3">
              Network Features
            </h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>
                • <strong>CORS</strong> enabled (localhost)
              </li>
              <li>
                • <strong>Socket.io</strong> real-time
              </li>
              <li>
                • <strong>Response Compression</strong>
              </li>
              <li>
                • <strong>Rate Limiting</strong> (memory store)
              </li>
              <li>
                • <strong>Connection Pooling</strong>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-purple-400 mb-3">
              Data Flow
            </h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>
                • <strong>Query Validation</strong> middleware
              </li>
              <li>
                • <strong>Parameterized</strong> SQL queries
              </li>
              <li>
                • <strong>Response Formatting</strong>
              </li>
              <li>
                • <strong>Error Handling</strong> layer
              </li>
              <li>
                • <strong>Logging & Audit</strong> trail
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live Endpoint Tester */}
      <div className="max-w-6xl mx-auto px-4 py-16 border-t border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Zap className="h-8 w-8 text-yellow-400" />
          Live Endpoint Tester
        </h2>
        <p className="text-slate-400 mb-8">
          Click any endpoint below to test the live API connection and response
          times
        </p>

        <div className="space-y-3">
          {endpoints.map((ep, idx) => {
            const result = testResults[ep.endpoint];
            const isLoading = testingEndpoint === ep.endpoint;

            return (
              <div
                key={idx}
                className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className={`px-3 py-1 rounded font-semibold text-xs whitespace-nowrap ${
                        ep.method === "GET"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <code className="text-emerald-400 font-mono flex-1 truncate">
                      {ep.endpoint}
                    </code>
                  </div>
                  <Button
                    onClick={() => testEndpoint(ep.endpoint, ep.endpoint)}
                    disabled={isLoading}
                    size="sm"
                    className={`whitespace-nowrap ${
                      result?.success
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : result?.success === false
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : result?.success ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {result.time}
                      </>
                    ) : result?.success === false ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Failed
                      </>
                    ) : (
                      "Test Endpoint"
                    )}
                  </Button>
                </div>

                <p className="text-slate-400 text-sm mb-3">{ep.description}</p>

                {result && (
                  <div
                    className={`text-xs p-3 rounded border ${
                      result.success
                        ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-300"
                        : "bg-red-950/30 border-red-700/50 text-red-300"
                    }`}
                  >
                    <div className="font-mono">
                      {result.success ? (
                        <>
                          <div className="mb-2">
                            ✓ Status: {result.status} | Response Time:{" "}
                            {result.time}
                          </div>
                          <div className="text-xs max-h-32 overflow-y-auto">
                            {JSON.stringify(result.data).substring(0, 200)}
                            {JSON.stringify(result.data).length > 200
                              ? "..."
                              : ""}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>✗ Error: {result.error || "Unknown error"}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Core Sections */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: <Code2 className="h-8 w-8" />,
              title: "REST API",
              description: "RESTful endpoints for all Verso Air data access",
              link: "#rest-api",
            },
            {
              icon: <Shield className="h-8 w-8" />,
              title: "Authentication",
              description: "Secure API key and session-based auth",
              link: "#auth",
            },
            {
              icon: <Network className="h-8 w-8" />,
              title: "Real-time (WebSocket)",
              description: "Live updates via Socket.io connection",
              link: "#websocket",
            },
            {
              icon: <BarChart3 className="h-8 w-8" />,
              title: "Rate Limits",
              description: "Throttling and fair usage policy",
              link: "#rate-limits",
            },
          ].map((section, idx) => (
            <a
              key={idx}
              href={section.link}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all group"
            >
              <div className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                {section.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {section.title}
              </h3>
              <p className="text-slate-400 text-sm">{section.description}</p>
            </a>
          ))}
        </div>

        {/* Quick Start */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  1
                </span>
                Get Your API Key
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                For development, use session-based authentication via login
              </p>
              <code className="bg-slate-900/50 p-3 rounded text-emerald-400 text-sm block font-mono">
                Authorization: Bearer YOUR_SESSION_TOKEN
              </code>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  2
                </span>
                Make Your First Request
              </h3>
              <code className="bg-slate-900/50 p-3 rounded text-emerald-400 text-sm block font-mono overflow-x-auto">
                curl http://localhost:5003/api/countries \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json"
              </code>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  3
                </span>
                Use in Your App
              </h3>
              <p className="text-slate-400 text-sm">
                Integrate using React Query, fetch API, Axios, or any HTTP
                client
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build?
          </h2>
          <p className="text-slate-300 mb-8">
            Explore our comprehensive business intelligence platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/commerce">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Explore Commerce
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
