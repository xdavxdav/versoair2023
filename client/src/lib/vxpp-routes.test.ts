import test from "node:test";
import assert from "node:assert/strict";
import {
  getVxppFallbackBack,
  getVxppSection,
  isVxppRoute,
  resolveVxppRoleServices,
} from "./vxpp-routes";

test("isVxppRoute matches unified vxpp sections and excludes unrelated portals", () => {
  for (const path of [
    "/vxpp",
    "/blog",
    "/profile",
    "/profile/settings",
    "/user/42",
    "/messages",
    "/communities",
    "/community",
    "/marketplace",
    "/services/careers",
    "/services/careers/dashboard",
    "/services/contractors",
    "/contracts",
  ]) {
    assert.equal(isVxppRoute(path), true, `Expected ${path} to be a vxpp route`);
  }

  for (const excluded of [
    "/",
    "/pricing",
    "/stream",
    "/arcade",
    "/geo-admin",
    "/businesses-directory",
    "/business/12",
    "/auth/signin",
    "/privacy",
  ]) {
    assert.equal(isVxppRoute(excluded), false, `Expected ${excluded} to stay outside vxpp shell`);
  }
});

test("getVxppSection maps each route to its active vxpp section", () => {
  assert.equal(getVxppSection("/blog"), "feed");
  assert.equal(getVxppSection("/vxpp"), "feed");
  assert.equal(getVxppSection("/communities"), "communities");
  assert.equal(getVxppSection("/community"), "communities");
  assert.equal(getVxppSection("/messages"), "messages");
  assert.equal(getVxppSection("/marketplace"), "marketplace");
  assert.equal(getVxppSection("/profile"), "profile");
  assert.equal(getVxppSection("/user/7"), "profile");
  assert.equal(getVxppSection("/services/careers"), "careers");
  assert.equal(getVxppSection("/services/contractors"), "contractors");
  assert.equal(getVxppSection("/contracts"), "contractors");
});

test("getVxppFallbackBack provides safe section-aware back targets", () => {
  assert.equal(getVxppFallbackBack("/user/15"), "/blog");
  assert.equal(getVxppFallbackBack("/profile/settings"), "/profile");
  assert.equal(getVxppFallbackBack("/services/careers/dashboard"), "/services/careers");
  assert.equal(getVxppFallbackBack("/contracts"), "/services/contractors");
});

test("resolveVxppRoleServices separates Contractors from Careers by account role", () => {
  // Contractor only -> sees Contractors, not Careers
  assert.deepEqual(
    resolveVxppRoleServices({ role: "contractor", isContractor: true, portals: ["general", "contractor"] }),
    {
      showCareers: false,
      showContractors: true,
      isEmployer: false,
      isContractor: true,
      mobileQuickService: "contractors",
    },
  );

  // General / job seeker -> sees Careers, not Contractors
  assert.deepEqual(
    resolveVxppRoleServices({ role: "user", accountType: "general", isContractor: false, portals: ["general"] }),
    {
      showCareers: true,
      showContractors: false,
      isEmployer: false,
      isContractor: false,
      mobileQuickService: "careers",
    },
  );

  // Business owner / employer -> sees Careers, not Contractors unless also a contractor
  assert.deepEqual(
    resolveVxppRoleServices({ role: "user", accountType: "business_owner", portals: ["general", "careers"] }),
    {
      showCareers: true,
      showContractors: false,
      isEmployer: true,
      isContractor: false,
      mobileQuickService: "careers",
    },
  );

  // Staff and guests -> can access both
  assert.equal(resolveVxppRoleServices(null).showCareers, true);
  assert.equal(resolveVxppRoleServices(null).showContractors, true);
  assert.equal(resolveVxppRoleServices({ role: "admin", isAdmin: true }).showCareers, true);
  assert.equal(resolveVxppRoleServices({ role: "admin", isAdmin: true }).showContractors, true);
});
