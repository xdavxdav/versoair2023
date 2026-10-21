import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_PREVIEW_ONLY_PATHS } from "@shared/page-readiness";
import { buildPagesSitemap, buildRobotsTxt } from "../services/sitemap";
import { PUBLIC_STATIC_ROUTES } from "./seo-routes";

test("localhost-only pages are excluded from the public sitemap and robots allowlist", () => {
  const sitemap = buildPagesSitemap("https://www.versoair.com");
  const robots = buildRobotsTxt("https://www.versoair.com");

  for (const path of LOCAL_PREVIEW_ONLY_PATHS) {
    assert.equal(
      PUBLIC_STATIC_ROUTES.some((route) => route.path === path),
      false,
      `${path} should not be listed as a public static route`,
    );
    assert.equal(sitemap.includes(`https://www.versoair.com${path}`), false);
    assert.equal(robots.includes(`Allow: ${path}`), false);
  }
});

test("public pages remain discoverable in the sitemap", () => {
  for (const path of [
    "/",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/marketing/journal",
    "/marketing/print",
    "/marketing/newsletters",
  ]) {
    assert.equal(
      PUBLIC_STATIC_ROUTES.some((route) => route.path === path),
      true,
      `${path} should remain a public static route`,
    );
  }
});
