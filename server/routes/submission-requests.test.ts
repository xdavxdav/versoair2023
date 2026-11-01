import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test from "node:test";

process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/test";
process.env.JWT_SECRET = "x".repeat(40);

const { createSubmissionRequestsRouter } = await import("./submission-requests");
type Deps = Parameters<typeof createSubmissionRequestsRouter>[0];

interface Harness {
  sent: Array<{ to: string; subject: string; html: string }>;
  tickets: Array<Record<string, unknown>>;
  state: { emailOk: boolean; ticketOk: boolean; clock: number };
  deps: NonNullable<Deps>;
}

function harness(overrides: Partial<NonNullable<Deps>> = {}): Harness {
  const sent: Harness["sent"] = [];
  const tickets: Harness["tickets"] = [];
  const state = { emailOk: true, ticketOk: true, clock: 1_700_000_000_000 };
  const deps: NonNullable<Deps> = {
    sendEmail: async (to, subject, html) => {
      sent.push({ to, subject, html });
      return state.emailOk;
    },
    insertTicket: async (ticket) => {
      if (!state.ticketOk) throw new Error("tickets table unavailable");
      tickets.push({ ...ticket });
    },
    adminEmail: "admin@example.com",
    appUrl: "https://app.example.com",
    now: () => state.clock,
    ...overrides,
  };
  return { sent, tickets, state, deps };
}

async function withServer(
  deps: NonNullable<Deps>,
  fn: (post: (path: string, body: unknown, user?: object) => Promise<{ status: number; json: any }>) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  // Stand-in for the real token check: lets a test pretend to be signed in.
  app.use((req, _res, next) => {
    const raw = req.header("x-test-user");
    if (raw) (req as any).user = JSON.parse(raw);
    next();
  });
  app.use("/api/request", createSubmissionRequestsRouter(deps));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const post = async (path: string, body: unknown, user?: object) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/request${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user ? { "x-test-user": JSON.stringify(user) } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    return { status: response.status, json: await response.json() };
  };

  try {
    await fn(post);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

const member = { userId: "7", id: "7", email: "owner@example.com", role: "user" };
const staff = { userId: "1", id: "1", email: "staff@example.com", role: "admin" };

const business = {
  name: "Café du Port",
  categoryId: 4,
  categoryName: "Restaurants",
  countryCode: "CI",
  cityName: "Abidjan",
  phone: "+225 01 02 03 04",
  email: "contact@cafe.example",
  description: "Maquis en bord de lagune",
};

test("a business request is emailed and saved, and the reference comes back", async () => {
  const { deps, sent, tickets } = harness();
  await withServer(deps, async (post) => {
    const { status, json } = await post("/business", business, member);

    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.emailSent, true);
    assert.equal(json.recorded, true);
    assert.match(json.referenceId, /^REQ-BIZ-[0-9A-Z]+$/);
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "admin@example.com");
  assert.ok(sent[0].subject.includes("Café du Port"));
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].category, "business-request");
  assert.equal(tickets[0].source, "business-submission");
  assert.equal(tickets[0].requesterEmail, "owner@example.com");
  assert.equal(tickets[0].reporterId, 7);
  assert.ok(String(tickets[0].description).includes("Restaurants"));
  assert.ok(String(tickets[0].description).includes("Business Owner"));
  assert.ok(sent[0].html.includes("Business Owner"));
});

test("it still succeeds when only the ticket could be saved, and says the email did not go out", async () => {
  const { deps, state, tickets } = harness();
  state.emailOk = false;
  await withServer(deps, async (post) => {
    const { status, json } = await post("/business", business, member);
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.emailSent, false);
    assert.equal(json.recorded, true);
  });
  assert.equal(tickets.length, 1);
});

test("it still succeeds when only the email went out", async () => {
  const { deps, state } = harness();
  state.ticketOk = false;
  await withServer(deps, async (post) => {
    const { status, json } = await post("/business", business, member);
    assert.equal(status, 200);
    assert.equal(json.emailSent, true);
    assert.equal(json.recorded, false);
  });
});

test("it never reports success when nothing was emailed or saved, and the sender can retry at once", async () => {
  const { deps, state } = harness();
  state.emailOk = false;
  state.ticketOk = false;
  await withServer(deps, async (post) => {
    const failed = await post("/business", business, member);
    assert.equal(failed.status, 503);
    assert.equal(failed.json.success, false);
    assert.equal(failed.json.code, "SUBMISSION_NOT_RECORDED");
    assert.ok(failed.json.error);
    assert.equal(failed.json.referenceId, undefined);

    state.emailOk = true;
    const retry = await post("/business", business, member);
    assert.equal(retry.status, 200);
    assert.equal(retry.json.success, true);
  });
});

test("a missing admin address counts as not emailed instead of crashing", async () => {
  const { deps, sent, tickets } = harness({ adminEmail: "" });
  await withServer(deps, async (post) => {
    const { status, json } = await post("/business", business, member);
    assert.equal(status, 200);
    assert.equal(json.emailSent, false);
    assert.equal(json.recorded, true);
  });
  assert.equal(sent.length, 0);
  assert.equal(tickets.length, 1);
});

