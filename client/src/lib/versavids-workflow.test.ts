import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BUDGET_MAX,
  checkChangeRequest,
  checkDelivery,
  deliverableStatusLabel,
  formatBudget,
  formatDeadline,
  formatLabel,
  latestDeliverable,
  linkHost,
  mailtoAddress,
  nextVersion,
  parseBudgetInput,
  parseProjectDetail,
  parseProjects,
  projectActions,
  projectHint,
  projectRole,
  resolutionCode,
  splitArtistBoard,
  statusLabel,
  viewerIdOf,
  type VersaVidsDeliverable,
  type VersaVidsProject,
} from "./versavids-workflow";

const STATUSES = [
  "open",
  "claimed",
  "in_progress",
  "review",
  "revision",
  "completed",
  "cancelled",
];

const row = (over: Record<string, unknown> = {}) => ({
  id: 7,
  title: "Launch teaser",
  description: "A 15 second cut",
  project_type: "music_video",
  genre: "Hip Hop",
  budget: "500.00",
  currency: "USD",
  deadline: "2026-12-01",
  status: "open",
  priority: "normal",
  client_id: 5,
  claimed_by: null,
  client_name: "Casey",
  videaste_name: null,
  ...over,
});

const deliverable = (id: number, version: number): VersaVidsDeliverable => ({
  id,
  title: `Cut v${version}`,
  description: null,
  fileUrl: "https://vimeo.com/1",
  version,
  status: "submitted",
  clientFeedback: null,
});

const project = (over: Partial<VersaVidsProject> = {}): VersaVidsProject => ({
  ...parseProjects({ success: true, projects: [row()] })[0],
  ...over,
});

test("projects are read from the API shape, defensively", () => {
  const [p] = parseProjects({ success: true, projects: [row()] });
  assert.equal(p.id, 7);
  assert.equal(p.title, "Launch teaser");
  assert.equal(p.budget, 500, "DECIMAL columns arrive as strings");
  assert.equal(p.clientId, 5);
  assert.equal(p.claimedBy, null);
  assert.equal(p.clientName, "Casey");

  for (const bad of [
    null,
    undefined,
    "x",
    [],
    {},
    { success: false, projects: [row()] },
    { success: true },
    { success: true, projects: "no" },
  ]) {
    assert.deepEqual(parseProjects(bad), [], JSON.stringify(bad));
  }
});

test("rows that cannot be shown are dropped, not rendered", () => {
  const projects = parseProjects({
    success: true,
    projects: [
      row({ id: "abc" }),
      row({ id: 0 }),
      row({ title: "   " }),
      null,
      3,
      row({ id: "12", claimed_by: "9" }),
    ],
  });
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, 12);
  assert.equal(projects[0].claimedBy, 9);
  const [free] = parseProjects({
    success: true,
    projects: [row({ budget: "0.00" })],
  });
  assert.equal(free.budget, null, "no budget is shown as no budget");
});

test("a project detail keeps only safe delivery links, newest version first", () => {
  const detail = parseProjectDetail({
    success: true,
    project: row({ status: "review", claimed_by: 9 }),
    brief: {
      aspect_ratio: "16:9",
      resolution: "1080p",
      visual_style: "Cinematic",
      deliverable_formats: ["MP4", 3, "MOV"],
    },
    deliverables: [
      {
        id: 1,
        title: "Cut v1",
        file_url: "https://vimeo.com/1",
        version: 1,
        status: "revision_requested",
        client_feedback: "Shorter please",
      },
      {
        id: 2,
        title: "Cut v2",
        file_url: "javascript:alert(document.cookie)",
        version: 2,
        status: "submitted",
      },
    ],
    license: null,
  });
  assert.ok(detail);
  assert.deepEqual(
    detail.deliverables.map((d) => d.version),
    [2, 1],
  );
  assert.equal(
    detail.deliverables[0].fileUrl,
    null,
    "a javascript: link is never turned into a clickable link",
  );
  assert.equal(detail.deliverables[1].fileUrl, "https://vimeo.com/1");
  assert.equal(detail.deliverables[1].clientFeedback, "Shorter please");
  assert.deepEqual(detail.brief, {
    aspectRatio: "16:9",
    resolution: "1080p",
    visualStyle: "Cinematic",
    formats: ["MP4", "MOV"],
  });
});

