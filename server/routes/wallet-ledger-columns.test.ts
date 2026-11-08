import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// The live wallet_transactions table has `type` (not transaction_type), has no
// updated_at, and requires balance_before / balance_after. Writers that use the
// wrong names fail with Postgres 42703 / 23502 and the ledger silently stays
// empty, so keep every raw-SQL writer aligned with the real schema.

function serverFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) serverFiles(p, out);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

const FILES = serverFiles("server");

test("no server code references the non-existent transaction_type column", () => {
  const offenders = FILES.filter((f) =>
    /\btransaction_type\b/.test(readFileSync(f, "utf8")),
  );
  assert.deepEqual(offenders, []);
});

test("wallet_transactions has no updated_at column to write", () => {
  const offenders = FILES.filter((f) =>
    /UPDATE\s+wallet_transactions[^`"]*updated_at/i.test(
      readFileSync(f, "utf8"),
    ),
  );
  assert.deepEqual(offenders, []);
});

test("every raw INSERT into wallet_transactions sets the NOT NULL columns", () => {
  const required = [
    "wallet_id",
    "user_id",
    "type",
    "amount",
    "balance_before",
    "balance_after",
  ];
  const problems: string[] = [];
  for (const f of FILES) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(
      /INSERT\s+INTO\s+wallet_transactions\s*\(([^)]*)\)/gi,
    )) {
      const cols = m[1].split(",").map((c) => c.trim());
      for (const r of required) {
        if (!cols.includes(r)) problems.push(`${f}: missing ${r}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
