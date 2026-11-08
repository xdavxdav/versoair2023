import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Headphones, Loader2, Plus, RefreshCw } from "lucide-react";
import type { AdminSessionDetail, AdminSessionSummary } from "@shared/listening-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_TIME_ZONES, DEFAULT_ADMIN_TIME_ZONE, isScheduleLocked } from "@/lib/listening-session-admin";
import {
  adminApi,
  adminErrorMessage,
  adminKeys,
  clockSkewNotice,
  type AdminReadiness,
} from "@/lib/listening-session-admin-api";
import type { AnnouncementSession } from "@/lib/listening-session-admin-share";
import { AnnouncementDialog } from "./ListeningSessionAnnouncementPanel";
import { ListeningSessionForm } from "./ListeningSessionForm";
import { ListeningSessionList } from "./ListeningSessionList";

const LIST_REFRESH_MS = 30_000;
const NO_SESSIONS: readonly AdminSessionSummary[] = [];

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: number };

function notReadyNotice(readiness: Exclude<AdminReadiness, { state: "ready" }>): { title: string; body: string } {
  switch (readiness.state) {
    case "off":
      return {
        title: "Listening sessions are switched off",
        body: "The feature switch is off on this server, so sessions cannot be created or shown.",
      };
    case "not_ready":
      return {
        title: "Sessions are not ready yet",
        body: "The session tables are still being prepared. Wait a moment, then retry.",
      };
    case "access":
      return { title: "No access to listening sessions", body: readiness.message };
    case "error":
      return { title: "Could not check the sessions service", body: readiness.message };
  }
}

function ReadinessBadge({ readiness }: { readiness: AdminReadiness | null }) {
  if (readiness === null) {
    return (
      <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-slate-600" role="status">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Checking…
      </Badge>
    );
  }
  if (readiness.state === "ready") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-800" role="status">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Sessions ready
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800" role="status">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Sessions not ready
    </Badge>
  );
}

interface EditSessionProps {
  id: number;
  timeZone: string;
  sessions: readonly AdminSessionSummary[];
  clockNotice: string | null;
  onSaved: (session: AdminSessionDetail, outcome: "created" | "updated") => void;
  onBack: () => void;
}

