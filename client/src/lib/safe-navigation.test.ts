import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  handleBackClick,
  navigateBackSafely,
  type BackClickEvent,
} from "./safe-navigation";

const globals = globalThis as { window?: unknown };

function browser(historyLength: number, navigation?: { canGoBack: boolean }) {
  const calls = { back: 0, navigated: [] as string[] };
  globals.window = {
    history: {
      length: historyLength,
      back: () => {
        calls.back += 1;
      },
    },
    navigation,
  };
  return { calls, navigate: (path: string) => calls.navigated.push(path) };
}

afterEach(() => {
  delete globals.window;
});

test("goes back to the previous page when the browser has one", () => {
  const { calls, navigate } = browser(3);
  navigateBackSafely(navigate, "/dashboard");
  assert.deepEqual(calls, { back: 1, navigated: [] });
});

test("uses the fallback page when there is nothing to go back to", () => {
  const { calls, navigate } = browser(1);
  navigateBackSafely(navigate, "/dashboard");
  assert.deepEqual(calls, { back: 0, navigated: ["/dashboard"] });
});

test("trusts the Navigation API when the previous entry is another site", () => {
  const { calls, navigate } = browser(5, { canGoBack: false });
  navigateBackSafely(navigate);
  assert.deepEqual(calls, { back: 0, navigated: ["/"] });
});

test("goes back when the Navigation API reports an earlier entry", () => {
  const { calls, navigate } = browser(1, { canGoBack: true });
  navigateBackSafely(navigate);
  assert.deepEqual(calls, { back: 1, navigated: [] });
});

test("uses the fallback outside the browser", () => {
  const navigated: string[] = [];
  navigateBackSafely((path) => navigated.push(path), "/music");
  assert.deepEqual(navigated, ["/music"]);
});

function click(overrides: Partial<BackClickEvent> = {}) {
  let prevented = false;
  const event: BackClickEvent = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {
      prevented = true;
    },
    ...overrides,
  };
  return { event, wasPrevented: () => prevented };
}

test("a plain click on a back link goes back instead of following the link", () => {
  const { calls, navigate } = browser(2);
  const { event, wasPrevented } = click();
  handleBackClick(event, navigate, "/");
  assert.equal(wasPrevented(), true);
  assert.deepEqual(calls, { back: 1, navigated: [] });
});

const untouchedClicks: Record<string, Partial<BackClickEvent>> = {
  "ctrl-click": { ctrlKey: true },
  "cmd-click": { metaKey: true },
  "shift-click": { shiftKey: true },
  "alt-click": { altKey: true },
  "middle-click": { button: 1 },
  "an already handled click": { defaultPrevented: true },
};

for (const [name, overrides] of Object.entries(untouchedClicks)) {
  test(`${name} on a back link keeps the browser default`, () => {
    const { calls, navigate } = browser(2);
    const { event, wasPrevented } = click(overrides);
    handleBackClick(event, navigate, "/");
    assert.equal(wasPrevented(), false);
    assert.deepEqual(calls, { back: 0, navigated: [] });
  });
}

// Back controls must not be hard-wired to the home page.
const pagesWithBackLink = [
  "client/src/pages/aup.tsx",
  "client/src/pages/blog.tsx",
  "client/src/pages/community.tsx",
  "client/src/pages/cookies.tsx",
  "client/src/pages/gdpr.tsx",
  "client/src/pages/information.tsx",
  "client/src/pages/privacy.tsx",
  "client/src/pages/terms.tsx",
  "client/src/pages/help/account.tsx",
  "client/src/pages/help/delivery.tsx",
  "client/src/pages/help/guarantee.tsx",
  "client/src/pages/help/payments.tsx",
  "client/src/pages/help/product.tsx",
  "client/src/pages/help/returns.tsx",
];

for (const file of pagesWithBackLink) {
  test(`${file} does not send its Back control to the home page`, () => {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(
      src,
      /<Link\s+href="\/"[^>]*>(?:(?!<\/Link>)[\s\S])*?\b(?:Back|Retour)\b/,
    );
  });
}

for (const file of [
  "client/src/pages/marketplace.tsx",
  "client/src/pages/blog.tsx",
]) {
  test(`${file} gate goes back instead of straight home`, () => {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(
      src,
      /onBack=\{\(\) => (?:window\.location\.assign|setLocation|navigate)\("\/"\)\}/,
    );
  });
}
