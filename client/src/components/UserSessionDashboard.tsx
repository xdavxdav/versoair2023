/**
 * User Session Dashboard — View and manage user's live sessions
 * Shows live, scheduled, ended and cancelled sessions with controls
 */

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Clock,
  Trash2,
  Play,
  AlertCircle,
  Loader2,
  Music,
} from "lucide-react";
import { Link } from "wouter";
import { useCancelSession, useUserSessions, type ListeningSession } from "@/hooks/use-create-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Filter = "all" | "scheduled" | "live" | "ended" | "cancelled";
const FILTERS: readonly Filter[] = ["all", "scheduled", "live", "ended", "cancelled"];

export function UserSessionDashboard() {
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: sessionsData, isLoading, error } = useUserSessions();
  const cancelSession = useCancelSession();
  const cancelMutation = {
    isPending: cancelSession.isPending,
    mutate: (sessionId: number) =>
      cancelSession.mutate(sessionId, {
        onSuccess: () =>
          toast({ title: "Session cancelled", description: "Your live session has been cancelled" }),
        onError: (err) =>
          toast({
            title: "Failed to cancel",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          }),
      }),
  };

  const sessions: ListeningSession[] = sessionsData?.sessions ?? [];
  const filteredSessions = sessions
    .filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <Badge variant="outline" className="gap-1.5 border-rose-500/45 bg-rose-500/15 text-rose-200 font-semibold">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
            </span>
            LIVE
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-200 border-amber-400/35">SCHEDULED</Badge>
        );
      case "ended":
        return <Badge variant="outline" className="bg-[#180d34]/80 text-slate-300 border-purple-500/25">ENDED</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-[#0f0822]/70 text-slate-400 border-purple-500/15">CANCELLED</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/35 rounded-2xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-200 font-semibold">Failed to Load Sessions</p>
            <p className="text-rose-200/75 text-sm">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-50 mb-1">Your Sessions</h2>
          <p className="text-slate-400 text-sm tabular-nums">
            {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/15 rounded-full border border-purple-400/30">
          <Music className="w-4 h-4 text-fuchsia-300" />
          <span className="text-purple-100 font-semibold text-sm tabular-nums">
            {sessionsData?.rateLimitStatus?.sessionsCreatedToday ?? 0}/
            {sessionsData?.rateLimitStatus?.maxPerDay ?? 0} today
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_14px_rgba(168,85,247,0.35)]"
                : "tmu-glass text-slate-300 hover:text-white hover:bg-[#180d34]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="tmu-glass rounded-2xl p-12 text-center">
          <Music className="w-12 h-12 text-purple-300/30 mx-auto mb-3" />
          <p className="text-slate-200 mb-1">
            {filter === "all"
              ? "No sessions yet. Create your first live session!"
              : `No ${filter} sessions at the moment.`}
          </p>
          <p className="text-slate-400 text-sm">
            {sessionsData?.rateLimitStatus?.nextSessionAvailableAt &&
              `Next session available: ${formatTime(
                sessionsData.rateLimitStatus.nextSessionAvailableAt
              )}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                transition={reducedMotion ? { duration: 0 } : { delay: index * 0.04 }}
                className="tmu-glass tmu-interactive-card rounded-2xl p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-slate-50 font-semibold truncate">
                        {session.title}
                      </h3>
                      {getStatusBadge(session.status)}
                    </div>

                    {session.description && (
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-slate-400 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-purple-300" />
                        {formatTime(session.startsAt)}
                      </div>
                      {session.trackCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Music className="w-4 h-4 text-purple-300" />
                          {session.trackCount} track
                          {session.trackCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {session.status === "live" && (
                      <Link href={`/sessions/${session.id}`}>
                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white">
                          <Play className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </Link>
                    )}

                    {(session.status === "scheduled" || session.status === "live") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(session.id)}
                        disabled={cancelMutation.isPending}
                        className="text-rose-300 border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancel
                          </>
                        )}
                      </Button>
                    )}

                    {session.status === "ended" && (
                      <Button
                        size="sm"
                        disabled
                        className="bg-purple-500/10 text-slate-400 border border-purple-500/15 cursor-default"
                      >
                        Completed
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Rate Limit Info */}
      {sessionsData?.rateLimitStatus && (
        <div className="tmu-glass rounded-2xl p-4 border-purple-400/25">
          <p className="text-purple-200 font-semibold text-sm mb-2">Rate Limit Status</p>
          <div className="space-y-1 text-sm text-slate-300 tabular-nums">
            <p>
              Sessions created today: {sessionsData.rateLimitStatus.sessionsCreatedToday}/
              {sessionsData.rateLimitStatus.maxPerDay}
            </p>
            {sessionsData.rateLimitStatus.nextSessionAvailableAt && (
              <p>
                Next session available:{" "}
                {formatTime(sessionsData.rateLimitStatus.nextSessionAvailableAt)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
