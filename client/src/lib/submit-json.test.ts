import assert from "node:assert/strict";
import test from "node:test";
import {
  describeFailure,
  failureFromThrown,
  loadJson,
  readServerError,
  submitJson,
} from "./submit-json";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("reads every error shape the API uses", () => {
  assert.deepEqual(readServerError({ message: "Username is taken." }), {
    code: null,
    message: "Username is taken.",
  });
  assert.deepEqual(readServerError({ success: false, error: "Missing fields" }), {
    code: null,
    message: "Missing fields",
  });
  assert.deepEqual(
    readServerError({ error: { code: "AUTH_REQUIRED", message: "Log in." } }),
    { code: "AUTH_REQUIRED", message: "Log in." },
  );
  assert.deepEqual(
    readServerError({ errors: [{ message: "Name is required" }, "City is required"] }),
    { code: null, message: "Name is required City is required" },
  );
  assert.deepEqual(readServerError(null), { code: null, message: null });
  assert.deepEqual(readServerError("<html>"), { code: null, message: null });
});

test("ignores HTML pages and oversized text from proxies", () => {
  assert.equal(readServerError({ message: "<html>Bad gateway</html>" }).message, null);
  assert.equal(readServerError({ error: "x".repeat(500) }).message, null);
});

test("known codes replace technical server wording", () => {
  const csrf = describeFailure(
    403,
    { error: { code: "CSRF_VALIDATION_FAILED", message: "Invalid or missing CSRF token" } },
    { lang: "en" },
  );
  assert.equal(csrf.code, "CSRF_VALIDATION_FAILED");
  assert.match(csrf.message, /Refresh the page/);

  const readOnly = describeFailure(
    403,
    { error: { code: "GEOADMIN_SUBSCRIBER_READ_ONLY", message: "read-only" } },
    { lang: "fr" },
  );
  assert.match(readOnly.message, /lecture seule/);
});

test("request-form codes read as plain French or English instead of server wording", () => {
  // The /api/request routes put a top-level `code` next to the English `error` text.
  const duplicate = describeFailure(
    429,
    { success: false, code: "DUPLICATE_SUBMISSION", error: "Duplicate submission detected." },
    { lang: "fr" },
  );
  assert.equal(duplicate.code, "DUPLICATE_SUBMISSION");
  assert.match(duplicate.message, /déjà envoyé cette demande/);

  const notSaved = describeFailure(
    503,
    { success: false, code: "SUBMISSION_NOT_RECORDED", error: "We could not save your request." },
    { lang: "en" },
  );
  assert.match(notSaved.message, /nothing was sent/);

  const limited = describeFailure(
    429,
    { success: false, code: "RATE_LIMIT_EXCEEDED", error: "Too many requests." },
    { lang: "fr" },
  );
  assert.match(limited.message, /Trop de demandes/);
});

test("falls back from server text to caller text to a status message", () => {
  assert.equal(describeFailure(400, { error: "City is required" }, { lang: "en" }).message, "City is required");
  assert.equal(
    describeFailure(500, null, { lang: "en", fallbackMessage: "Could not publish." }).message,
    "Could not publish.",
  );
  assert.match(describeFailure(500, null, { lang: "en" }).message, /server could not complete/);
  assert.match(describeFailure(429, null, { lang: "fr" }).message, /Trop de tentatives/);
});

test("parses errors thrown by apiRequest", () => {
  const thrown = failureFromThrown(
    new Error('403: {"error":{"code":"AUTH_REQUIRED","message":"Please log in"}}'),
    { lang: "en" },
  );
  assert.equal(thrown.status, 403);
  assert.equal(thrown.code, "AUTH_REQUIRED");

  assert.equal(failureFromThrown(new Error("409: Already exists"), { lang: "en" }).message, "Already exists");
  assert.equal(failureFromThrown(new TypeError("Failed to fetch"), { lang: "en" }).code, "NETWORK_ERROR");
  assert.match(failureFromThrown("boom", { lang: "en" }).message, /request failed/);
  assert.match(
    failureFromThrown(new Error("502: <html>Bad gateway</html>"), { lang: "en" }).message,
    /server could not complete/,
  );
});

