import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PAGE_READINESS_CONFIG,
  enforceProductionPreviewGates,
  getEffectiveBlockedPaths,
  isPageBlocked,
  isLocalDevelopmentHost,
  isLocalPreviewOnlyPath,
  isPageReadinessCandidate,
  LOCAL_PREVIEW_ONLY_PATHS,
  migratePageReadinessConfig,
  normalizePublicPagePath,
} from "./page-readiness";

test("unfinished public pages start eligible and blocked for deployment", () => {
  assert.deepEqual(DEFAULT_PAGE_READINESS_CONFIG, {
    version: 6,
    eligiblePaths: LOCAL_PREVIEW_ONLY_PATHS,
    blockedPaths: LOCAL_PREVIEW_ONLY_PATHS,
  });
});

test("settings migration gates unfinished pages and removes the mistaken docs gate", () => {
  assert.deepEqual(
    migratePageReadinessConfig({
      version: 1,
      eligiblePaths: ["/get-involved"],
      blockedPaths: ["/get-involved"],
    }),
    DEFAULT_PAGE_READINESS_CONFIG,
  );
  assert.deepEqual(
    migratePageReadinessConfig({
      version: 3,
      eligiblePaths: ["/get-involved", "/docs", "/about"],
      blockedPaths: ["/get-involved", "/docs"],
    }),
    {
      version: 6,
      eligiblePaths: ["/get-involved", "/about", ...LOCAL_PREVIEW_ONLY_PATHS.slice(1)],
      blockedPaths: [...LOCAL_PREVIEW_ONLY_PATHS],
    },
  );
  assert.deepEqual(
    migratePageReadinessConfig({
      version: 5,
      eligiblePaths: ["/get-involved", "/vheartz", "/commerce", "/about"],
      blockedPaths: ["/get-involved", "/vheartz", "/commerce"],
    }),
    {
      version: 6,
      eligiblePaths: [
        "/get-involved",
        "/vheartz",
        "/commerce",
        "/about",
        ...LOCAL_PREVIEW_ONLY_PATHS.filter(
          (path) =>
            !["/get-involved", "/vheartz", "/commerce"].includes(path),
        ),
      ],
      blockedPaths: [...new Set(["/get-involved", "/vheartz", "/commerce", ...LOCAL_PREVIEW_ONLY_PATHS])],
    },
  );
});

test("a blocked page also blocks descendant routes but not similarly named siblings", () => {
  assert.equal(isPageBlocked("/get-involved", ["/get-involved"]), true);
  assert.equal(isPageBlocked("/get-involved/opportunities", ["/get-involved"]), true);
  assert.equal(isPageBlocked("/get-involved-old", ["/get-involved"]), false);
  assert.equal(isPageBlocked("/vheartz/future-programs", ["/vheartz"]), true);
  assert.equal(isPageBlocked("/vheatrz", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), true);
  assert.equal(
    isPageBlocked("/artihuman-foundation", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths),
    true,
  );
});

test("only known public routes can be marked eligible", () => {
  assert.equal(normalizePublicPagePath("/services/careers/"), "/services/careers");
  assert.equal(isPageReadinessCandidate("/get-involved"), true);
  assert.equal(isPageReadinessCandidate("/ong-culturelle"), true);
  assert.equal(isPageReadinessCandidate("/vheartz"), true);
  assert.equal(isPageReadinessCandidate("/vheatrz"), true);
  assert.equal(isPageReadinessCandidate("/artihuman-foundation"), true);
  assert.equal(isPageReadinessCandidate("/programs"), true);
  assert.equal(isPageReadinessCandidate("/partners"), true);
  assert.equal(isPageReadinessCandidate("/sponsorship"), true);
  for (const path of [
    "/businesses-directory",
    "/commerce",
    "/hotellerie",
    "/batiment",
    "/automobile",
    "/finances",
    "/divertissement",
  ]) {
    assert.equal(isPageReadinessCandidate(path), true);
  }
  assert.equal(isPageReadinessCandidate("/docs"), false);
  assert.equal(isPageReadinessCandidate("/not-a-page"), false);
  assert.equal(normalizePublicPagePath("/ADMIN/settings"), null);
  assert.equal(normalizePublicPagePath("/auth/signin"), null);
  assert.equal(normalizePublicPagePath("/foo?bar=baz"), null);
  assert.equal(normalizePublicPagePath("/"), null);
});

test("vHeartz preview pages open only on a local development host", () => {
  assert.equal(isLocalDevelopmentHost("localhost"), true);
  assert.equal(isLocalDevelopmentHost("127.0.0.1"), true);
  assert.equal(isLocalDevelopmentHost("::1"), true);
  assert.equal(isLocalDevelopmentHost("versoair.com"), false);
  assert.equal(isLocalDevelopmentHost("192.168.1.20"), false);
  assert.equal(isLocalPreviewOnlyPath("/vheartz/team"), true);
  assert.equal(isLocalPreviewOnlyPath("/commerce/offers"), true);
  assert.equal(isLocalPreviewOnlyPath("/about"), false);

  const configuredGates = [...LOCAL_PREVIEW_ONLY_PATHS, "/about"];
  assert.deepEqual(getEffectiveBlockedPaths(configuredGates, true), ["/about"]);
  assert.deepEqual(getEffectiveBlockedPaths(configuredGates, false), configuredGates);
});

test("production always forces local-preview-only pages to remain blocked", () => {
  const manuallyOpenedConfig = {
    version: 6,
    eligiblePaths: ["/vheartz", "/about"],
    blockedPaths: ["/about"],
  };
  assert.deepEqual(
    enforceProductionPreviewGates(manuallyOpenedConfig, true),
    {
      version: 6,
      eligiblePaths: [
        "/vheartz",
        "/about",
        "/get-involved",
        "/ong-culturelle",
        "/vheatrz",
        "/artihuman-foundation",
        "/programs",
        "/partners",
        "/sponsorship",
        "/businesses-directory",
        "/commerce",
        "/hotellerie",
        "/batiment",
        "/automobile",
        "/finances",
        "/divertissement",
      ],
      blockedPaths: [
        "/about",
        "/get-involved",
        "/ong-culturelle",
        "/vheartz",
        "/vheatrz",
        "/artihuman-foundation",
        "/programs",
        "/partners",
        "/sponsorship",
        "/businesses-directory",
        "/commerce",
        "/hotellerie",
        "/batiment",
        "/automobile",
        "/finances",
        "/divertissement",
      ],
    },
  );
  assert.deepEqual(
    enforceProductionPreviewGates(manuallyOpenedConfig, false),
    manuallyOpenedConfig,
  );
});
