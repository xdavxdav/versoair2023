import assert from "node:assert/strict";
import test from "node:test";
import { readFiche } from "@shared/fiche-technique";
import {
  applyHoursToWeekdays,
  ficheToForm,
  formToPayload,
} from "./fiche-editor-form";

test("an empty fiche becomes a blank form and an empty-but-valid payload", () => {
  const form = ficheToForm();
  assert.equal(form.services, "");
  assert.equal(form.opening_hours.monday, "");
  const payload = formToPayload(form);
  assert.equal(payload.sector, undefined);
  assert.deepEqual(payload.opening_hours, {});
  assert.deepEqual(payload.social_links, {});
  assert.deepEqual(readFiche(payload).errors, []);
});

test("saving what was loaded changes nothing", () => {
  const { value } = readFiche({
    sector: "restaurant",
    timezone: "America/Toronto",
    services: ["Catering", "Dine-in"],
    team: "Four cooks",
    kpis: [{ label: "Covers", value: "120" }],
    case_studies: [{ title: "Gala", summary: "400 guests" }],
    opening_hours: { monday: "09:00-17:00", sunday: "closed" },
    social_links: { instagram: "https://instagram.com/shop" },
  });
  const round = readFiche(formToPayload(ficheToForm(value)));
  assert.deepEqual(round.errors, []);
  assert.deepEqual(round.value, value);
});

test("one entry per line, blank lines and blank rows are dropped", () => {
  const form = ficheToForm();
  form.services = "  Catering \r\n\r\nDine-in\n   \n";
  form.kpis = [
    { label: "", value: "" },
    { label: "Covers", value: "120" },
  ];
  form.case_studies = [{ title: "", summary: "" }];
  form.opening_hours.friday = "  09:00-17:00 ";
  form.social_links.x = "  ";
  const payload = formToPayload(form);
  assert.deepEqual(payload.services, ["Catering", "Dine-in"]);
  assert.deepEqual(payload.kpis, [{ label: "Covers", value: "120" }]);
  assert.deepEqual(payload.case_studies, []);
  assert.deepEqual(payload.opening_hours, { friday: "09:00-17:00" });
  assert.deepEqual(payload.social_links, {});
});

test("a half-filled row is kept so the server can refuse it visibly", () => {
  const form = ficheToForm();
  form.kpis = [{ label: "Covers", value: "" }];
  const payload = formToPayload(form);
  assert.equal(payload.kpis.length, 1);
});

test("copying hours fills Monday to Friday and leaves the weekend alone", () => {
  const form = ficheToForm();
  form.opening_hours.monday = "09:00-17:00";
  form.opening_hours.saturday = "10:00-14:00";
  const next = applyHoursToWeekdays(form.opening_hours);
  for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"] as const) {
    assert.equal(next[day], "09:00-17:00");
  }
  assert.equal(next.saturday, "10:00-14:00");
  assert.equal(next.sunday, "");
});
