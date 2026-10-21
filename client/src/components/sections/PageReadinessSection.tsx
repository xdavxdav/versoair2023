import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PAGE_READINESS_CANDIDATES,
  type PageReadinessConfig,
} from "@shared/page-readiness";
import { authenticatedFetch } from "@/lib/auth";

const ADMIN_QUERY_KEY = ["/api/page-readiness/admin"];

async function loadPageReadiness(): Promise<PageReadinessConfig> {
  const response = await authenticatedFetch("/api/page-readiness/admin");
  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }
  return response.json();
}

export function PageReadinessSection() {
  const queryClient = useQueryClient();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [savingPath, setSavingPath] = useState("");
  const configQuery = useQuery({
    queryKey: ADMIN_QUERY_KEY,
    queryFn: loadPageReadiness,
  });

  const submitChange = async (
    change: { action: "add" | "remove"; path: string } | {
      action: "set-blocked";
      path: string;
      blocked: boolean;
    },
  ) => {
    setError("");
    setSavingPath(change.path);
    try {
      const response = await authenticatedFetch("/api/page-readiness/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || response.statusText);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["/api/page-readiness"] }),
      ]);
      if (change.action === "add") setPath("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The page gate could not be updated.",
      );
    } finally {
      setSavingPath("");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Public page readiness
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Mark unfinished public routes as eligible, then block or reopen them.
        Blocking a page also blocks every route beneath it.         Get Involved, vHeartz, ONG Culturelle, Cultural Programs, and the
        vHeartz-focused Partners and Sponsorship pages start blocked while
        these initiatives and the vHeartz team are being prepared. They are
        previewable only on localhost during development; production always
        keeps them blocked until a code release removes this restriction.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {configQuery.isPending ? (
        <p className="mt-5 text-sm text-slate-500">Loading page gates…</p>
      ) : configQuery.isError ? (
        <div className="mt-5">
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            Could not load page readiness settings: {configQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => void configQuery.refetch()}
            className="mt-2 rounded-md border px-3 py-1.5 text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const nextPath = path.trim();
              if (nextPath) void submitChange({ action: "add", path: nextPath });
            }}
          >
            <label className="sr-only" htmlFor="eligible-page-path">
              Public route to make eligible
            </label>
            <select
              id="eligible-page-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              required
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select a public page</option>
              {PAGE_READINESS_CANDIDATES.filter(
                (candidate) => !configQuery.data.eligiblePaths.includes(candidate),
              ).map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!path.trim() || !!savingPath}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add eligible page
            </button>
          </form>

          <ul className="mt-5 divide-y divide-slate-200 dark:divide-slate-700">
            {configQuery.data.eligiblePaths.map((eligiblePath) => {
              const blocked = configQuery.data.blockedPaths.includes(eligiblePath);
              const isSaving = savingPath === eligiblePath;
              return (
                <li
                  key={eligiblePath}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <code className="break-all text-sm font-medium text-slate-800 dark:text-slate-100">
                      {eligiblePath}
                    </code>
                    <p className="text-xs text-slate-500">
                      {blocked ? "Blocked for visitors" : "Open to visitors"}
                      {blocked ? " · child routes are also blocked" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={blocked}
                        disabled={isSaving}
                        onChange={(event) =>
                          void submitChange({
                            action: "set-blocked",
                            path: eligiblePath,
                            blocked: event.target.checked,
                          })
                        }
                      />
                      Block
                    </label>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        void submitChange({
                          action: "remove",
                          path: eligiblePath,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
            {configQuery.data.eligiblePaths.length === 0 && (
              <li className="py-3 text-sm text-slate-500">
                No pages are currently eligible for readiness gating.
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
