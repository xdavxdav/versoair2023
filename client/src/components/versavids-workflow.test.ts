import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseProjects } from "@/lib/versavids-workflow";
import VersaVidsWorkflow from "./versavids-workflow";

// tsx compiles JSX with the classic transform (Vite uses the automatic one),
// so the component's React.createElement calls need React in scope.
Object.assign(globalThis, { React });

const VIEWER = 5;
const STATUSES = [
  "open",
  "claimed",
  "in_progress",
  "review",
  "revision",
  "completed",
  "cancelled",
];

const row = (status: string, id: number) => ({
  id,
  title: `Project ${status}`,
  description: "A 15 second cut",
  project_type: "music_video",
  genre: "Hip Hop",
  budget: "500.00",
  currency: "USD",
  deadline: "2026-12-01",
  status,
  priority: "normal",
  client_id: VIEWER,
  claimed_by: null,
  client_name: "Casey",
  videaste_name: null,
});

// Renders the panel's first paint: the client tab, with the list already cached.
function render(options: { rows?: unknown[]; isArtist?: boolean } = {}) {
  const client = new QueryClient();
  if (options.rows) {
    client.setQueryData(
      ["versavids", "projects", "client", VIEWER],
      parseProjects({ success: true, projects: options.rows }),
    );
  }
  return renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(VersaVidsWorkflow, {
        viewerId: VIEWER,
        isArtist: options.isArtist ?? false,
      }),
    ),
  );
}

function expectIn(html: string, fragment: string | RegExp, shown: boolean) {
  const found =
    typeof fragment === "string"
      ? html.includes(fragment)
      : fragment.test(html);
  assert.equal(
    found,
    shown,
    `${shown ? "missing" : "unexpected"}: ${fragment}`,
  );
}

test("the panel tells the member that no payment happens on the site", () => {
  const html = render();
  expectIn(html, "My VersaVids projects", true);
  expectIn(html, "VersaVids does not handle payments", true);
});

test("the panel shows a status message while the projects load", () => {
  const html = render();
  expectIn(html, /role="status"[^>]*>[\s\S]*Loading your projects/, true);
});

test("a member without projects is told how to post one", () => {
  const html = render({ rows: [] });
  expectIn(html, "You have not posted a project yet.", true);
});

test("each project offers only the actions its status allows", () => {
  const html = render({ rows: STATUSES.map((s, i) => row(s, i + 1)) });

  for (const status of STATUSES) {
    const cancellable = ["open", "claimed", "in_progress", "revision"].includes(
      status,
    );
    expectIn(
      html,
      `aria-label="Cancel project: Project ${status}"`,
      cancellable,
    );
  }
  expectIn(html, 'aria-label="Review delivery: Project review"', true);
  expectIn(html, 'aria-label="Details: Project completed"', true);
  expectIn(html, "Take this project", false);
});

test("project titles are shielded from automatic page translation", () => {
  const html = render({ rows: [row("open", 1)] });
  expectIn(html, /<h4[^>]*translate="no"[^>]*>Project open<\/h4>/, true);
  expectIn(html, /Budget: <span translate="no"[^>]*>\$500<\/span>/, true);
});

test("only artists get the choice to view their projects as a videaste", () => {
  const member = render({ rows: [] });
  expectIn(member, "As videaste", false);

  const artist = render({ rows: [], isArtist: true });
  expectIn(artist, /aria-pressed="true"[^>]*>As client</, true);
  expectIn(artist, /aria-pressed="false"[^>]*>As videaste</, true);
});

test("the panel uses no native dropdown", () => {
  const html = render({
    rows: STATUSES.map((s, i) => row(s, i + 1)),
    isArtist: true,
  });
  expectIn(html, "<select", false);
});
