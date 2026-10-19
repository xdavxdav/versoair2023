import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAdminPanelSection,
  canUseAdminPanel,
  DELEGATED_ADMIN_PANEL_SECTIONS,
  OWNER_ONLY_ADMIN_PANEL_SECTIONS,
} from "./admin-panel-access";

test("only the owner and invited Admins enter the Admin Panel", () => {
  assert.equal(canUseAdminPanel({ role: "admin" }, false), true);
  assert.equal(canUseAdminPanel({ role: "superuser" }, true), true);
  assert.equal(canUseAdminPanel({ role: "superuser" }, false), false);
  assert.equal(canUseAdminPanel({ role: "moderator" }, false), false);
  assert.equal(canUseAdminPanel({ role: "tsr" }, false), false);
  assert.equal(canUseAdminPanel({ role: "user" }, false), false);
});

test("invited Admins see delegated sections but never owner configuration", () => {
  for (const section of DELEGATED_ADMIN_PANEL_SECTIONS) {
    assert.equal(canAccessAdminPanelSection(section, false), true, section);
    assert.equal(canAccessAdminPanelSection(section, true), true, section);
  }
  for (const section of OWNER_ONLY_ADMIN_PANEL_SECTIONS) {
    assert.equal(canAccessAdminPanelSection(section, false), false, section);
    assert.equal(canAccessAdminPanelSection(section, true), true, section);
  }
  assert.equal(canAccessAdminPanelSection("database", false), false);
  assert.equal(canAccessAdminPanelSection("unknown", true), false);
});
