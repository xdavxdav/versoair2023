import { authenticatedFetch, initializeCsrfToken } from "./auth";

export type SubmitMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface SubmitFailure {
  ok: false;
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  code: string | null;
  /** Human-readable text that is safe to show in a toast. */
  message: string;
}

export interface SubmitSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export type SubmitResult<T = unknown> = SubmitSuccess<T> | SubmitFailure;

export interface SubmitJsonOptions {
  method?: SubmitMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Shown when the server gives no readable message. */
  fallbackMessage?: string;
  /** Two-letter UI language. Defaults to the visitor's saved language. */
  lang?: string;
  fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  refreshCsrf?: () => Promise<unknown>;
}

type Copy = { en: string; fr: string };

const CODE_COPY: Record<string, Copy> = {
  CSRF_VALIDATION_FAILED: {
    en: "Your session security check expired. Refresh the page and try again.",
    fr: "La vérification de sécurité de votre session a expiré. Actualisez la page et réessayez.",
  },
  AUTH_REQUIRED: {
    en: "Please sign in to continue.",
    fr: "Veuillez vous connecter pour continuer.",
  },
  GEOADMIN_SUBSCRIBER_READ_ONLY: {
    en: "Your GeoAdmin Subscriber plan is read-only. You can view data but not publish or edit.",
    fr: "Votre abonnement GeoAdmin est en lecture seule. Vous pouvez consulter les données mais pas publier ni modifier.",
  },
  DUPLICATE_SUBMISSION: {
    en: "You already sent this request a moment ago. Please wait 5 minutes before sending it again.",
    fr: "Vous avez déjà envoyé cette demande à l'instant. Patientez 5 minutes avant de la renvoyer.",
  },
  SUBMISSION_NOT_RECORDED: {
    en: "We could not save your request right now, so nothing was sent. Please try again in a few minutes.",
    fr: "Nous n'avons pas pu enregistrer votre demande pour le moment, donc rien n'a été envoyé. Veuillez réessayer dans quelques minutes.",
  },
  RATE_LIMIT_EXCEEDED: {
    en: "Too many requests. Please try again in a few minutes.",
    fr: "Trop de demandes. Veuillez réessayer dans quelques minutes.",
  },
};

const STATUS_COPY: Record<number, Copy> = {
  400: {
    en: "Some information is missing or invalid.",
    fr: "Certaines informations sont manquantes ou invalides.",
  },
  401: {
    en: "Your session has expired. Please sign in again.",
    fr: "Votre session a expiré. Veuillez vous reconnecter.",
  },
  403: {
    en: "You do not have permission to do this.",
    fr: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  },
  404: {
    en: "This service could not be found.",
    fr: "Ce service est introuvable.",
  },
  409: {
    en: "This conflicts with an existing record.",
    fr: "Cela entre en conflit avec un enregistrement existant.",
  },
  413: {
    en: "The data you sent is too large.",
    fr: "Les données envoyées sont trop volumineuses.",
  },
  429: {
    en: "Too many attempts. Please wait a moment and try again.",
    fr: "Trop de tentatives. Patientez un instant puis réessayez.",
  },
};

const SERVER_ERROR_COPY: Copy = {
  en: "The server could not complete your request. Please try again.",
  fr: "Le serveur n'a pas pu traiter votre demande. Veuillez réessayer.",
};

const NETWORK_COPY: Copy = {
  en: "Network problem: your request was not sent. Check your connection and try again.",
  fr: "Problème de réseau : votre demande n'a pas été envoyée. Vérifiez votre connexion et réessayez.",
};

const GENERIC_COPY: Copy = {
  en: "The request failed. Please try again.",
  fr: "La requête a échoué. Veuillez réessayer.",
};

const MAX_SERVER_MESSAGE_LENGTH = 240;

export function resolveLang(lang?: string): "en" | "fr" {
  let value = lang;
  if (!value) {
    try {
      value = globalThis.localStorage?.getItem("fsa_selected_language") ?? "";
    } catch {
      value = "";
    }
  }
  // The platform defaults to French when nothing has been chosen.
  return value && !value.toLowerCase().startsWith("fr") ? "en" : "fr";
}

function pick(copy: Copy, lang: "en" | "fr"): string {
  return copy[lang];
}

function genericMessage(status: number, lang: "en" | "fr"): string {
  const copy =
    STATUS_COPY[status] ?? (status >= 500 ? SERVER_ERROR_COPY : GENERIC_COPY);
  return pick(copy, lang);
}

function isReadableMessage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text || text.length > MAX_SERVER_MESSAGE_LENGTH) return false;
  return !/^\s*</.test(text);
}

function messageFromList(list: unknown): string | null {
  if (!Array.isArray(list)) return null;
  const parts = list
    .map((entry) => {
      if (isReadableMessage(entry)) return entry.trim();
      if (entry && typeof entry === "object" && "message" in entry) {
        const message = (entry as { message?: unknown }).message;
        return isReadableMessage(message) ? message.trim() : null;
      }
      return null;
    })
    .filter((part): part is string => part !== null);
  return parts.length ? parts.join(" ") : null;
}

/**
 * The API answers with several shapes: `{message}`, `{error: "text"}`,
 * `{error: {code, message}}` and `{errors: [...]}`. Read them all.
 */
