import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_LISTING_PRICE,
  firstListingError,
  listingStatus,
  validateListing,
} from "./listing-form";

const valid = {
  type: "villa",
  category: "sale",
  name: "Villa Riviera",
  city: "Abidjan",
  price: "15000000",
};

test("a complete listing has no errors", () => {
  assert.deepEqual(validateListing(valid), {});
  assert.equal(firstListingError({}), null);
});

test("an empty form names every required field, starting with the first on screen", () => {
  const errors = validateListing({
    type: "",
    category: "",
    name: "",
    city: "",
    price: "",
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "category",
    "city",
    "name",
    "price",
    "type",
  ]);
  assert.equal(firstListingError(errors), "type");
  assert.equal(firstListingError({ city: "x", price: "y" }), "city");
});

test("a blank title does not count as a title", () => {
  assert.ok(validateListing({ ...valid, name: "   " }).name);
});

test("the price must be a positive amount the database can store", () => {
  for (const price of ["abc", "0", "-5", "  "]) {
    assert.ok(validateListing({ ...valid, price }).price, `price "${price}"`);
  }
  assert.equal(validateListing({ ...valid, price: String(MAX_LISTING_PRICE) }).price, undefined);
  assert.ok(validateListing({ ...valid, price: String(MAX_LISTING_PRICE + 1) }).price);
});

test("only a listing the marketplace would show is labelled published", () => {
  assert.equal(listingStatus({ verified: true, verificationStatus: "verified" }), "published");
  assert.equal(listingStatus({ verified: false, verificationStatus: "unverified" }), "pending");
  assert.equal(listingStatus({ verified: false, verificationStatus: "pending_verification" }), "pending");
  assert.equal(listingStatus({ verified: true, verificationStatus: "unverified" }), "pending");
  assert.equal(listingStatus({ verified: null, verificationStatus: null }), "pending");
  assert.equal(listingStatus({ verified: false, verificationStatus: "rejected" }), "rejected");
});
