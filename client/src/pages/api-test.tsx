/**
 * Quick test page to verify API connectivity
 */

import React, { useEffect, useState } from "react";
import { ensureAuthenticated, authenticatedFetch } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5003";

export default function APITestPage() {
  const [status, setStatus] = useState<string>("Initializing...");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTest = async () => {
      try {
        setStatus("Step 1: Authenticating...");
        const isAuth = await ensureAuthenticated();
        if (!isAuth) {
          setError("Authentication failed");
          setStatus("Failed to authenticate");
          return;
        }
        setStatus("✅ Step 1 Complete: Authenticated");

        setStatus("Step 2: Fetching businesses...");
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/businesses?limit=10`,
        );

        if (!response.ok) {
          setError(`HTTP Error: ${response.status}`);
          setStatus(`Failed: HTTP ${response.status}`);
          return;
        }

        const data = await response.json();
        setStatus("✅ Step 2 Complete: Data fetched");

        if (data.success) {
          setBusinesses(data.data || []);
          setStatus(`✅ SUCCESS: ${data.data?.length || 0} businesses loaded`);
        } else {
          setError(data.error?.message || "API returned success: false");
          setStatus("Failed: API error");
        }
      } catch (err) {
        setError(String(err));
        setStatus("Failed with exception");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    runTest();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔧 API Connection Test</h1>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Status</h2>
          <div className="text-lg font-mono mb-4">
            {status}
            {loading && <span className="animate-pulse">...</span>}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 p-4 rounded mb-4">
              <h3 className="font-semibold text-red-700 mb-2">❌ Error</h3>
              <p className="text-red-600 font-mono text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="bg-green-50 border-2 border-green-200 p-4 rounded mb-4">
              <h3 className="font-semibold text-green-700 mb-2">
                ✅ Connection Successful
              </h3>
              <p className="text-green-600">
                {businesses.length} businesses loaded from database
              </p>
            </div>
          )}
        </div>

        {businesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Sample Data</h2>
            <div className="space-y-4">
              {businesses.slice(0, 3).map((business) => (
                <div
                  key={business.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <h3 className="font-semibold text-lg">{business.name}</h3>
                  <p className="text-gray-600 text-sm">{business.email}</p>
                  <p className="text-gray-500 text-xs">ID: {business.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
