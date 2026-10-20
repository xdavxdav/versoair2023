import assert from "node:assert/strict";
import test from "node:test";

import { isPayingListenerStreamSql } from "./royalty-sql.ts";

test("paying-listener review uses a paid plan active at stream time", () => {
  assert.match(isPayingListenerStreamSql, /ls\.status IN \('active', 'cancelled'\)/);
  assert.match(isPayingListenerStreamSql, /sp\.monthly_fee > 0/);
  assert.match(isPayingListenerStreamSql, /ls\.current_period_start IS NOT NULL/);
  assert.match(
    isPayingListenerStreamSql,
    /ls\.current_period_start <= se\.created_at/,
  );
  assert.match(isPayingListenerStreamSql, /ls\.current_period_end > se\.created_at/);
  assert.match(
    isPayingListenerStreamSql,
    /ls\.status = 'active' AND ls\.current_period_end IS NULL/,
  );
});