test("a project detail without a brief or deliverables still works", () => {
  const detail = parseProjectDetail({
    success: true,
    project: row(),
    brief: null,
  });
  assert.ok(detail);
  assert.equal(detail.brief, null);
  assert.deepEqual(detail.deliverables, []);
  for (const bad of [
    null,
    {},
    { success: false, project: row() },
    { success: true, project: null },
    { success: true, project: { id: 1 } },
  ]) {
    assert.equal(parseProjectDetail(bad), null, JSON.stringify(bad));
  }
});

test("a user id is a positive whole number or nothing", () => {
  assert.equal(viewerIdOf("9"), 9);
  assert.equal(viewerIdOf(9), 9);
  for (const bad of ["abc", "9abc", "0", "-1", "", null, undefined, 1.5]) {
    assert.equal(viewerIdOf(bad), null, JSON.stringify(bad));
  }
});

test("the viewer is the client, the artist who took it, or neither", () => {
  const p = { clientId: 5, claimedBy: 9 };
  assert.equal(projectRole(p, 5), "client");
  assert.equal(projectRole(p, 9), "videaste");
  assert.equal(projectRole(p, 6), "other");
  assert.equal(projectRole(p, null), "other");
  assert.equal(
    projectRole({ clientId: null, claimedBy: null }, null),
    "other",
    "two missing ids are not a match",
  );
  assert.equal(projectRole({ clientId: 5, claimedBy: 5 }, 5), "client");
});

test("the client can walk away until work is delivered, and answers a delivery", () => {
  const expected: Record<string, string[]> = {
    open: ["cancel"],
    claimed: ["cancel"],
    in_progress: ["cancel"],
    review: ["review"],
    revision: ["cancel"],
    completed: [],
    cancelled: [],
  };
  for (const status of STATUSES) {
    const claimedBy = status === "open" ? null : 9;
    assert.deepEqual(
      projectActions(
        { clientId: 5, claimedBy, status },
        { id: 5, isArtist: false },
      ),
      expected[status],
      status,
    );
  }
});

test("the artist who took a project delivers until the client has answered", () => {
  const expected: Record<string, string[]> = {
    claimed: ["deliver"],
    in_progress: ["deliver"],
    review: [],
    revision: ["deliver"],
    completed: [],
    cancelled: [],
  };
  for (const [status, actions] of Object.entries(expected)) {
    assert.deepEqual(
      projectActions(
        { clientId: 5, claimedBy: 9, status },
        { id: 9, isArtist: true },
      ),
      actions,
      status,
    );
  }
});

test("only artists are offered an open project, and never their own", () => {
  const open = { clientId: 5, claimedBy: null, status: "open" };
  assert.deepEqual(projectActions(open, { id: 9, isArtist: true }), ["claim"]);
  assert.deepEqual(projectActions(open, { id: 6, isArtist: false }), []);
  assert.deepEqual(
    projectActions(open, { id: 5, isArtist: true }),
    ["cancel"],
    "an artist who posted the project cannot take it",
  );
  for (const status of STATUSES.filter((s) => s !== "open")) {
    assert.deepEqual(
      projectActions(
        { clientId: 5, claimedBy: 8, status },
        { id: 9, isArtist: true },
      ),
      [],
      `a third artist gets nothing once the project is ${status}`,
    );
  }
});

