import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  Briefcase,
  ChevronDown,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageSwitcher";
import { BUSINESS_REQUEST_PATH } from "@/lib/signup-resume";
import { loadJson, resolveLang } from "@/lib/submit-json";

type Lang = "en" | "fr";

interface Posting {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string | null;
  status: string | null;
  posted_date: string | null;
  application_count: number;
  business_name: string | null;
}
interface Application {
  id: number | string;
  job_id?: string;
  applicant_id?: string;
  status: string | null;
  cover_letter?: string | null;
  resume_url?: string | null;
  notes?: string | null;
  applied_date: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
}

const COPY = {
  en: {
    eyebrow: "Careers portal",
    heading: "Hiring & applications",
    browse: "Browse all jobs",
    tabPostings: "My job postings",
    tabApplications: "My applications",
    noPostings: "You have no job postings yet.",
    postingsHint:
      "Postings attached to a business you own appear here with their applicants.",
    registerBusiness: "Register your business",
    noApplications: "You have not applied to any job yet.",
    applicationsHint: "Applications you submit while signed in are listed here.",
    loadFailed: "We could not load this list.",
    retry: "Try again",
    loading: "Loading",
    posted: "posted",
    applicants: (count: number) =>
      `${count} applicant${count === 1 ? "" : "s"}`,
    noApplicantsYet: "No applications yet.",
    resume: "Resume",
    jobUnlisted: "Job no longer listed",
  },
  fr: {
    eyebrow: "Portail Carrières",
    heading: "Recrutement et candidatures",
    browse: "Voir toutes les offres",
    tabPostings: "Mes offres d'emploi",
    tabApplications: "Mes candidatures",
    noPostings: "Vous n'avez pas encore d'offre d'emploi.",
    postingsHint:
      "Les offres rattachées à une entreprise dont vous êtes propriétaire apparaissent ici avec leurs candidats.",
    registerBusiness: "Enregistrer mon entreprise",
    noApplications: "Vous n'avez encore postulé à aucune offre.",
    applicationsHint:
      "Les candidatures envoyées lorsque vous êtes connecté apparaissent ici.",
    loadFailed: "Nous n'avons pas pu charger cette liste.",
    retry: "Réessayer",
    loading: "Chargement",
    posted: "publiée le",
    applicants: (count: number) =>
      `${count} candidat${count === 1 ? "" : "s"}`,
    noApplicantsYet: "Aucune candidature pour le moment.",
    resume: "CV",
    jobUnlisted: "Offre retirée",
  },
} as const;

// Statuses the server does not set itself fall back to their raw value.
const STATUS_LABELS: Record<Lang, Record<string, string>> = {
  en: {},
  fr: {
    submitted: "Envoyée",
    reviewed: "Examinée",
    shortlisted: "Présélectionnée",
    accepted: "Acceptée",
    rejected: "Refusée",
    hired: "Embauchée",
  },
};

const statusLabel = (status: string | null, lang: Lang) =>
  status ? (STATUS_LABELS[lang][status.toLowerCase()] ?? status) : "—";

