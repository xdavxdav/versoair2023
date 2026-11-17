/**
 * User Session Dashboard — View and manage user's live sessions
 * Shows live, scheduled, ended and cancelled sessions with controls
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 animate-pulse">
            LIVE
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">SCHEDULED</Badge>
        );
      case "ended":
        return <Badge className="bg-white/10 text-white/70 border-white/20">ENDED</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-300 border-red-500/30">CANCELLED</Badge>;
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
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-white/60">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold">Failed to Load Sessions</p>
            <p className="text-red-400/60 text-sm">
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Your Sessions</h2>
          <p className="text-white/60 text-sm">
            {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30">
          <Music className="w-4 h-4 text-amber-500" />
          <span className="text-amber-500 font-semibold text-sm">
            {sessionsData?.rateLimitStatus?.sessionsCreatedToday ?? 0}/
            {sessionsData?.rateLimitStatus?.maxPerDay ?? 0} today
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === f
                ? "bg-amber-500 text-verso-navy"
                : "bg-verso-navy/50 text-white/70 hover:bg-verso-navy/60"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-verso-navy/50 rounded-lg p-12 text-center">
          <Music className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 mb-1">
            {filter === "all"
              ? "No sessions yet. Create your first live session!"
              : `No ${filter} sessions at the moment.`}
          </p>
          <p className="text-white/40 text-sm">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-verso-navy/50 rounded-lg p-4 border border-verso-navy/50 hover:border-amber-500/30 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold truncate">
                        {session.title}
                      </h3>
                      {getStatusBadge(session.status)}
                    </div>

                    {session.description && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatTime(session.startsAt)}
                      </div>
                      {session.trackCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Music className="w-4 h-4" />
                          {session.trackCount} track
                          {session.trackCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {session.status === "live" && (
                      <Link href={`/sessions/${session.id}`}>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
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
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
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
                        className="bg-white/10 text-white/60 cursor-default"
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-500 font-semibold text-sm mb-2">Rate Limit Status</p>
          <div className="space-y-1 text-sm text-amber-500/80">
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