test("every state has a plain sentence for each viewer", () => {
  for (const role of ["client", "videaste", "other"] as const) {
    for (const status of STATUSES) {
      const hint = projectHint({ status, videasteName: "Jules" }, role);
      assert.ok(hint.trim().length > 0, `${role}/${status}`);
      assert.doesNotMatch(hint, /undefined|null|\[object/, hint);
    }
  }
  const claimed = { status: "claimed", videasteName: "Jules" };
  assert.match(projectHint(claimed, "client"), /Jules/);
  assert.match(
    projectHint({ status: "claimed", videasteName: null }, "client"),
    /The artist/,
  );
  assert.match(
    projectHint({ status: "review", videasteName: "Jules" }, "client"),
    /approve/i,
  );
  assert.match(
    projectHint({ status: "revision", videasteName: "Jules" }, "videaste"),
    /new version/i,
  );
});

test("status labels are readable, including unknown ones", () => {
  assert.equal(statusLabel("in_progress"), "In progress");
  assert.equal(statusLabel("review"), "Delivered");
  assert.equal(statusLabel("waiting_for_funds"), "waiting for funds");
  assert.equal(deliverableStatusLabel("submitted"), "Waiting for review");
  assert.equal(deliverableStatusLabel("approved"), "Approved");
  assert.equal(
    deliverableStatusLabel("revision_requested"),
    "Changes requested",
  );
  assert.equal(deliverableStatusLabel("on_hold"), "on hold");
});

test("the next delivery is one version above the latest", () => {
  assert.equal(latestDeliverable([]), null);
  assert.equal(nextVersion([]), 1);
  const list = [deliverable(3, 2), deliverable(1, 1), deliverable(2, 2)];
  assert.equal(latestDeliverable(list)?.id, 3, "highest version, then newest");
  assert.equal(latestDeliverable([...list].reverse())?.id, 3);
  assert.equal(nextVersion([deliverable(1, 1), deliverable(2, 2)]), 3);
});

test("an artist's board separates what they took from what is open", () => {
  const mine = project({ id: 1, status: "in_progress", claimedBy: 9 });
  const openOne = project({ id: 2, status: "open", clientId: 5 });
  const ownOpen = project({ id: 3, status: "open", clientId: 9 });
  const takenByOther = project({ id: 4, status: "claimed", claimedBy: 8 });
  const board = splitArtistBoard([mine, openOne, ownOpen, takenByOther], 9);
  assert.deepEqual(
    board.mine.map((p) => p.id),
    [1],
  );
  assert.deepEqual(
    board.open.map((p) => p.id),
    [2],
    "your own open project is not offered to you",
  );
});

test("a delivery needs a title and a real web link", () => {
  const good = checkDelivery({
    title: "  Final cut ",
    url: " HTTPS://Vimeo.com/123 ",
    notes: "  ",
  });
  assert.deepEqual(good, {
    ok: true,
    title: "Final cut",
    url: "https://vimeo.com/123",
    notes: null,
  });
  const withNotes = checkDelivery({
    title: "v2",
    url: "https://a.example/v",
    notes: " Louder mix ",
  });
  assert.equal(withNotes.ok && withNotes.notes, "Louder mix");

  const noTitle = checkDelivery({
    title: " ",
    url: "https://a.example",
    notes: "",
  });
  assert.equal(noTitle.ok, false);
  for (const url of [
    "",
    "javascript:alert(1)",
    "data:text/html,hi",
    "vimeo.com/123",
    "https://vimeo.com@evil.example/x",
  ]) {
    const result = checkDelivery({ title: "t", url, notes: "" });
    assert.equal(result.ok, false, url);
    assert.ok(!result.ok && /https:\/\//.test(result.error), url);
  }
  assert.equal(
    checkDelivery({
      title: "x".repeat(201),
      url: "https://a.example",
      notes: "",
    }).ok,
    false,
  );
  assert.equal(
    checkDelivery({
      title: "x".repeat(200),
      url: "https://a.example",
      notes: "",
    }).ok,
    true,
  );
  assert.equal(
    checkDelivery({
      title: "t",
      url: "https://a.example",
      notes: "n".repeat(2001),
    }).ok,
    false,
  );
});

test("a change request must say what to change", () => {
  assert.deepEqual(checkChangeRequest("  Shorter intro "), {
    ok: true,
    note: "Shorter intro",
  });
  assert.equal(checkChangeRequest("   ").ok, false);
  assert.equal(checkChangeRequest("n".repeat(2001)).ok, false);
});

test("a budget is plain money or empty", () => {
  assert.deepEqual(parseBudgetInput(""), { ok: true, value: null });
  assert.deepEqual(parseBudgetInput("  "), { ok: true, value: null });
  assert.deepEqual(parseBudgetInput("0"), { ok: true, value: null });
  assert.deepEqual(parseBudgetInput("500"), { ok: true, value: 500 });
  assert.deepEqual(parseBudgetInput("12.5"), { ok: true, value: 12.5 });
  assert.deepEqual(parseBudgetInput(".5"), { ok: true, value: 0.5 });
  assert.deepEqual(parseBudgetInput("1500,50"), { ok: true, value: 1500.5 });
  assert.deepEqual(parseBudgetInput("12.345"), { ok: true, value: 12.35 });
  assert.deepEqual(parseBudgetInput(String(BUDGET_MAX)), {
    ok: true,
    value: BUDGET_MAX,
  });
  for (const bad of [
    "abc",
    "-5",
    "+5",
    "1e3",
    "0x10",
    "1.2.3",
    "1,000.50",
    "NaN",
    "Infinity",
    "100000000",
  ]) {
    assert.equal(parseBudgetInput(bad).ok, false, bad);
  }
});

test("a budget is shown as money, without stray decimals", () => {
  assert.equal(formatBudget(null, "USD"), null);
  assert.equal(formatBudget(500, "USD"), "$500");
  assert.equal(formatBudget(12.5, "USD"), "$12.50");
  assert.equal(formatBudget(1500, "EUR"), "€1,500");
  assert.equal(
    formatBudget(12.5, "XX"),
    "12.5 XX",
    "an unknown currency code must not crash the page",
  );
});

test("a delivery link shows where it leads", () => {
  assert.equal(linkHost("https://www.vimeo.com/123"), "vimeo.com");
  assert.equal(
    linkHost("https://drive.google.com/file/d/x"),
    "drive.google.com",
  );
  assert.equal(linkHost("not a url"), "link");
});

test("a deadline keeps its calendar day in every time zone", () => {
  const before = process.env.TZ;
  try {
    for (const tz of ["America/Toronto", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = tz;
      assert.equal(
        formatDeadline("2026-12-01T00:00:00.000Z"),
        "Dec 1, 2026",
        tz,
      );
    }
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
  assert.equal(formatDeadline(null), null);
  assert.equal(formatDeadline("soon"), null);
});

test("only a plain address becomes a mailto link", () => {
  assert.equal(mailtoAddress("casey@example.com"), "casey@example.com");
  for (const bad of [
    null,
    "",
    "casey",
    "casey@example",
    "a@b.com?bcc=x@y.com",
    "a@b.com?subject=hi",
    "a@b.com&subject=x",
    "a b@c.com",
    "<a@b.com>",
    "a@b.com,c@d.com",
    "a@b.com#x",
  ]) {
    assert.equal(mailtoAddress(bad), null, String(bad));
  }
  const [shown] = parseProjects({
    success: true,
    projects: [row({ client_email: "casey@example.com" })],
  });
  assert.equal(shown.clientEmail, "casey@example.com");
  const [odd] = parseProjects({
    success: true,
    projects: [row({ client_email: "a@b.com?bcc=x@y.com" })],
  });
  assert.equal(odd.clientEmail, null);
  assert.equal(
    parseProjects({ success: true, projects: [row()] })[0].clientEmail,
    null,
  );
});

test("a resolution is sent as a short code the database accepts", () => {
  // Every option the studio offers must fit video_briefs.resolution VARCHAR(10).
  const offered = ["720p", "1080p", "2k", "4k", "6k"];
  assert.deepEqual(offered.map(resolutionCode), [
    "720p",
    "1080p",
    "2K",
    "4K",
    "6K",
  ]);
  for (const id of offered) {
    assert.ok(resolutionCode(id).length <= 10, id);
  }
  assert.equal(resolutionCode("a".repeat(40)).length, 10);
});

test("delivery formats have readable names", () => {
  assert.equal(formatLabel("mov"), "MOV / ProRes");
  assert.equal(formatLabel("png-seq"), "PNG sequence");
  assert.equal(formatLabel("prores"), "PRORES");
});

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const studioSource = () => source("../pages/music/versavids-studio.tsx");
const panelSource = () => source("../components/versavids-workflow.tsx");

test("the studio sends a project through authenticatedFetch, not a CSRF meta tag", () => {
  const src = studioSource();
  // No page ever renders this tag, so reading it sent an empty token and the
  // server refused every project with 403.
  assert.equal(
    /meta\[name=["']csrf-token["']\]/.test(src),
    false,
    "the studio reads a CSRF meta tag that no page renders",
  );
  assert.ok(
    /authenticatedFetch\(\s*["'`]\/api\/versavids\/projects["'`]/.test(src),
    "the studio must post projects through authenticatedFetch",
  );
});

test("the studio shows the projects panel to signed-in members", () => {
  assert.ok(
    /isAuthed[\s\S]{0,80}<VersaVidsWorkflow\b/.test(studioSource()),
    "without the panel nobody can take, deliver or review a project",
  );
});

test("the projects panel never handles a CSRF token itself", () => {
  const src = panelSource();
  assert.ok(
    /authenticatedFetch\(/.test(src),
    "the panel must call the API through authenticatedFetch",
  );
  assert.equal(
    /csrf/i.test(src),
    false,
    "authenticatedFetch adds the token: a hand-made header can be empty",
  );
});

test("the budget field opens the numeric keypad", () => {
  const src = studioSource();
  const start = src.indexOf('id="versavids-budget"');
  assert.ok(start > 0, "the budget input is missing");
  assert.ok(
    /inputMode="decimal"/.test(src.slice(start, start + 300)),
    "the budget input must set inputMode=decimal",
  );
});
