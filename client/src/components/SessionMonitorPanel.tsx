import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Shield,
  ShieldOff,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface ActiveSession {
  id: number;
  user_id: number;
  device: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  is_revoked: boolean;
  revoked_reason: string | null;
  last_active: string | null;
  expires_at: string;
  created_at: string;
  email?: string;
  username?: string;
  role?: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDeviceIcon(device: string | null) {
  if (!device) return <Monitor className="h-4 w-4" />;
  const lower = device.toLowerCase();
  if (
    lower.includes("iphone") ||
    lower.includes("android") ||
    lower.includes("mobile")
  )
    return <Smartphone className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export function SessionMonitorPanel() {
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const res = await fetch("/auth/admin/sessions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const sessions: ActiveSession[] = data?.sessions || [];

  const handleRevoke = async (sessionId: number) => {
    setRevoking(sessionId);
    try {
      const res = await fetch(`/auth/logout/${sessionId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      }
    } catch (e) {
      console.error("Failed to revoke session:", e);
    } finally {
      setRevoking(null);
    }
  };

  // Group sessions by user
  const byUser = sessions.reduce<Record<string, ActiveSession[]>>((acc, s) => {
    const key = s.email || `user_${s.user_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const uniqueUsers = Object.keys(byUser).length;
  const totalSessions = sessions.length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {totalSessions}
              </p>
              <p className="text-xs text-slate-400">Active Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{uniqueUsers}</p>
              <p className="text-xs text-slate-400">Unique Users Online</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {Object.values(byUser).filter((s) => s.length > 1).length}
              </p>
              <p className="text-xs text-slate-400">Multi-Session Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session list */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Shield className="h-5 w-5" />
              Active Sessions Monitor
            </CardTitle>
            <CardDescription className="text-slate-400">
              Real-time view of all authenticated sessions. Revoke suspicious
              sessions instantly.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading sessions...
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load sessions. Make sure the table exists.</p>
              <p className="text-xs mt-1 text-slate-500">
                Run{" "}
                <code className="bg-white/5 px-1 rounded">
                  node _push_session_tables.cjs
                </code>{" "}
                if needed.
              </p>
            </div>
          )}

          {!isLoading && !error && sessions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active sessions found.</p>
              <p className="text-xs mt-1">
                Sessions will appear here after users log in.
              </p>
            </div>
          )}

          {!isLoading && sessions.length > 0 && (
            <div className="space-y-3">
              {Object.entries(byUser).map(([userKey, userSessions]) => (
                <div
                  key={userKey}
                  className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
                >
                  {/* User header */}
                  <div className="px-4 py-2.5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {userSessions[0].username || userKey}
                      </span>
                      {userSessions[0].role && (
                        <Badge
                          variant="outline"
                          className={
                            userSessions[0].role === "superuser" ||
                            userSessions[0].role === "admin"
                              ? "border-purple-500/50 text-purple-300 text-[10px]"
                              : "border-slate-500/50 text-slate-400 text-[10px]"
                          }
                        >
                          {userSessions[0].role}
                        </Badge>
                      )}
                      {userSessions.length > 1 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {userSessions.length} sessions
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{userKey}</span>
                  </div>

                  {/* Session rows */}
                  {userSessions.map((session) => (
                    <div
                      key={session.id}
                      className="px-4 py-3 flex items-center justify-between border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-slate-400">
                          {getDeviceIcon(session.device)}
                        </div>
                        <div>
                          <p className="text-sm text-slate-200">
                            {session.device || "Unknown device"}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ip || "—"}
                              {session.country && ` · ${session.country}`}
                              {session.city && ` · ${session.city}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(session.last_active)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600">
                          ID: {session.id}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(session.id)}
                          disabled={revoking === session.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                        >
                          {revoking === session.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <ShieldOff className="h-3.5 w-3.5 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
