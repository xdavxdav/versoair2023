import assert from "node:assert/strict";
import test from "node:test";

import { markNotificationReadStatement } from "./notification-queries.ts";

test("marking one notification read is constrained to its owner", () => {
  const statement = markNotificationReadStatement(
    "notice-123",
    42,
  );

  assert.match(statement.text, /WHERE id::text = \$1 AND user_id = \$2/);
  assert.deepEqual(statement.values, ["notice-123", 42]);
});
