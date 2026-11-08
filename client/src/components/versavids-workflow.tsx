/**
 * "My projects" for VersaVids, below the request form: the part of the workflow
 * after a project is posted. An artist takes an open project and delivers a link
 * to the finished work; the client approves it or asks for changes. No money
 * moves on the site. The server enforces every rule: this only offers what the
 * viewer may do (see lib/versavids-workflow).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { apiErrorMessage } from "@shared/api-error";
import { authenticatedFetch } from "@/lib/auth";
import {
  checkChangeRequest,
  checkDelivery,
  deliverableStatusLabel,
  formatBudget,
  formatDeadline,
  formatLabel,
  latestDeliverable,
  linkHost,
  nextVersion,
  parseProjectDetail,
  parseProjects,
  projectActions,
  projectHint,
  projectRole,
  splitArtistBoard,
  statusLabel,
  type ProjectAction,
  type ProjectRole,
  type VersaVidsDeliverable,
  type VersaVidsProject,
} from "@/lib/versavids-workflow";

type Tab = "client" | "videaste";
type Notice = { kind: "error" | "success"; text: string };
type Notify = (notice: Notice) => void;

// Dark studio look, with readable text: 16px fields, 44px buttons, no faint greys.
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0512]";
const BTN = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const BTN_PRIMARY = `${BTN} bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500`;
const BTN_QUIET = `${BTN} border border-white/25 bg-white/[0.06] text-white hover:bg-white/10`;
const BTN_DANGER = `${BTN} border border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20`;
const FIELD = `w-full rounded-xl border border-white/25 bg-white/[0.06] px-3 py-3 text-base text-white placeholder:text-white/50 ${FOCUS}`;
const CARD = "rounded-2xl border border-white/[0.08] bg-white/[0.04]";
const LABEL = "mb-1 block text-sm font-medium text-white";
const HELP = "mt-1 text-sm text-white/70";

const PILL_TONES: Record<string, string> = {
  open: "border-sky-400/40 bg-sky-500/15 text-sky-100",
  claimed: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  in_progress: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  review: "border-violet-400/40 bg-violet-500/15 text-violet-100",
  submitted: "border-violet-400/40 bg-violet-500/15 text-violet-100",
  revision: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  revision_requested: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  completed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  approved: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  cancelled: "border-white/25 bg-white/10 text-white/80",
};

// Names, titles and links typed by users must not be translated or split by
// the page translator.
const USER_TEXT = { translate: "no", className: "notranslate" } as const;

async function api(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const hasBody = init.body !== undefined;
  let res: Response;
  try {
    res = await authenticatedFetch(`/api/versavids${path}`, {
      method: init.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new Error(
      "Could not reach VersaVids. Check your connection and try again.",
    );
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(data));
  return data;
}

// Every action changes projects and their details, so all of them reload.
function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["versavids"] });
}

function Pill({ status, label }: { status: string; label: string }) {
  const tone = PILL_TONES[status] ?? PILL_TONES.cancelled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function NoticeBar({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The card that caused this may be gone after the refresh: bring the answer
  // into view instead of leaving it above the fold.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [notice]);
  const isError = notice.kind === "error";
  return (
    <div
      ref={ref}
      role={isError ? "alert" : "status"}
      className={`mb-4 flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${
        isError
          ? "border-red-400/50 bg-red-500/10 text-red-100"
          : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      }`}
    >
      {isError ? (
        <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
      ) : (
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
      )}
      <p className="min-w-0 flex-1 text-base">{notice.text}</p>
      <button type="button" className={BTN_QUIET} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

// Two steps for actions that cannot be taken back; focus follows the buttons so
// a keyboard user is never left on a button that disappeared.
function ConfirmButton({
  label,
  context,
  question,
  confirmLabel,
  keepLabel,
  tone,
  busy,
  onConfirm,
}: {
  label: string;
  /** What the button acts on, so repeated buttons are told apart by name. */
  context?: string;
  question: string;
  confirmLabel: string;
  keepLabel: string;
  tone: "danger" | "primary";
  busy: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"ask" | "confirm" | null>(null);

  useEffect(() => {
    if (focusNext.current === "confirm") confirmRef.current?.focus();
    if (focusNext.current === "ask") askRef.current?.focus();
    focusNext.current = null;
  }, [asking]);

  if (!asking) {
    return (
      <button
        ref={askRef}
        type="button"
        className={tone === "danger" ? BTN_DANGER : BTN_PRIMARY}
        disabled={busy}
        aria-label={context ? `${label}: ${context}` : undefined}
        onClick={() => {
          focusNext.current = "confirm";
          setAsking(true);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-label={question}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-base text-white">{question}</span>
      <button
        ref={confirmRef}
        type="button"
        className={tone === "danger" ? BTN_DANGER : BTN_PRIMARY}
        disabled={busy}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        className={BTN_QUIET}
        onClick={() => {
          focusNext.current = "ask";
          setAsking(false);
        }}
      >
        {keepLabel}
      </button>
    </div>
  );
}

function WatchLink({ url }: { url: string | null }) {
  if (!url) {
    return (
      <p className="mt-2 text-sm text-white/70">
        This delivery link cannot be shown.
      </p>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 inline-flex min-h-[44px] items-center gap-2 rounded text-base font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100 ${FOCUS}`}
    >
      Watch on <span {...USER_TEXT}>{linkHost(url)}</span>
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function DeliverForm({
  project,
  deliverables,
  notify,
}: {
  project: VersaVidsProject;
  deliverables: VersaVidsDeliverable[];
  notify: Notify;
}) {
  const id = useId();
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const version = nextVersion(deliverables);

  const deliver = useMutation({
    mutationFn: (delivery: {
      title: string;
      url: string;
      notes: string | null;
    }) =>
      api("/deliverables", {
        method: "POST",
        body: {
          project_id: project.id,
          title: delivery.title,
          file_url: delivery.url,
          description: delivery.notes,
          version,
        },
      }),
    onSuccess: () =>
      notify({
        kind: "success",
        text: "Delivery sent. The client can now watch it and approve it or ask for changes.",
      }),
    onError: (err: Error) => notify({ kind: "error", text: err.message }),
    onSettled: refresh,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const check = checkDelivery({ title, url, notes });
    if (!check.ok) {
      setProblem(check.error);
      return;
    }
    setProblem(null);
    deliver.mutate(check);
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-heading`}
      className={`${CARD} space-y-3 p-4`}
    >
      <h4 id={`${id}-heading`} className="text-base font-semibold text-white">
        Deliver your work (version {version})
      </h4>
      <div>
        <label htmlFor={`${id}-title`} className={LABEL}>
          Title
        </label>
        <input
          id={`${id}-title`}
          className={FIELD}
          value={title}
          maxLength={200}
          autoComplete="off"
          placeholder="Final cut"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`${id}-url`} className={LABEL}>
          Link to the video
        </label>
        <input
          id={`${id}-url`}
          className={FIELD}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={url}
          placeholder="https://vimeo.com/…"
          aria-describedby={`${id}-url-help`}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p id={`${id}-url-help`} className={HELP}>
          Upload the video to Vimeo, YouTube, Google Drive or Dropbox, then
          paste its share link. Check that the client can open it.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className={LABEL}>
          Notes for the client (optional)
        </label>
        <textarea
          id={`${id}-notes`}
          className={`${FIELD} min-h-[96px]`}
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {problem && (
        <p role="alert" className="text-base font-medium text-red-200">
          {problem}
        </p>
      )}
      <button
        type="submit"
        className={BTN_PRIMARY}
        disabled={deliver.isPending}
      >
        {deliver.isPending && (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        )}
        Send delivery
      </button>
    </form>
  );
}

function ReviewPanel({
  deliverable,
  notify,
}: {
  deliverable: VersaVidsDeliverable;
  notify: Notify;
}) {
  const id = useId();
  const refresh = useRefresh();
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: (decision: {
      status: "approved" | "revision_requested";
      feedback: string | null;
    }) =>
      api(`/deliverables/${deliverable.id}`, {
        method: "PATCH",
        body: { status: decision.status, client_feedback: decision.feedback },
      }),
    onSuccess: (_data, decision) =>
      notify({
        kind: "success",
        text:
          decision.status === "approved"
            ? "Delivery approved. This project is complete."
            : "Changes requested. The artist can now deliver a new version.",
      }),
    onError: (err: Error) => notify({ kind: "error", text: err.message }),
    onSettled: refresh,
  });

  const requestChanges = (event: FormEvent) => {
    event.preventDefault();
    const check = checkChangeRequest(note);
    if (!check.ok) {
      setProblem(check.error);
      return;
    }
    setProblem(null);
    decide.mutate({ status: "revision_requested", feedback: check.note });
  };

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
      <h4 className="text-base font-semibold text-white">
        Delivery ready to review
      </h4>
      <p className="mt-1 text-base text-white">
        Version {deliverable.version} ·{" "}
        <span {...USER_TEXT}>{deliverable.title}</span>
      </p>
      {deliverable.description && (
        <p
          {...USER_TEXT}
          className="notranslate mt-1 whitespace-pre-line break-words text-sm text-white/80"
        >
          {deliverable.description}
        </p>
      )}
      <WatchLink url={deliverable.fileUrl} />
      {changing ? (
        <form noValidate onSubmit={requestChanges} className="mt-3 space-y-2">
          <label htmlFor={`${id}-note`} className={LABEL}>
            What should change?
          </label>
          <textarea
            id={`${id}-note`}
            className={`${FIELD} min-h-[96px]`}
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {problem && (
            <p role="alert" className="text-base font-medium text-red-200">
              {problem}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={BTN_PRIMARY}
              disabled={decide.isPending}
            >
              {decide.isPending && (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              )}
              Send request
            </button>
            <button
              type="button"
              className={BTN_QUIET}
              onClick={() => {
                setChanging(false);
                setProblem(null);
              }}
            >
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ConfirmButton
            tone="primary"
            label="Approve delivery"
            question="Approve this delivery? The project will be marked complete."
            confirmLabel="Yes, approve"
            keepLabel="Not yet"
            busy={decide.isPending}
            onConfirm={() =>
              decide.mutate({ status: "approved", feedback: null })
            }
          />
          <button
            type="button"
            className={BTN_QUIET}
            disabled={decide.isPending}
            onClick={() => setChanging(true)}
          >
            Ask for changes
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectDetails({
  id,
  project,
  role,
  actions,
  notify,
}: {
  id: string;
  project: VersaVidsProject;
  role: ProjectRole;
  actions: ProjectAction[];
  notify: Notify;
}) {
  const query = useQuery({
    queryKey: ["versavids", "project", project.id],
    queryFn: async () => {
      const detail = parseProjectDetail(await api(`/projects/${project.id}`));
      if (!detail) throw new Error("This project could not be loaded.");
      return detail;
    },
  });

  if (query.isPending) {
    return (
      <p
        id={id}
        role="status"
        className="mt-4 flex items-center gap-2 text-base text-white/80"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading details…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div
        id={id}
        role="alert"
        className="mt-4 space-y-2 text-base text-red-100"
      >
        <p>{query.error.message}</p>
        <button
          type="button"
          className={BTN_QUIET}
          onClick={() => void query.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  const { project: detail, brief, deliverables } = query.data;
  const latest = latestDeliverable(deliverables);
  const description = detail.description ?? project.description;

  const facts: [string, string][] = [];
  if (detail.projectType)
    facts.push(["Type", detail.projectType.replace(/[_-]+/g, " ")]);
  const style = brief?.visualStyle ?? detail.genre;
  if (style) facts.push(["Style", style]);
  if (brief?.aspectRatio) facts.push(["Aspect ratio", brief.aspectRatio]);
  if (brief?.resolution) facts.push(["Resolution", brief.resolution]);
  if (brief && brief.formats.length > 0)
    facts.push(["Formats", brief.formats.map(formatLabel).join(", ")]);
  if (detail.priority !== "normal") facts.push(["Priority", detail.priority]);

  return (
    <div id={id} className="mt-4 space-y-4 border-t border-white/10 pt-4">
      {actions.includes("review") && latest && (
        <ReviewPanel deliverable={latest} notify={notify} />
      )}
      {actions.includes("deliver") && (
        <DeliverForm
          project={project}
          deliverables={deliverables}
          notify={notify}
        />
      )}
      {description && (
        <p
          {...USER_TEXT}
          className="notranslate whitespace-pre-line break-words text-base text-white"
        >
          {description}
        </p>
      )}
      {facts.length > 0 && (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {facts.map(([name, value]) => (
            <div key={name}>
              <dt className="text-sm text-white/70">{name}</dt>
              <dd
                {...USER_TEXT}
                className="notranslate break-words text-base capitalize text-white"
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {role === "videaste" && detail.clientEmail && (
        <p className="flex flex-wrap items-center gap-2 text-base text-white">
          <Mail aria-hidden="true" className="h-4 w-4 text-amber-200" />
          <span>Contact the client to agree on the price and payment:</span>
          <a
            {...USER_TEXT}
            href={`mailto:${detail.clientEmail}`}
            className={`notranslate break-all rounded font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100 ${FOCUS}`}
          >
            {detail.clientEmail}
          </a>
        </p>
      )}
      {deliverables.length > 0 && (
        <div>
          <h4 className="mb-2 text-base font-semibold text-white">
            Deliveries
          </h4>
          <ul className="space-y-2">
            {deliverables.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-base font-medium text-white">
                    Version {d.version} · <span {...USER_TEXT}>{d.title}</span>
                  </p>
                  <Pill
                    status={d.status}
                    label={deliverableStatusLabel(d.status)}
                  />
                </div>
                {d.description && (
                  <p
                    {...USER_TEXT}
                    className="notranslate mt-1 whitespace-pre-line break-words text-sm text-white/80"
                  >
                    {d.description}
                  </p>
                )}
                <WatchLink url={d.fileUrl} />
                {d.clientFeedback && (
                  <p className="mt-2 text-base text-white">
                    <span className="font-medium">Client feedback: </span>
                    <span {...USER_TEXT} className="notranslate break-words">
                      {d.clientFeedback}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  viewerId,
  isArtist,
  notify,
}: {
  project: VersaVidsProject;
  viewerId: number | null;
  isArtist: boolean;
  notify: Notify;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const refresh = useRefresh();
  const role = projectRole(project, viewerId);
  const actions = projectActions(project, { id: viewerId, isArtist });
  const budget = formatBudget(project.budget, project.currency);
  const deadline = formatDeadline(project.deadline);

  const claim = useMutation({
    mutationFn: () =>
      api(`/projects/${project.id}`, {
        method: "PATCH",
        body: { claimed_by: true },
      }),
    onSuccess: () =>
      notify({
        kind: "success",
        text: "You took this project. Find it under “Taken by you” to deliver your work when it is ready.",
      }),
    onError: (err: Error) => notify({ kind: "error", text: err.message }),
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: () =>
      api(`/projects/${project.id}`, {
        method: "PATCH",
        body: { status: "cancelled" },
      }),
    onSuccess: () => notify({ kind: "success", text: "Project cancelled." }),
    onError: (err: Error) => notify({ kind: "error", text: err.message }),
    onSettled: refresh,
  });

  const needsAnswer = actions.includes("review") || actions.includes("deliver");
  const toggleLabel = actions.includes("review")
    ? "Review delivery"
    : actions.includes("deliver")
      ? "Deliver work"
      : "Details";

  return (
    <article className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4
          {...USER_TEXT}
          className="notranslate min-w-0 break-words text-lg font-semibold text-white"
        >
          {project.title}
        </h4>
        <Pill status={project.status} label={statusLabel(project.status)} />
      </div>
      <p className="mt-1 text-base text-white/80">
        {projectHint(project, role)}
      </p>
      {(budget || deadline) && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base text-white">
          {budget && (
            <li>
              Budget: <span {...USER_TEXT}>{budget}</span>
            </li>
          )}
          {deadline && (
            <li>
              Deadline: <span {...USER_TEXT}>{deadline}</span>
            </li>
          )}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {actions.includes("claim") && (
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={claim.isPending}
            aria-label={`Take this project: ${project.title}`}
            onClick={() => claim.mutate()}
          >
            {claim.isPending && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            Take this project
          </button>
        )}
        <button
          type="button"
          className={needsAnswer ? BTN_PRIMARY : BTN_QUIET}
          aria-label={`${toggleLabel}: ${project.title}`}
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          onClick={() => setExpanded((open) => !open)}
        >
          {toggleLabel}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {actions.includes("cancel") && (
          <ConfirmButton
            tone="danger"
            label="Cancel project"
            context={project.title}
            question="Cancel this project?"
            confirmLabel="Yes, cancel it"
            keepLabel="Keep project"
            busy={cancel.isPending}
            onConfirm={() => cancel.mutate()}
          />
        )}
      </div>
      {expanded && (
        <ProjectDetails
          id={panelId}
          project={project}
          role={role}
          actions={actions}
          notify={notify}
        />
      )}
    </article>
  );
}

function ProjectList({
  heading,
  projects,
  empty,
  viewerId,
  isArtist,
  notify,
}: {
  heading: string;
  projects: VersaVidsProject[];
  empty: string;
  viewerId: number | null;
  isArtist: boolean;
  notify: Notify;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-base font-semibold text-white">{heading}</h3>
      {projects.length === 0 ? (
        <p className="text-base text-white/80">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                viewerId={viewerId}
                isArtist={isArtist}
                notify={notify}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VersaVidsWorkflow({
  viewerId,
  isArtist,
}: {
  viewerId: number | null;
  isArtist: boolean;
}) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const [tab, setTab] = useState<Tab>("client");
  const [notice, setNotice] = useState<Notice | null>(null);
  // Only artists have the videaste view, whatever was chosen before.
  const view: Tab = isArtist && tab === "videaste" ? "videaste" : "client";

  const projectsQuery = useQuery({
    queryKey: ["versavids", "projects", view, viewerId],
    queryFn: async () => parseProjects(await api(`/projects?role=${view}`)),
  });
  const projects = projectsQuery.data ?? [];
  const board = splitArtistBoard(projects, viewerId);

  const listProps = { viewerId, isArtist, notify: setNotice };

  return (
    <section
      id="versavids-projects"
      aria-labelledby={headingId}
      className="mb-10 scroll-mt-24"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-bold text-white">
          My VersaVids projects
        </h2>
        <button
          type="button"
          className={BTN_QUIET}
          onClick={() =>
            void queryClient.invalidateQueries({ queryKey: ["versavids"] })
          }
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${projectsQuery.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
      <p className="mb-4 text-base text-white/80">
        VersaVids does not handle payments. Agree on the price and how to pay
        directly with the other person.
      </p>
      {isArtist && (
        <div
          role="group"
          aria-label="Show projects as"
          className="mb-4 flex flex-wrap gap-2"
        >
          {(["client", "videaste"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              className={`${BTN} border ${
                view === option
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-100"
                  : "border-white/25 bg-white/[0.04] text-white hover:bg-white/10"
              }`}
              onClick={() => {
                setTab(option);
                setNotice(null);
              }}
            >
              {option === "client" ? "As client" : "As videaste"}
            </button>
          ))}
        </div>
      )}
      {notice && (
        <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      )}
      {projectsQuery.isPending ? (
        <p
          role="status"
          className="flex items-center gap-2 text-base text-white/80"
        >
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading your projects…
        </p>
      ) : projectsQuery.isError ? (
        <div role="alert" className="space-y-2 text-base text-red-100">
          <p>{projectsQuery.error.message}</p>
          <button
            type="button"
            className={BTN_QUIET}
            onClick={() => void projectsQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : view === "client" ? (
        <ProjectList
          {...listProps}
          heading="Your projects"
          projects={projects}
          empty="You have not posted a project yet. Fill in the form above and press “Submit Video Project”."
        />
      ) : (
        <>
          <ProjectList
            {...listProps}
            heading="Taken by you"
            projects={board.mine}
            empty="You have not taken a project yet."
          />
          <ProjectList
            {...listProps}
            heading="Open projects"
            projects={board.open}
            empty="No open projects right now. Check back soon."
          />
        </>
      )}
    </section>
  );
}
