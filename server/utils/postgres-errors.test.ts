import assert from "node:assert/strict";
import test from "node:test";

import {
  getPostgresErrorDetails,
  isTransientDatabaseError,
  isUniqueConstraintViolation,
} from "./postgres-errors.ts";

test("extracts safe PostgreSQL diagnostics from a wrapped query error", () => {
  const postgresError = Object.assign(
    new Error('duplicate key value violates unique constraint "users_email_unique"'),
    {
      code: "23505",
      constraint: "users_email_unique",
      table: "users",
      detail: "Key (email)=(private@example.com) already exists.",
    },
  );
  const wrapped = Object.assign(new Error("Failed query with sensitive params"), {
    cause: postgresError,
  });

  assert.deepEqual(getPostgresErrorDetails(wrapped), {
    code: "23505",
    message:
      'duplicate key value violates unique constraint "users_email_unique"',
    constraint: "users_email_unique",
    table: "users",
  });
  assert.equal(
    isUniqueConstraintViolation(wrapped, "users_email_unique"),
    true,
  );
  assert.equal(
    isUniqueConstraintViolation(wrapped, "users_username_unique"),
    false,
  );
  assert.equal(
    isUniqueConstraintViolation(wrapped, [
      "users_email_unique",
      "users_email_key",
    ]),
    true,
  );
});

test("does not mistake arbitrary application errors for PostgreSQL errors", () => {
  assert.equal(
    getPostgresErrorDetails(new Error("request failed")),
    null,
  );
});

test("recognizes retryable PostgreSQL connection failures only", () => {
  assert.equal(
    isTransientDatabaseError(
      Object.assign(new Error("connection lost"), { code: "08006" }),
    ),
    true,
  );
  assert.equal(
    isTransientDatabaseError(
      Object.assign(new Error("duplicate"), { code: "23505" }),
    ),
    false,
  );
});