test("an email provider that throws is treated as not emailed", async () => {
  const { deps, tickets } = harness({
    sendEmail: async () => {
      throw new Error("SMTP exploded");
    },
  });
  await withServer(deps, async (post) => {
    const { status, json } = await post("/business", business, member);
    assert.equal(status, 200);
    assert.equal(json.emailSent, false);
    assert.equal(json.recorded, true);
  });
  assert.equal(tickets.length, 1);
});

test("a repeat from the same sender is a duplicate for five minutes, then accepted again", async () => {
  const { deps, state, tickets } = harness();
  await withServer(deps, async (post) => {
    assert.equal((await post("/business", business, member)).status, 200);

    const again = await post("/business", { ...business, name: "  café DU port " }, member);
    assert.equal(again.status, 429);
    assert.equal(again.json.code, "DUPLICATE_SUBMISSION");
    assert.equal(again.json.success, false);

    state.clock += 4 * 60 * 1000;
    assert.equal((await post("/business", business, member)).status, 429);

    state.clock += 61 * 1000;
    assert.equal((await post("/business", business, member)).status, 200);
  });
  assert.equal(tickets.length, 2);
});

test("two different people can each request the same business name", async () => {
  const { deps, tickets } = harness();
  await withServer(deps, async (post) => {
    assert.equal((await post("/business", business, member)).status, 200);
    const other = { ...member, userId: "8", id: "8", email: "other@example.com" };
    assert.equal((await post("/business", business, other)).status, 200);
  });
  assert.equal(tickets.length, 2);
});

test("a business name is required and visitors cannot inject markup into the admin email", async () => {
  const { deps, sent, tickets } = harness();
  await withServer(deps, async (post) => {
    const missing = await post("/business", { ...business, name: "   " }, member);
    assert.equal(missing.status, 400);
    assert.equal(missing.json.success, false);
    assert.equal(missing.json.error, "Business name is required");

    const nonText = await post("/business", { ...business, name: { $ne: "" } }, member);
    assert.equal(nonText.status, 400);

    const hostile = await post(
      "/business",
      {
        ...business,
        name: `<script>alert(1)</script>Shop`,
        description: `<img src=x onerror=alert(2)>`,
        username: `<b>admin</b>`,
      },
      member,
    );
    assert.equal(hostile.status, 200);
  });

  assert.equal(sent.length, 1);
  assert.ok(!sent[0].html.includes("<script>"));
  assert.ok(!sent[0].html.includes("<img src=x"));
  assert.ok(!sent[0].html.includes("<b>admin</b>"));
  assert.ok(sent[0].html.includes("&lt;script&gt;alert(1)&lt;/script&gt;Shop"));
  assert.equal(tickets.length, 1);
});

test("the sender recorded comes from the signed-in account, not only from what the form claims", async () => {
  const { deps, tickets } = harness();
  await withServer(deps, async (post) => {
    await post("/business", { ...business, username: "The Real Admin" }, member);
    await post("/business", { ...business, name: "Someone Else", username: "The Real Admin" });
  });

  assert.ok(String(tickets[0].reporter).includes("owner@example.com"));
  assert.ok(String(tickets[1].reporter).includes("not signed in"));
  // Anonymous requests are not tied to an account and carry no role advice.
  assert.equal(tickets[1].reporterId, null);
  assert.equal(tickets[1].requesterEmail, null);
  assert.ok(!String(tickets[1].description).includes("Business Owner"));
});

test("an artist request needs a stage name, is saved as a music request and links only http(s) URLs", async () => {
  const { deps, sent, tickets } = harness();
  await withServer(deps, async (post) => {
    const missing = await post("/artist", { genre: "Zouglou" });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.error, "Stage name is required");

    const ok = await post("/artist", {
      stageName: "DJ Lagune",
      genre: "Coupé-décalé",
      spotifyUrl: "javascript:alert(1)",
    });
    assert.equal(ok.status, 200);
    assert.match(ok.json.referenceId, /^REQ-ART-/);
  });

  assert.equal(tickets[0].category, "music-request");
  assert.equal(tickets[0].source, "artist-submission");
  assert.ok(!sent[0].html.includes('href="javascript:'));
  assert.ok(sent[0].html.includes("unsigned"));
});

test("a job request needs a title and a company, and a text 'false' is not remote", async () => {
  const { deps, sent, tickets } = harness();
  await withServer(deps, async (post) => {
    const noTitle = await post("/job", { company: "Acme" });
    assert.equal(noTitle.status, 400);
    assert.equal(noTitle.json.error, "Job title is required");

    const noCompany = await post("/job", { title: "Chef" });
    assert.equal(noCompany.status, 400);
    assert.equal(noCompany.json.error, "Company name is required");

    const ok = await post(
      "/job",
      { title: "Chef", company: "Acme", isRemote: "false", description: "Cuisine" },
      staff,
    );
    assert.equal(ok.status, 200);
    assert.match(ok.json.referenceId, /^REQ-JOB-/);
  });

  assert.equal(tickets[0].category, "job-request");
  assert.ok(String(tickets[0].description).includes("Remote: No"));
  assert.ok(sent[0].html.includes(">No<"));
});

test("an empty, array or non-JSON body is a clean 400, not a crash", async () => {
  const { deps } = harness();
  await withServer(deps, async (post) => {
    assert.equal((await post("/business", {})).status, 400);
    assert.equal((await post("/business", [])).status, 400);
    assert.equal((await post("/job", [])).status, 400);
    assert.equal((await post("/artist", {})).status, 400);
  });
});
