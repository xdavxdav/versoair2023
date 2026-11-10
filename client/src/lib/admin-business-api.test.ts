import assert from "node:assert/strict";
import test from "node:test";
import {
  adminBusinessFailureMessage,
  readAdminBusinessResponse,
} from "./admin-business-api";

test("expired GeoAdmin access is explicit and asks admins to verify before retrying", () => {
  assert.match(
    adminBusinessFailureMessage(401, null, "create"),
    /access code.*check the business list before retrying/i,
  );
  assert.match(
    adminBusinessFailureMessage(401, null, "load"),
    /sign in again.*refresh the business list/i,
  );
});

test("validation errors preserve the server's actionable message", () => {
  assert.equal(
    adminBusinessFailureMessage(
      400,
      { error: { code: "CATEGORY_NOT_FOUND", message: "Category does not exist" } },
      "create",
    ),
    "Category does not exist",
  );
});

test("an ambiguous server failure warns before another create attempt", () => {
  assert.match(
    adminBusinessFailureMessage(502, null, "create"),
    /could not confirm the save.*check the business list before retrying/i,
  );
});

test("successful admin responses must be valid JSON success objects", async () => {
  const response = new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(await readAdminBusinessResponse(response, "load"), {
    success: true,
    data: [],
  });

  const invalidResponse = new Response("not json", { status: 200 });
  await assert.rejects(
    readAdminBusinessResponse(invalidResponse, "load"),
    /invalid business response/i,
  );
});
