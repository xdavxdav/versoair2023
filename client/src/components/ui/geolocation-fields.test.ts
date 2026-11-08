import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_TYPE_OPTIONS,
  getBusinessTypesForCategory,
} from "./geolocation-fields";

test("all business types remain selectable for every category", () => {
  const categories = [
    { id: 1, name: "Commerce", slug: "commerce" },
    { id: 2, name: "Health", slug: "health" },
  ];

  for (const category of categories) {
    const options = getBusinessTypesForCategory(categories, category.id);
    assert.deepEqual(
      options.map(({ value, disabled }) => [value, disabled]),
      BUSINESS_TYPE_OPTIONS.map(({ value }) => [value, false]),
    );
  }
});

test("all business types remain selectable when no category is selected", () => {
  const options = getBusinessTypesForCategory([], null);
  assert.equal(options.length, BUSINESS_TYPE_OPTIONS.length);
  assert.ok(options.every((option) => !option.disabled));
});