const fmt = (date: string | null, lang: Lang) =>
  date
    ? new Date(date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")
    : "—";

const readPostings = (data: unknown) =>
  (data as { jobs?: Posting[] }).jobs ?? [];
const readApplications = (data: unknown) =>
  (data as { applications?: Application[] }).applications ?? [];

// A failed request is reported as such, never as an empty list.
function useJsonList<T>(
  url: string,
  read: (data: unknown) => T[],
  lang: Lang,
) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The language only words the error message, so it should not trigger a reload.
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    loadJson<unknown>(url, { lang: langRef.current }).then((result) => {
      if (cancelled) return;
      if (result.ok) setItems(read(result.data));
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [url, read, attempt]);

  return { items, error, retry: () => setAttempt((count) => count + 1) };
}

type ApplicantsState =
  | { status: "loading" }
  | { status: "ready"; items: Application[] }
  | { status: "failed"; message: string };

export default function CareersPortal() {
  const { currentLang } = useLanguage();
  const lang = resolveLang(currentLang);
  const copy = COPY[lang];

  const [tab, setTab] = useState<"postings" | "applications">("postings");
  const [openId, setOpenId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, ApplicantsState>>(
    {},
  );
  const postings = useJsonList<Posting>("/api/jobs/mine", readPostings, lang);
  const mine = useJsonList<Application>(
    "/api/jobs/my-applications",
    readApplications,
    lang,
  );

  const loadApplicants = async (id: string) => {
    setApplicants((prev) => ({ ...prev, [id]: { status: "loading" } }));
    const result = await loadJson<{ applications?: Application[] }>(
      `/api/jobs/${encodeURIComponent(id)}/applications`,
      { lang },
    );
    setApplicants((prev) => ({
      ...prev,
      [id]: result.ok
        ? { status: "ready", items: result.data.applications ?? [] }
        : { status: "failed", message: result.message },
    }));
  };

  const toggle = (id: string) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    const known = applicants[id];
    if (opening && (!known || known.status === "failed")) {
      void loadApplicants(id);
    }
  };

  const active = tab === "postings" ? postings : mine;
  const loading = active.items === null && active.error === null;

  return (
    <div className="min-h-screen bg-background px-4 py-10 pb-28 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="h-1.5 bg-primary" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {copy.eyebrow}
              </p>
              <h1 className="text-3xl font-extrabold">{copy.heading}</h1>
            </div>
            <Button asChild>
              <Link href="/services/careers">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                {copy.browse}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(
            [
              ["postings", copy.tabPostings],
              ["applications", copy.tabApplications],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-6 w-6 animate-spin text-primary"
              aria-label={copy.loading}
            />
          </div>
        )}

        {active.error !== null && (
          <LoadError
            title={copy.loadFailed}
            message={active.error}
            retryLabel={copy.retry}
            onRetry={active.retry}
          />
        )}

        {tab === "postings" && postings.items && (
          <div className="space-y-3">
            {postings.items.length === 0 && (
              <Empty text={copy.noPostings} hint={copy.postingsHint}>
                <Button asChild className="mt-4">
                  <Link href={BUSINESS_REQUEST_PATH}>
                    {copy.registerBusiness}
                  </Link>
                </Button>
              </Empty>
            )}
            {postings.items.map((job) => {
              const state = applicants[job.id];
              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
                >
                  <button
                    type="button"
                    aria-expanded={openId === job.id}
                    onClick={() => toggle(job.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.business_name || job.company}
                        {job.location ? ` · ${job.location}` : ""} ·{" "}
                        {copy.posted} {fmt(job.posted_date, lang)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {copy.applicants(Number(job.application_count))}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${openId === job.id ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                  {openId === job.id && (
                    <div className="space-y-2 border-t border-border p-4">
                      {(!state || state.status === "loading") && (
                        <Loader2
                          className="h-4 w-4 animate-spin text-primary"
                          aria-label={copy.loading}
                        />
                      )}
                      {state?.status === "failed" && (
                        <LoadError
                          title={copy.loadFailed}
                          message={state.message}
                          retryLabel={copy.retry}
                          onRetry={() => void loadApplicants(job.id)}
                        />
                      )}
                      {state?.status === "ready" &&
                        state.items.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            {copy.noApplicantsYet}
                          </p>
                        )}
                      {state?.status === "ready" &&
                        state.items.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-xl bg-muted p-3 text-sm text-foreground"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">
                                {a.applicant_id}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {statusLabel(a.status, lang)} ·{" "}
                                {fmt(a.applied_date, lang)}
                              </span>
                            </div>
                            {a.cover_letter && (
                              <p className="mt-2 whitespace-pre-line text-muted-foreground">
                                {a.cover_letter}
                              </p>
                            )}
                            {a.notes && (
                              <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                                {a.notes}
                              </p>
                            )}
                            {a.resume_url && /^https?:\/\//.test(a.resume_url) && (
                              <a
                                href={a.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <FileText
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />{" "}
                                {copy.resume}
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "applications" && mine.items && (
          <div className="space-y-3">
            {mine.items.length === 0 && (
              <Empty
                text={copy.noApplications}
                hint={copy.applicationsHint}
              />
            )}
            {mine.items.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
              >
                <div>
                  <p className="font-semibold">
                    {a.title || copy.jobUnlisted}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.company}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-bold capitalize text-primary">
                    {statusLabel(a.status, lang)}
                  </p>
                  <p>{fmt(a.applied_date, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadError({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function Empty({
  text,
  hint,
  children,
}: {
  text: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-card-foreground">
      <Briefcase
        className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="font-semibold">{text}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