function EditSession({ id, onBack, ...formProps }: EditSessionProps) {
  // The form copies the session once when it opens, so an older cached copy must never be reused.
  const detail = useQuery({
    queryKey: adminKeys.detail(id),
    queryFn: ({ signal }) => adminApi.getSession(id, signal),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (detail.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="space-y-3">
          <p>{adminErrorMessage(detail.error, "Could not load this session.")}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void detail.refetch()}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onBack}>
              Back to sessions
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (isScheduleLocked(detail.data.status)) {
    return (
      <Alert>
        <AlertDescription className="space-y-3">
          <p>"{detail.data.title}" has already started, ended or been cancelled, so it can no longer be edited.</p>
          <Button type="button" size="sm" variant="outline" onClick={onBack}>
            Back to sessions
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return <ListeningSessionForm key={detail.data.id} original={detail.data} onBack={onBack} {...formProps} />;
}

export function ListeningSessionsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<View>({ kind: "list" });
  const [timeZone, setTimeZone] = useState(DEFAULT_ADMIN_TIME_ZONE);
  const [announcing, setAnnouncing] = useState<AnnouncementSession | null>(null);
  const [cancelling, setCancelling] = useState<AdminSessionSummary | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Checked once and on Retry only: a failed re-check on tab focus must not replace a form being filled in.
  const readinessQuery = useQuery({
    queryKey: adminKeys.status,
    queryFn: ({ signal }) => adminApi.fetchReadiness(signal),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const readiness: AdminReadiness | null = readinessQuery.isError
    ? {
        state: "error",
        message: adminErrorMessage(readinessQuery.error, "Could not check whether listening sessions are ready."),
      }
    : (readinessQuery.data ?? null);
  const ready = readiness?.state === "ready";

  const list = useQuery({
    queryKey: adminKeys.list,
    queryFn: ({ signal }) => adminApi.listSessions(signal),
    enabled: ready,
    refetchInterval: LIST_REFRESH_MS,
    staleTime: 0,
  });
  const sessions = list.data?.sessions ?? NO_SESSIONS;
  const clockNotice = list.data ? clockSkewNotice(list.data.serverTime, list.dataUpdatedAt) : null;

  const cancel = useMutation({
    mutationFn: (session: AdminSessionSummary) => adminApi.cancelSession(session.id),
    onSuccess: (result, session) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.list });
      setCancelling(null);
      toast({
        title: result.alreadyCancelled ? "Already cancelled" : "Session cancelled",
        description: `"${session.title}" is cancelled.`,
      });
    },
    onError: (error) => setCancelError(adminErrorMessage(error, "Could not cancel the session.")),
  });

  function askToCancel(session: AdminSessionSummary) {
    setCancelError(null);
    setCancelling(session);
  }

  function handleSaved(session: AdminSessionDetail, outcome: "created" | "updated") {
    setView({ kind: "list" });
    if (outcome === "created") {
      toast({ title: "Session created", description: "Here is its announcement draft. Nothing has been sent." });
      setAnnouncing(session);
    } else {
      toast({ title: "Changes saved", description: `"${session.title}" was updated.` });
    }
  }

  const backToList = () => setView({ kind: "list" });

  return (
    <>
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Headphones className="h-5 w-5 text-sky-600" /> Listening Sessions
            </CardTitle>
            <CardDescription>
              Schedule a live listening session, build its set, then copy the announcement draft. Nothing is ever sent
              automatically.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReadinessBadge readiness={readiness} />
            {ready && view.kind === "list" && (
              <>
                <select
                  value={timeZone}
                  onChange={(event) => setTimeZone(event.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  aria-label="Show session times in"
                >
                  {ADMIN_TIME_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Refresh sessions"
                  onClick={() => void list.refetch()}
                >
                  <RefreshCw className={`h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} />
                </Button>
                <Button type="button" size="sm" className="h-9" onClick={() => setView({ kind: "create" })}>
                  <Plus className="h-4 w-4" /> New session
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {readiness === null ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : readiness.state !== "ready" ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertTitle>{notReadyNotice(readiness).title}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{notReadyNotice(readiness).body}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={readinessQuery.isFetching}
                  onClick={() => void readinessQuery.refetch()}
                >
                  {readinessQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : view.kind === "create" ? (
            <ListeningSessionForm
              original={null}
              timeZone={timeZone}
              sessions={sessions}
              clockNotice={clockNotice}
              onSaved={handleSaved}
              onBack={backToList}
            />
          ) : view.kind === "edit" ? (
            <EditSession
              id={view.id}
              timeZone={timeZone}
              sessions={sessions}
              clockNotice={clockNotice}
              onSaved={handleSaved}
              onBack={backToList}
            />
          ) : (
            <div className="space-y-4">
              {list.isError && (
                <Alert variant="destructive">
                  <AlertDescription className="space-y-3">
                    <p>{adminErrorMessage(list.error, "Could not load the sessions.")}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>
                      <RefreshCw className="h-4 w-4" /> Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {list.data ? (
                sessions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No listening session yet. Use "New session" to schedule the first one.
                  </p>
                ) : (
                  <ListeningSessionList
                    sessions={sessions}
                    timeZone={timeZone}
                    nowMs={list.dataUpdatedAt}
                    onEdit={(session) => setView({ kind: "edit", id: session.id })}
                    onCancel={askToCancel}
                    onAnnounce={setAnnouncing}
                  />
                )
              ) : (
                list.isPending && (
                  <div className="space-y-3" aria-busy="true">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )
              )}
              <p className="text-xs text-slate-500">
                The list refreshes by itself every {LIST_REFRESH_MS / 1000} seconds. A session can be cancelled, never deleted.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open && !cancel.isPending) setCancelling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling &&
                `"${cancelling.title}" will be marked as cancelled and leave the public list. This cannot be undone. Nothing is sent to anyone.`}
              {cancelling?.status === "live" && " It is live right now, so cancelling stops it for everyone listening."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && (
            <p className="text-sm text-red-700" role="alert">
              {cancelError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>Keep session</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={cancel.isPending}
              // Keeps the dialog open until the server has answered, so an error can be shown in it.
              onClick={(event) => {
                event.preventDefault();
                if (cancelling) cancel.mutate(cancelling);
              }}
            >
              {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Cancel session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnnouncementDialog session={announcing} onClose={() => setAnnouncing(null)} />
    </>
  );
}