export function readServerError(body: unknown): {
  code: string | null;
  message: string | null;
} {
  if (!body || typeof body !== "object") return { code: null, message: null };
  const record = body as Record<string, unknown>;
  const error = record.error;
  let code: string | null = typeof record.code === "string" ? record.code : null;
  let message: string | null = null;

  if (error && typeof error === "object") {
    const nested = error as Record<string, unknown>;
    if (typeof nested.code === "string") code = nested.code;
    if (isReadableMessage(nested.message)) message = nested.message.trim();
  } else if (isReadableMessage(error)) {
    message = error.trim();
  }

  if (!message && isReadableMessage(record.message)) {
    message = record.message.trim();
  }
  if (!message) message = messageFromList(record.errors);

  return { code, message };
}

/**
 * Pick the text shown to the user. Known codes win over the server wording
 * because messages such as "Invalid or missing CSRF token" mean nothing to a visitor.
 */
export function describeFailure(
  status: number,
  body: unknown,
  options: { fallbackMessage?: string; lang?: string } = {},
): SubmitFailure {
  const lang = resolveLang(options.lang);
  const { code, message } = readServerError(body);
  const known = code ? CODE_COPY[code] : undefined;
  return {
    ok: false,
    status,
    code,
    message:
      (known && pick(known, lang)) ||
      message ||
      options.fallbackMessage ||
      genericMessage(status, lang),
  };
}

/**
 * Turn an error thrown by `apiRequest` (message "403: {json}") into the same
 * shape `submitJson` returns, so mutations can report it in one way.
 */
export function failureFromThrown(
  error: unknown,
  options: { fallbackMessage?: string; lang?: string } = {},
): SubmitFailure {
  const lang = resolveLang(options.lang);
  if (!(error instanceof Error)) {
    return describeFailure(0, null, options);
  }
  const match = /^(\d{3}):\s*([\s\S]*)$/.exec(error.message);
  if (!match) {
    const isNetwork = error instanceof TypeError;
    return {
      ok: false,
      status: 0,
      code: isNetwork ? "NETWORK_ERROR" : null,
      message: isNetwork
        ? pick(NETWORK_COPY, lang)
        : isReadableMessage(error.message)
          ? error.message.trim()
          : options.fallbackMessage || pick(GENERIC_COPY, lang),
    };
  }
  const status = Number(match[1]);
  let body: unknown = null;
  try {
    body = JSON.parse(match[2]);
  } catch {
    body = isReadableMessage(match[2]) ? { message: match[2] } : null;
  }
  return describeFailure(status, body, options);
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * GET counterpart of `submitJson`: a failed load comes back as a readable message
 * instead of an empty result, so a page can show "could not load" rather than
 * "nothing here yet". An HTML body on a 200 (an SPA fallback for an unknown
 * route) also counts as a failure.
 */
export async function loadJson<T = unknown>(
  url: string,
  options: Pick<
    SubmitJsonOptions,
    "fallbackMessage" | "lang" | "fetcher" | "headers"
  > = {},
): Promise<SubmitResult<T>> {
  const fetcher = options.fetcher ?? authenticatedFetch;
  const lang = resolveLang(options.lang);
  const failureOptions = { fallbackMessage: options.fallbackMessage, lang };

  let response: Response;
  let body: unknown;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", ...options.headers },
    });
    body = await parseBody(response);
  } catch {
    return {
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
      message: pick(NETWORK_COPY, lang),
    };
  }

  const reportsFailure =
    !!body &&
    typeof body === "object" &&
    (body as { success?: unknown }).success === false;
  if (!response.ok || reportsFailure) {
    return describeFailure(response.status, body, failureOptions);
  }
  if (body === null || typeof body !== "object") {
    return {
      ...describeFailure(response.status, null, failureOptions),
      code: "INVALID_RESPONSE",
    };
  }

  return { ok: true, status: response.status, data: body as T };
}

/**
 * Send JSON to the API without ever failing silently.
 *
 * It adds the CSRF header, sends cookies, retries once when the CSRF token is stale,
 * and always resolves with `{ok:true,data}` or `{ok:false,message}`. Callers only
 * need to show `result.message` when `result.ok` is false.
 */
export async function submitJson<T = unknown>(
  url: string,
  options: SubmitJsonOptions = {},
): Promise<SubmitResult<T>> {
  const fetcher = options.fetcher ?? authenticatedFetch;
  const refreshCsrf = options.refreshCsrf ?? initializeCsrfToken;
  const lang = resolveLang(options.lang);
  const failureOptions = { fallbackMessage: options.fallbackMessage, lang };

  const send = () =>
    fetcher(url, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let response: Response;
  let body: unknown;
  try {
    response = await send();
    body = await parseBody(response);

    if (!response.ok && readServerError(body).code === "CSRF_VALIDATION_FAILED") {
      await refreshCsrf();
      response = await send();
      body = await parseBody(response);
    }
  } catch {
    return {
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
      message: pick(NETWORK_COPY, lang),
    };
  }

  const reportsFailure =
    !!body &&
    typeof body === "object" &&
    (body as { success?: unknown }).success === false;
  if (!response.ok || reportsFailure) {
    return describeFailure(response.status, body, failureOptions);
  }

  return { ok: true, status: response.status, data: body as T };
}