test("submitJson returns data on success and sends JSON", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const result = await submitJson<{ data: { id: number } }>("/api/properties", {
    body: { name: "Villa" },
    fetcher: async (url, init) => {
      seen = { url, init };
      return json(201, { success: true, data: { id: 7 } });
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.data.id, 7);
  assert.equal(seen!.url, "/api/properties");
  assert.equal(seen!.init.method, "POST");
  assert.equal(seen!.init.body, JSON.stringify({ name: "Villa" }));
  assert.equal((seen!.init.headers as Record<string, string>)["Content-Type"], "application/json");
});

test("submitJson reports non-2xx and success:false bodies instead of swallowing them", async () => {
  const forbidden = await submitJson("/api/x", {
    lang: "en",
    fetcher: async () => json(403, { success: false, error: { code: "GEOADMIN_SUBSCRIBER_READ_ONLY", message: "no" } }),
  });
  assert.equal(forbidden.ok, false);
  if (!forbidden.ok) {
    assert.equal(forbidden.status, 403);
    assert.match(forbidden.message, /read-only/);
  }

  const soft = await submitJson("/api/x", {
    lang: "en",
    fetcher: async () => json(200, { success: false, error: "Business name is required" }),
  });
  assert.equal(soft.ok, false);
  if (!soft.ok) assert.equal(soft.message, "Business name is required");
});

test("submitJson retries once with a fresh CSRF token", async () => {
  let calls = 0;
  let refreshed = 0;
  const result = await submitJson("/api/x", {
    fetcher: async () => {
      calls += 1;
      return calls === 1
        ? json(403, { success: false, error: { code: "CSRF_VALIDATION_FAILED", message: "bad" } })
        : json(200, { success: true });
    },
    refreshCsrf: async () => {
      refreshed += 1;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  assert.equal(refreshed, 1);
});

test("submitJson gives up after one CSRF retry", async () => {
  let calls = 0;
  const result = await submitJson("/api/x", {
    lang: "en",
    fetcher: async () => {
      calls += 1;
      return json(403, { success: false, error: { code: "CSRF_VALIDATION_FAILED", message: "bad" } });
    },
    refreshCsrf: async () => {},
  });
  assert.equal(calls, 2);
  assert.equal(result.ok, false);
});

test("submitJson turns a network failure into a clear message", async () => {
  const result = await submitJson("/api/x", {
    lang: "en",
    fetcher: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 0);
    assert.equal(result.code, "NETWORK_ERROR");
    assert.match(result.message, /request was not sent/);
  }
});

test("loadJson returns the data and sends a plain GET", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const result = await loadJson<{ jobs: string[] }>("/api/jobs/mine", {
    fetcher: async (url, init) => {
      seen = { url, init };
      return json(200, { jobs: [] });
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.data.jobs, []);
  assert.equal(seen!.url, "/api/jobs/mine");
  assert.equal(seen!.init.method, "GET");
  assert.equal(seen!.init.body, undefined);
});

test("loadJson reports a failed load instead of returning an empty result", async () => {
  const unavailable = await loadJson("/api/jobs/mine", {
    lang: "en",
    fetcher: async () => json(500, { error: "db down" }),
  });
  assert.equal(unavailable.ok, false);
  if (!unavailable.ok) {
    assert.equal(unavailable.status, 500);
    assert.equal(unavailable.message, "db down");
  }

  const expired = await loadJson("/api/jobs/mine", {
    lang: "fr",
    fetcher: async () => json(401, {}),
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.match(expired.message, /session a expiré/);

  const offline = await loadJson("/api/jobs/mine", {
    lang: "en",
    fetcher: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  assert.equal(offline.ok, false);
  if (!offline.ok) assert.equal(offline.code, "NETWORK_ERROR");
});

test("loadJson treats an HTML page served with 200 as a failure", async () => {
  const result = await loadJson("/api/does-not-exist", {
    lang: "en",
    fetcher: async () =>
      new Response("<!doctype html><title>app</title>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_RESPONSE");
});
