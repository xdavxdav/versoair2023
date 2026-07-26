import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";

interface SettingsTabProps {
  dbConnected: boolean | null;
}

export default function SettingsTab({ dbConnected }: SettingsTabProps) {
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    user: "",
    pass: "",
    from: "",
    secure: false,
  });

  useEffect(() => {
    if (showSmtpConfig) {
      loadSmtpConfig();
    }
  }, [showSmtpConfig]);

  const loadSmtpConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/smtp");
      if (res.ok) {
        const data = await res.json();
        setSmtpConfig(data.config);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load SMTP config",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSmtpConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "SMTP configuration saved",
        });
        setShowSmtpConfig(false);
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save SMTP config",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save SMTP config",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSmtpConfig = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "SMTP test failed",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "SMTP test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Settings Section */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-4">
        <h2 className="text-slate-100 font-medium">Settings & Operations</h2>
        <p className="text-sm text-slate-400">
          This section links to existing admin tools to preserve current
          behavior.
        </p>
        <div className="text-sm text-slate-300">
          Database:{" "}
          <span className={dbConnected ? "text-emerald-300" : "text-red-300"}>
            {dbConnected === null
              ? "Checking..."
              : dbConnected
                ? "Connected"
                : "Disconnected"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/database"
            className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Database Center
          </Link>
          <Link
            href="/admin/verification"
            className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Verification
          </Link>
          <Link
            href="/admin/tickets"
            className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Ticket Management
          </Link>
        </div>
      </div>

      {/* SMTP Configuration Section */}
      <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-100 font-medium">Email Configuration</h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure SMTP settings for transactional emails (OTP, password
              reset, etc.)
            </p>
          </div>
          <button
            onClick={() => setShowSmtpConfig(!showSmtpConfig)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            {showSmtpConfig ? "Collapse" : "Configure"}
          </button>
        </div>

        {showSmtpConfig && (
          <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
            {loading ? (
              <div className="text-center py-4 text-slate-400">
                Loading configuration...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={(e) =>
                        setSmtpConfig({ ...smtpConfig, host: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) =>
                        setSmtpConfig({
                          ...smtpConfig,
                          port: parseInt(e.target.value),
                        })
                      }
                      placeholder="587"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      SMTP User
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.user}
                      onChange={(e) =>
                        setSmtpConfig({ ...smtpConfig, user: e.target.value })
                      }
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={smtpConfig.pass}
                      onChange={(e) =>
                        setSmtpConfig({ ...smtpConfig, pass: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-300 mb-2">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={smtpConfig.from}
                      onChange={(e) =>
                        setSmtpConfig({ ...smtpConfig, from: e.target.value })
                      }
                      placeholder="noreply@versoair.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="secure"
                      checked={smtpConfig.secure}
                      onChange={(e) =>
                        setSmtpConfig({
                          ...smtpConfig,
                          secure: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="secure" className="text-sm text-slate-300">
                      Use TLS/SSL (secure connection on port 465)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveSmtpConfig}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={testSmtpConfig}
                    disabled={testing || !smtpConfig.host || !smtpConfig.user}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    {testing ? "Testing..." : "Test Configuration"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
