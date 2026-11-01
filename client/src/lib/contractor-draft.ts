// A contractor has to verify their email before they can sign in, so the profile typed on
// /apply is kept on this device until they can submit the real application on /contracts.
// Nothing sensitive is stored: never the password or the email address.

export const CONTRACTOR_APPLY_PATH = "/contracts?apply=contractor";

const STORAGE_KEY = "versoair:contractor-draft";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
// Same limits as applySchema in server/routes/contractor-pipeline.ts.
const LIMITS = { name: 200, phone: 30, specialization: 200, hourlyRate: 50 } as const;

export interface ContractorDraft {
  name: string;
  phone: string;
  specialization: string;
  hourlyRate: string;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): DraftStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function saveContractorDraft(
  draft: Partial<ContractorDraft>,
  storage: DraftStorage | null = defaultStorage(),
  now: number = Date.now(),
): void {
  if (!storage) return;
  const stored = {
    name: clean(draft.name, LIMITS.name),
    phone: clean(draft.phone, LIMITS.phone),
    specialization: clean(draft.specialization, LIMITS.specialization),
    hourlyRate: clean(draft.hourlyRate, LIMITS.hourlyRate),
    savedAt: now,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage full or blocked: the application form just starts empty.
  }
}

export function clearContractorDraft(
  storage: DraftStorage | null = defaultStorage(),
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function readContractorDraft(
  storage: DraftStorage | null = defaultStorage(),
  now: number = Date.now(),
): ContractorDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : 0;
    const age = now - savedAt;
    if (!parsed || !savedAt || age > MAX_AGE_MS || age < -60_000) {
      clearContractorDraft(storage);
      return null;
    }
    return {
      name: clean(parsed.name, LIMITS.name),
      phone: clean(parsed.phone, LIMITS.phone),
      specialization: clean(parsed.specialization, LIMITS.specialization),
      hourlyRate: clean(parsed.hourlyRate, LIMITS.hourlyRate),
    };
  } catch {
    return null;
  }
}

/** Where to send someone who just finished signing in, or null when there is nothing to resume. */
export function getContractorResumePath(
  storage: DraftStorage | null = defaultStorage(),
  now: number = Date.now(),
): string | null {
  return readContractorDraft(storage, now) ? CONTRACTOR_APPLY_PATH : null;
}

/** Turns the saved draft into the fields of the application form on /contracts. */
export function draftToApplyForm(draft: ContractorDraft | null): ContractorDraft {
  if (!draft) return { name: "", phone: "", specialization: "", hourlyRate: "" };
  // /apply asks for a bare amount in USD; the application form takes free text such as "$50/hr".
  const bareAmount = /^\d+(\.\d{1,2})?$/.test(draft.hourlyRate);
  return {
    ...draft,
    hourlyRate: bareAmount ? `$${draft.hourlyRate}/hr` : draft.hourlyRate,
  };
}
