import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Briefcase, ChevronDown, FileText, Loader2, Search } from "lucide-react";

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

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function CareersPortal() {
  const [tab, setTab] = useState<"postings" | "applications">("postings");
  const [postings, setPostings] = useState<Posting[] | null>(null);
  const [mine, setMine] = useState<Application[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, Application[]>>(
    {},
  );

  useEffect(() => {
    getJson<{ jobs: Posting[] }>("/api/jobs/mine").then((r) =>
      setPostings(r?.jobs ?? []),
    );
    getJson<{ applications: Application[] }>("/api/jobs/my-applications").then(
      (r) => setMine(r?.applications ?? []),
    );
  }, []);

  const toggle = async (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    if (!applicants[id]) {
      const r = await getJson<{ applications: Application[] }>(
        `/api/jobs/${id}/applications`,
      );
      setApplicants((prev) => ({ ...prev, [id]: r?.applications ?? [] }));
    }
  };

  const loading = tab === "postings" ? postings === null : mine === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-10 pb-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Careers portal
              </p>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Hiring & applications
              </h1>
            </div>
            <Link href="/services/careers">
              <a className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <Search className="h-4 w-4" /> Browse all jobs
              </a>
            </Link>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(
            [
              ["postings", "My job postings"],
              ["applications", "My applications"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && tab === "postings" && (
          <div className="space-y-3">
            {postings!.length === 0 && (
              <Empty
                text="You have no job postings yet."
                hint="Postings attached to a business you own appear here with their applicants."
              />
            )}
            {postings!.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => toggle(job.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-500">
                      {job.business_name || job.company}
                      {job.location ? ` · ${job.location}` : ""} · posted{" "}
                      {fmt(job.posted_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {job.application_count} applicant
                      {Number(job.application_count) === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${openId === job.id ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {openId === job.id && (
                  <div className="space-y-2 border-t border-slate-100 p-4">
                    {!applicants[job.id] && (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    )}
                    {applicants[job.id]?.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No applications yet.
                      </p>
                    )}
                    {applicants[job.id]?.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">
                            {a.applicant_id}
                          </span>
                          <span className="text-xs text-slate-500">
                            {a.status} · {fmt(a.applied_date)}
                          </span>
                        </div>
                        {a.cover_letter && (
                          <p className="mt-2 whitespace-pre-line text-slate-600">
                            {a.cover_letter}
                          </p>
                        )}
                        {a.notes && (
                          <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                            {a.notes}
                          </p>
                        )}
                        {a.resume_url && /^https?:\/\//.test(a.resume_url) && (
                          <a
                            href={a.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> Resume
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "applications" && (
          <div className="space-y-3">
            {mine!.length === 0 && (
              <Empty
                text="You have not applied to any job yet."
                hint="Applications you submit while signed in are listed here."
              />
            )}
            {mine!.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {a.title || "Job no longer listed"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.company}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-bold capitalize text-emerald-700">
                    {a.status}
                  </p>
                  <p>{fmt(a.applied_date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="font-semibold text-slate-700">{text}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}
