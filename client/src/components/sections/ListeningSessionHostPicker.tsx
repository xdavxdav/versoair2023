import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { AdminHostOption } from "@shared/listening-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/useDebounce";
import {
  HOST_SEARCH_MIN_CHARS,
  adminApi,
  adminErrorMessage,
  adminKeys,
  searchTerm,
} from "@/lib/listening-session-admin-api";

const SEARCH_DEBOUNCE_MS = 300;

interface HostPickerProps {
  inputId: string;
  /** Who hosts right now, as a name only. */
  currentLabel: string;
  /** True once another host was picked, which is when the reset button shows. */
  changed: boolean;
  resetLabel: string;
  onSelect: (host: AdminHostOption) => void;
  onReset: () => void;
}

const roleLabel = (role: string | null): string => (role ? role.replace(/_/g, " ") : "");

export function HostPicker({ inputId, currentLabel, changed, resetLabel, onSelect, onReset }: HostPickerProps) {
  const [query, setQuery] = useState("");
  const typed = searchTerm(query);
  const term = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS);
  const searching = typed.length >= HOST_SEARCH_MIN_CHARS && term.length >= HOST_SEARCH_MIN_CHARS;

  const hosts = useQuery({
    queryKey: [...adminKeys.all, "hosts", term],
    queryFn: ({ signal }) => adminApi.searchHosts(term, signal),
    enabled: searching,
    staleTime: 30_000,
  });

  function choose(host: AdminHostOption) {
    onSelect(host);
    setQuery("");
  }

  let status: string | null = null;
  if (typed.length > 0 && typed.length < HOST_SEARCH_MIN_CHARS) {
    status = `Type at least ${HOST_SEARCH_MIN_CHARS} characters of the host's name.`;
  } else if (searching && hosts.isError) {
    status = adminErrorMessage(hosts.error, "Could not search the hosts.");
  } else if (searching && hosts.isFetching) {
    status = "Searching…";
  } else if (searching && hosts.data) {
    status = hosts.data.length === 0 ? "No host matches that name." : `${hosts.data.length} found.`;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Host</Label>
      <p className="text-sm text-slate-700">
        Current host: <span className="font-medium text-slate-900">{currentLabel}</span>
        {changed && (
          <Button type="button" variant="link" size="sm" className="h-auto px-2 py-0" onClick={onReset}>
            {resetLabel}
          </Button>
        )}
      </p>
      <div className="relative">
        <Input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder="Search a host by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {searching && hosts.isFetching && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        )}
      </div>
      <p className="min-h-5 text-sm text-slate-600" role="status" aria-live="polite">
        {status}
      </p>
      {searching && hosts.data && hosts.data.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white" aria-label="Matching hosts">
          {hosts.data.map((host) => (
            <li key={host.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => choose(host)}
              >
                <span className="font-medium text-slate-900">{host.name}</span>
                {host.role && <span className="text-xs capitalize text-slate-500">{roleLabel(host.role)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
