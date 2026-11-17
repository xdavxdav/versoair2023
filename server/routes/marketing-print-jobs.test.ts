import assert from "node:assert/strict";
import test from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import { getTableColumns } from "drizzle-orm";
import { printJobs, users } from "@shared/schema";
import marketingRouter from "./marketing";

const customer = { id: 31, role: "user" };
const admin = { id: 1, role: "admin" };

const columnsOf = (table: Parameters<typeof getTableColumns>[0]) =>
  new Set(Object.values(getTableColumns(table)).map((column) => column.name));

const printJobColumns = columnsOf(printJobs);
const userColumns = columnsOf(users);

/** Columns a statement reads as `alias.column`, e.g. pj.print_product_id. */
const referenced = (sql: string, alias: string) =>
  [...sql.matchAll(new RegExp(`\\b${alias}\\.([a-z_]+)`, "g"))].map(
    (match) => match[1],
  );

// The production tables follow the Drizzle schema, so any column outside it
// would make the statement fail there with "column ... does not exist".
function assertReadsRealColumns(sql: string) {
  for (const column of referenced(sql, "pj")) {
    assert.ok(printJobColumns.has(column), `print_jobs has no "${column}"`);
  }
  for (const column of referenced(sql, "u")) {
    assert.ok(userColumns.has(column), `users has no "${column}"`);
  }
}

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(marketingRouter, fn);

test("lists the signed-in customer's print jobs using real columns", async () => {
  const db = scriptPool((sql) =>
    sql.includes("FROM print_jobs pj")
      ? {
          rows: [
            {
              id: 9,
              file_name: "poster.pdf",
              status: "pending",
              product_name: null,
              user_name: "ada",
            },
          ],
        }
      : undefined,
  );

  await serve(async (origin) => {
    const res = await call(origin, "GET", "/print/jobs", {
      headers: signIn(customer),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data[0].id, 9);
  });

  const [query] = db.matching("FROM print_jobs pj");
  assertReadsRealColumns(query.sql);
  assert.match(query.sql, /pj\.print_product_id = pp\.id/);
  assert.match(query.sql, /AND pj\.user_id = \$1/);
  assert.equal(String(query.params[0]), String(customer.id));
});

test("lets an admin list every print job", async () => {
  const db = scriptPool(() => undefined);

  await serve(async (origin) => {
    const res = await call(origin, "GET", "/print/jobs?status=printing", {
      headers: signIn(admin),
    });
    assert.equal(res.status, 200);
  });

  const [query] = db.matching("FROM print_jobs pj");
  assertReadsRealColumns(query.sql);
  assert.doesNotMatch(query.sql, /AND pj\.user_id = /);
  assert.match(query.sql, /pj\.status = \$1/);
});

test("builds the printshop queue from real columns", async () => {
  const db = scriptPool((sql) =>
    sql.includes("FROM print_jobs pj")
      ? {
          rows: [
            { id: 1, status: "pending", user_name: "ada" },
            { id: 2, status: "printing", user_name: "bo" },
          ],
        }
      : undefined,
  );

  await serve(async (origin) => {
    const res = await call(origin, "GET", "/printshop/queue", {
      headers: signIn(admin),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total_active, 2);
    assert.deepEqual(Object.keys(res.body.data.by_status).sort(), [
      "pending",
      "printing",
    ]);
  });

  const [query] = db.matching("FROM print_jobs pj");
  assertReadsRealColumns(query.sql);
  assert.match(query.sql, /pj\.print_product_id = pp\.id/);
});

test("saves a tracking number on the real tracking_number column", async () => {
  const db = scriptPool((sql) =>
    sql.startsWith("UPDATE print_jobs")
      ? { rows: [{ id: 4, status: "shipped", tracking_number: "1Z999" }] }
      : undefined,
  );

  await serve(async (origin) => {
    const res = await call(origin, "PATCH", "/print/jobs/4/status", {
      headers: signIn(admin),
      body: { status: "shipped", tracking_number: "1Z999" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.tracking_number, "1Z999");
  });

  const [update] = db.matching("UPDATE print_jobs");
  assert.ok(printJobColumns.has("tracking_number"));
  assert.match(update.sql, /tracking_number = \$2/);
  assert.deepEqual(update.params, ["shipped", "1Z999", 4]);
});

function pdfForm(productId?: string) {
  const form = new FormData();
  form.append(
    "file",
    new Blob(["%PDF-1.4 test"], { type: "application/pdf" }),
    "poster.pdf",
  );
  if (productId !== undefined) form.append("product_id", productId);
  return form;
}

const upload = (origin: string, form: FormData) =>
  fetch(`${origin}/print/upload`, {
    method: "POST",
    headers: signIn(customer),
    body: form,
    signal: AbortSignal.timeout(3000),
  });

function scriptedUpload(knownProductId?: number) {
  return scriptPool((sql, params) => {
    if (sql.startsWith("SELECT 1 FROM print_products")) {
      return { rows: params[0] === knownProductId ? [{ "?column?": 1 }] : [] };
    }
    if (sql.startsWith("INSERT INTO marketing_print_files")) {
      return { rows: [{ id: 77 }] };
    }
    if (sql.startsWith("INSERT INTO print_jobs")) {
      return { rows: [{ id: 5, status: "pending", file_name: "poster.pdf" }] };
    }
    return undefined;
  });
}

test("creates a print job with the real print_jobs columns", async () => {
  const db = scriptedUpload(3);

  await serve(async (origin) => {
    const res = await upload(origin, pdfForm("3"));
    const body: any = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.data.id, 5);
    assert.ok(Array.isArray(body.validation.basic));
  });

  const [insert] = db.matching("INSERT INTO print_jobs");
  const listed = /INSERT INTO print_jobs\s*\(([^)]*)\)/.exec(insert.sql)![1];
  const columns = listed.split(",").map((column) => column.trim());
  assert.deepEqual(columns, [
    "user_id",
    "print_product_id",
    "file_path",
    "file_name",
    "validation_report",
    "status",
  ]);
  for (const column of columns) {
    assert.ok(printJobColumns.has(column), `print_jobs has no "${column}"`);
  }

  const [userId, productId, filePath, fileName, report] = insert.params;
  assert.equal(String(userId), String(customer.id));
  assert.equal(productId, 3);
  assert.equal(filePath, "/api/marketing/print/files/77");
  assert.equal(fileName, "poster.pdf");
  const parsed = JSON.parse(report as string);
  assert.ok(Array.isArray(parsed.checks));
  assert.ok(parsed.checks.every((check: any) => check.status !== "fail"));
});

test("creates a print job without a product when none is chosen", async () => {
  const db = scriptedUpload();

  await serve(async (origin) => {
    const res = await upload(origin, pdfForm());
    assert.equal(res.status, 201);
  });

  assert.equal(db.matching("SELECT 1 FROM print_products").length, 0);
  assert.equal(db.matching("INSERT INTO print_jobs")[0].params[1], null);
});

test("rejects an unknown or malformed product before storing the file", async () => {
  const db = scriptedUpload(3);

  await serve(async (origin) => {
    const unknown = await upload(origin, pdfForm("99"));
    assert.equal(unknown.status, 400);
    assert.equal(
      ((await unknown.json()) as any).error,
      "Unknown print product",
    );

    const malformed = await upload(origin, pdfForm("abc"));
    assert.equal(malformed.status, 400);
  });

  assert.equal(db.matching("INSERT INTO").length, 0);
});
