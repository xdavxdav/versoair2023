import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  ADMIN_ACCESS_MESSAGES,
  adminAccessIssue,
  readApiFailure,
} from "@/lib/admin-forms";
import {
  businessDetailPath,
  businessSearchPath,
  describeBusinessOption,
  parseBusinessOptions,
  type BusinessOption,
} from "@/lib/business-picker";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const TONES = {
  light: {
    input: "",
    panel: "border-gray-200 bg-white text-gray-900",
    option: "hover:bg-gray-100",
    muted: "text-gray-500",
    chip: "border-gray-300 bg-white text-gray-900",
    action: "text-blue-600 hover:text-blue-700",
    problem: "text-red-600",
  },
  dark: {
    input:
      "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
    panel: "border-slate-700 bg-slate-800 text-slate-100",
    option: "hover:bg-slate-700",
    muted: "text-slate-400",
    chip: "border-slate-700 bg-slate-800 text-white",
    action: "text-blue-400 hover:text-blue-300",
    problem: "text-red-400",
  },
} as const;

interface BusinessPickerProps {
  id?: string;
  value: number | null;
  onChange: (business: BusinessOption | null) => void;
  tone?: keyof typeof TONES;
  disabled?: boolean;
}

// Campaigns belong to a business, so admins pick a real one instead of the old hard-coded id 1.
export function BusinessPicker({
  id,
  value,
  onChange,
  tone = "light",
  disabled = false,
}: BusinessPickerProps) {
  const styles = TONES[tone];
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusinessOption | null>(null);
  const latestSearch = useRef(0);
  // The option the user just clicked, so its name needs no second lookup.
  const picked = useRef<BusinessOption | null>(null);

  useEffect(() => {
    if (value !== null) return;
    const search = ++latestSearch.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setProblem(null);
        try {
          const res = await authenticatedFetch(
            `${API_BASE_URL}${businessSearchPath(query)}`,
          );
          if (search !== latestSearch.current) return;
          if (!res.ok) {
            const failure = await readApiFailure(
              res,
              "Could not load businesses",
            );
            if (search !== latestSearch.current) return;
            const issue = adminAccessIssue(failure);
            setProblem(issue ? ADMIN_ACCESS_MESSAGES[issue] : failure.message);
            setOptions([]);
            return;
          }
          const next = parseBusinessOptions(await res.json());
          if (search === latestSearch.current) setOptions(next);
        } catch {
          if (search === latestSearch.current) {
            setProblem("Could not load businesses. Please try again.");
            setOptions([]);
          }
        } finally {
          if (search === latestSearch.current) setLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, value]);

  // Editing an existing campaign only knows the business id, so look its name up.
  useEffect(() => {
    if (value === null) {
      setSelected(null);
      return;
    }
    if (picked.current?.id === value) {
      setSelected(picked.current);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedFetch(
          `${API_BASE_URL}${businessDetailPath(value)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const [match] = parseBusinessOptions(await res.json());
        if (!cancelled) setSelected(match ?? null);
      } catch {
        if (!cancelled) setSelected(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (value !== null) {
    return (
      <div
        id={id}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
          styles.chip,
        )}
      >
        <span className="truncate">
          {selected ? describeBusinessOption(selected) : `Business #${value}`}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              picked.current = null;
              setSelected(null);
              setQuery("");
              onChange(null);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1 text-xs font-medium",
              styles.action,
            )}
          >
            <X className="h-3 w-3" /> Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search businesses by name…"
        aria-label="Search businesses"
        autoComplete="off"
        disabled={disabled}
        className={styles.input}
      />
      <div
        role="listbox"
        aria-label="Businesses"
        className={cn(
          "max-h-48 overflow-y-auto rounded-md border text-sm",
          styles.panel,
        )}
      >
        {loading && (
          <div className={cn("flex items-center gap-2 px-3 py-2", styles.muted)}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading businesses…
          </div>
        )}
        {!loading && problem && (
          <p className={cn("px-3 py-2", styles.problem)}>{problem}</p>
        )}
        {!loading && !problem && options.length === 0 && (
          <p className={cn("px-3 py-2", styles.muted)}>
            No businesses found. Add the business first, then create its
            campaign.
          </p>
        )}
        {!loading &&
          !problem &&
          options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={false}
              disabled={disabled}
              onClick={() => {
                picked.current = option;
                setSelected(option);
                onChange(option);
              }}
              className={cn(
                "block w-full truncate px-3 py-2 text-left",
                styles.option,
              )}
            >
              {describeBusinessOption(option)}
            </button>
          ))}
      </div>
    </div>
  );
}
