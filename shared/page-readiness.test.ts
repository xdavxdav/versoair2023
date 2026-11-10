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
  RELEASED_PAGE_PATHS,
} from "./page-readiness";

test("unfinished public pages start eligible and blocked for deployment", () => {
  assert.deepEqual(DEFAULT_PAGE_READINESS_CONFIG, {
    version: 9,
    eligiblePaths: LOCAL_PREVIEW_ONLY_PATHS,
    blockedPaths: LOCAL_PREVIEW_ONLY_PATHS,
  });
});

test("released pages (directory, categories, community pages) are no longer gated", () => {
  for (const path of RELEASED_PAGE_PATHS) {
    assert.equal(isLocalPreviewOnlyPath(path), false, `${path} should be open`);
    assert.equal(isLocalPreviewOnlyPath(`${path}/child`), false);
    assert.equal(isPageBlocked(path, DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), false);
    assert.equal(
      (LOCAL_PREVIEW_ONLY_PATHS as readonly string[]).includes(path),
      false,
    );
    assert.equal(isPageReadinessCandidate(path), true);
  }
});

test("migration releases the directory and category pages from a saved version 7 config", () => {
  const saved = {
    version: 7,
    eligiblePaths: [
      "/arcade",
      "/about",
      "/businesses-directory",
      "/commerce",
      "/hotellerie",
      "/batiment",
      "/automobile",
      "/finances",
      "/divertissement",
    ],
    blockedPaths: [
      "/arcade",
      "/businesses-directory",
      "/commerce",
      "/hotellerie",
      "/batiment",
      "/automobile",
      "/finances",
      "/divertissement",
    ],
  };
  const migrated = migratePageReadinessConfig(saved);
  assert.equal(migrated.version, 9);
  for (const path of RELEASED_PAGE_PATHS) {
    assert.equal(migrated.eligiblePaths.includes(path), false, `${path} still eligible`);
    assert.equal(migrated.blockedPaths.includes(path), false, `${path} still blocked`);
    assert.equal(isPageBlocked(path, migrated.blockedPaths), false);
  }
  assert.ok(migrated.eligiblePaths.includes("/about"));
  assert.deepEqual(
    new Set(migrated.blockedPaths),
    new Set(LOCAL_PREVIEW_ONLY_PATHS),
  );
  assert.deepEqual(migratePageReadinessConfig(migrated), migrated);
});

test("migration releases the community pages from a saved version 8 config", () => {
  const community = [
    "/get-involved",
    "/ong-culturelle",
    "/vheartz",
    "/vheatrz",
    "/artihuman-foundation",
    "/partners",
  ];
  const migrated = migratePageReadinessConfig({
    version: 8,
    eligiblePaths: [...community, "/arcade", "/programs", "/sponsorship", "/about"],
    blockedPaths: [...community, "/arcade", "/programs", "/sponsorship"],
  });
  assert.equal(migrated.version, 9);
  for (const path of community) {
    assert.equal(migrated.eligiblePaths.includes(path), false, `${path} still eligible`);
    assert.equal(migrated.blockedPaths.includes(path), false, `${path} still blocked`);
  }
  assert.deepEqual(
    new Set(migrated.blockedPaths),
    new Set(["/arcade", "/programs", "/sponsorship"]),
  );
  assert.deepEqual(migratePageReadinessConfig(migrated), migrated);
});

