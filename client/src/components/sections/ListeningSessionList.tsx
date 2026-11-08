import { Ban, ExternalLink, Megaphone, Pencil } from "lucide-react";
import type { AdminSessionSummary, SessionStatus } from "@shared/listening-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isScheduleLocked } from "@/lib/listening-session-admin";
import { formatSessionWhen, formatTotalLength, sessionPath } from "@/lib/listening-session-format";
import { cn } from "@/lib/utils";

const STATUS_BADGES: Record<SessionStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "border-sky-200 bg-sky-50 text-sky-800" },
  live: { label: "Live", className: "border-transparent bg-red-600 text-white" },
  ended: { label: "Ended", className: "border-slate-200 bg-slate-100 text-slate-700" },
  cancelled: { label: "Cancelled", className: "border-slate-300 bg-white text-slate-500" },
};

interface SessionListProps {
  sessions: readonly AdminSessionSummary[];
  timeZone: string;
  /** When the list was read; the year is left out of a start time in the same year. */
  nowMs: number;
  onEdit: (session: AdminSessionSummary) => void;
  onCancel: (session: AdminSessionSummary) => void;
  onAnnounce: (session: AdminSessionSummary) => void;
}

export function ListeningSessionList({ sessions, timeZone, nowMs, onEdit, onCancel, onAnnounce }: SessionListProps) {
  return (
    <Table>
      <TableCaption className="sr-only">Listening sessions, newest start first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Starts</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Tracks</TableHead>
          <TableHead className="text-right">Length</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const badge = STATUS_BADGES[session.status];
          const open = session.status === "scheduled" || session.status === "live";
          return (
            <TableRow key={session.id}>
              <TableCell className="max-w-64 font-medium text-slate-900">{session.title}</TableCell>
              <TableCell className="text-slate-700">{session.hostName ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-slate-700">
                {formatSessionWhen(session.startsAt, "en", { timeZone, nowMs })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("whitespace-nowrap", badge.className)}>
                  {badge.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-slate-700">{session.trackCount}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-slate-700">
                {session.trackCount > 0 ? formatTotalLength(session.totalDurationSec) : "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {!isScheduleLocked(session.status) && (
                    <Button type="button" size="sm" variant="outline" aria-label={`Edit ${session.title}`} onClick={() => onEdit(session)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  )}
                  {open && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Announcement for ${session.title}`}
                      onClick={() => onAnnounce(session)}
                    >
                      <Megaphone className="h-4 w-4" /> Announcement
                    </Button>
                  )}
                  {session.status !== "cancelled" && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={sessionPath(session.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open the public page of ${session.title} in a new tab`}
                      >
                        <ExternalLink className="h-4 w-4" /> Public page
                      </a>
                    </Button>
                  )}
                  {open && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-700 hover:text-red-800"
                      aria-label={`Cancel ${session.title}`}
                      onClick={() => onCancel(session)}
                    >
                      <Ban className="h-4 w-4" /> Cancel
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