test("settings migration gates unfinished pages and removes the mistaken docs gate", () => {
  const migratedVersionOne = migratePageReadinessConfig({
    version: 1,
    eligiblePaths: ["/programs"],
    blockedPaths: ["/programs"],
  });
  assert.equal(migratedVersionOne.version, 9);
  assert.deepEqual(
    new Set(migratedVersionOne.eligiblePaths),
    new Set(LOCAL_PREVIEW_ONLY_PATHS),
  );
  assert.deepEqual(
    new Set(migratedVersionOne.blockedPaths),
    new Set(LOCAL_PREVIEW_ONLY_PATHS),
  );
  const migratedVersionThree = migratePageReadinessConfig({
    version: 3,
    eligiblePaths: ["/programs", "/docs", "/about"],
    blockedPaths: ["/programs", "/docs"],
  });
  assert.equal(migratedVersionThree.version, 9);
  assert.deepEqual(migratedVersionThree.eligiblePaths, [
    "/programs",
    "/about",
    ...LOCAL_PREVIEW_ONLY_PATHS.filter((path) => path !== "/programs"),
  ]);
  assert.deepEqual(
    new Set(migratedVersionThree.blockedPaths),
    new Set(LOCAL_PREVIEW_ONLY_PATHS),
  );
  assert.deepEqual(
    migratePageReadinessConfig({
      version: 5,
      eligiblePaths: ["/programs", "/vheartz", "/commerce", "/about"],
      blockedPaths: ["/programs", "/vheartz", "/commerce"],
    }),
    {
      version: 9,
      eligiblePaths: [
        "/programs",
        "/about",
        ...LOCAL_PREVIEW_ONLY_PATHS.filter((path) => path !== "/programs"),
      ],
      blockedPaths: [...new Set(["/programs", ...LOCAL_PREVIEW_ONLY_PATHS])],
    },
  );

  const migratedVersionSix = migratePageReadinessConfig({
    version: 6,
    eligiblePaths: ["/about"],
    blockedPaths: ["/about"],
  });
  assert.equal(migratedVersionSix.version, 9);
  assert.ok(migratedVersionSix.eligiblePaths.includes("/arcade"));
  assert.ok(migratedVersionSix.blockedPaths.includes("/arcade"));
});

test("a blocked page also blocks descendant routes but not similarly named siblings", () => {
  assert.equal(isPageBlocked("/get-involved", ["/get-involved"]), true);
  assert.equal(isPageBlocked("/get-involved/opportunities", ["/get-involved"]), true);
  assert.equal(isPageBlocked("/get-involved-old", ["/get-involved"]), false);
  assert.equal(isPageBlocked("/arcade", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), true);
  assert.equal(isPageBlocked("/arcade/matches/1", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), true);
  assert.equal(isPageBlocked("/programs/summer", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), true);
  assert.equal(isPageBlocked("/sponsorship", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), true);
  assert.equal(isPageBlocked("/vheartz", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), false);
  assert.equal(isPageBlocked("/vheatrz", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths), false);
  assert.equal(
    isPageBlocked("/artihuman-foundation", DEFAULT_PAGE_READINESS_CONFIG.blockedPaths),
    false,
  );
});

test("only known public routes can be marked eligible", () => {
  assert.equal(normalizePublicPagePath("/services/careers/"), "/services/careers");
  assert.equal(isPageReadinessCandidate("/get-involved"), true);
  assert.equal(isPageReadinessCandidate("/arcade"), true);
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

test("preview-only pages open only on a local development host", () => {
  assert.equal(isLocalDevelopmentHost("localhost"), true);
  assert.equal(isLocalDevelopmentHost("127.0.0.1"), true);
  assert.equal(isLocalDevelopmentHost("::1"), true);
  assert.equal(isLocalDevelopmentHost("versoair.com"), false);
  assert.equal(isLocalDevelopmentHost("192.168.1.20"), false);
  assert.equal(isLocalPreviewOnlyPath("/vheartz/team"), false);
  assert.equal(isLocalPreviewOnlyPath("/arcade/matches/1"), true);
  assert.equal(isLocalPreviewOnlyPath("/programs/summer"), true);
  assert.equal(isLocalPreviewOnlyPath("/about"), false);

  const configuredGates = [...LOCAL_PREVIEW_ONLY_PATHS, "/about"];
  assert.deepEqual(getEffectiveBlockedPaths(configuredGates, true), ["/about"]);
  assert.deepEqual(getEffectiveBlockedPaths(configuredGates, false), configuredGates);
});

test("production always forces local-preview-only pages to remain blocked", () => {
  const manuallyOpenedConfig = {
    version: 9,
    eligiblePaths: ["/programs", "/about"],
    blockedPaths: ["/about"],
  };
  assert.deepEqual(
    enforceProductionPreviewGates(manuallyOpenedConfig, true),
    {
      version: 9,
      eligiblePaths: ["/programs", "/about", "/arcade", "/sponsorship"],
      blockedPaths: ["/about", "/arcade", "/programs", "/sponsorship"],
    },
  );
  assert.deepEqual(
    enforceProductionPreviewGates(manuallyOpenedConfig, false),
    manuallyOpenedConfig,
  );
});
