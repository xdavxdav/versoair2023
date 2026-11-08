import assert from "node:assert/strict";
import fs from "node:fs";
import test, { mock } from "node:test";
import PDFDocument from "pdfkit";
import { PDFParse } from "pdf-parse";
import { scriptPool, signIn, withRouter } from "../test-support/route-harness";
import {
  generateBusinessPDF,
  renderBusinessPDF,
} from "../services/pdf-generator";
import businessesRouter from "./businesses";

const BUSINESS = 5;
const owner = { id: 21, role: "user" };
const stranger = { id: 8, role: "user" };
const moderator = { id: 3, role: "moderator" };
const admin = { id: 1, role: "admin" };
const superuser = { id: 2, role: "superuser" };

const BASE_ROW = {
  id: BUSINESS,
  name: "Chez Ada",
  description: "Boulangerie artisanale",
  address: "12 rue des Lilas",
  phone: "+1 514 555 0101",
  email: "ada@chezada.example",
  website: "https://chezada.example",
  country_code: "CA",
  city_name: "Montréal",
  approval_status: "pending",
  created_at: "2026-03-04T10:15:00.000Z",
  category_name: "Food",
  submitted_by_name: "ada",
  approved_by_name: null as string | null,
};

interface Scenario {
  ownerId?: number;
  missing?: boolean;
  row?: Partial<typeof BASE_ROW>;
  readFails?: boolean;
}

function scriptedDb(scenario: Scenario = {}) {
  return scriptPool((sql) => {
    if (sql === "SELECT owner_id FROM businesses WHERE id = $1") {
      return {
        rows: scenario.missing
          ? []
          : [{ owner_id: scenario.ownerId ?? owner.id }],
      };
    }
    if (sql.startsWith("SELECT b.id, b.name, b.description, b.address")) {
      if (scenario.readFails)
        throw new Error("password authentication failed for secret-db-host");
      return {
        rows: scenario.missing ? [] : [{ ...BASE_ROW, ...scenario.row }],
      };
    }
    return undefined;
  });
}

const renderQueries = (db: ReturnType<typeof scriptedDb>) =>
  db.matching("SELECT b.id, b.name, b.description, b.address");

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(businessesRouter, fn);

async function download(
  origin: string,
  path: string,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${origin}${path}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: Buffer.from(await response.arrayBuffer()),
  };
}

const pdfPath = (id: number | string = BUSINESS) => `/api/businesses/${id}/pdf`;

/** The document's text, as a PDF viewer would show it. */
async function readPdf(bytes: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
    return {
      raw: result.text,
      text: result.text.replace(/\s+/g, " "),
      pages: result.total,
    };
  } finally {
    await parser.destroy();
  }
}

const jsonOf = (body: Buffer) => JSON.parse(body.toString("utf8"));

test("business PDF: a visitor is refused and nothing is read", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await download(origin, pdfPath());
    assert.equal(res.status, 401);
    assert.notEqual(res.headers.get("content-type"), "application/pdf");
  });
  assert.equal(db.log.length, 0);
});

test("business PDF: the owner gets a valid PDF built from the database", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(owner));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.match(
      res.headers.get("content-disposition") ?? "",
      /^attachment; filename="business-registration-Chez Ada\.pdf"/,
    );
    assert.equal(res.body.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.match(res.body.subarray(-8).toString("latin1"), /%%EOF/);

    const { text, pages } = await readPdf(res.body);
    assert.equal(pages, 1, "one page: the footer must not spill onto a second");
    for (const expected of [
      "Business Name: Chez Ada",
      "Category: Food",
      "Description: Boulangerie artisanale",
      "Address: 12 rue des Lilas",
      "City: Montréal",
      "Country: CA",
      "Phone: +1 514 555 0101",
      "Email: ada@chezada.example",
      "Website: https://chezada.example",
      "Submitted By: ada",
      "Reference ID: VA-BIZ-5",
    ]) {
      assert.ok(text.includes(expected), `missing "${expected}" in: ${text}`);
    }
  });
  assert.equal(renderQueries(db).length, 1);
  assert.deepEqual(renderQueries(db)[0].params, ["5"]);
  assert.equal(
    db.log.filter((entry) => /^(INSERT|UPDATE|DELETE)\b/.test(entry.sql))
      .length,
    0,
    "a download never writes",
  );
});

test("business PDF: it shows the real status, with the sign-off box only while pending", async () => {
  const cases = [
    {
      row: { approval_status: "pending" },
      has: [/PENDING APPROVAL/, /Approved \/ Rejected \(circle one\)/],
      // "#ó" is how the built-in font prints the hourglass emoji.
      lacks: [/Reviewed By/, /\bAPPROVED\b/, /\bREJECTED\b/, /#ó/],
    },
    {
      row: { approval_status: "approved", approved_by_name: "root" },
      has: [/\bAPPROVED\b/, /Reviewed By: root/],
      lacks: [/PENDING/, /circle one/, /\bREJECTED\b/],
    },
    {
      row: { approval_status: "rejected", approved_by_name: "root" },
      has: [/\bREJECTED\b/, /Reviewed By: root/],
      lacks: [/PENDING/, /circle one/, /\bAPPROVED\b/],
    },
    {
      // Anything unexpected falls back to the pending layout, whole.
      row: { approval_status: "constructor" },
      has: [/PENDING APPROVAL/, /circle one/],
      lacks: [/Reviewed By/],
    },
    {
      row: { approval_status: null as unknown as string },
      has: [/PENDING APPROVAL/],
      lacks: [/Reviewed By/],
    },
  ];

  // One scripted pool for the whole test; each case only changes the row.
  const scenario: Scenario = {};
  scriptedDb(scenario);
  for (const { row, has, lacks } of cases) {
    scenario.row = row;
    await serve(async (origin) => {
      const res = await download(origin, pdfPath(), signIn(owner));
      assert.equal(res.status, 200, JSON.stringify(row));
      const { text } = await readPdf(res.body);
      for (const pattern of has)
        assert.match(text, pattern, `${JSON.stringify(row)}: ${text}`);
      for (const pattern of lacks)
        assert.doesNotMatch(text, pattern, `${JSON.stringify(row)}: ${text}`);
    });
  }
});

test("business PDF: staff can download any business, a stranger cannot", async () => {
  const scenario: Scenario = { ownerId: owner.id };
  const db = scriptedDb(scenario);
  for (const staff of [admin, moderator, superuser]) {
    await serve(async (origin) => {
      const res = await download(origin, pdfPath(), signIn(staff));
      assert.equal(res.status, 200, staff.role);
      assert.equal(res.body.subarray(0, 5).toString("latin1"), "%PDF-");
    });
  }

  db.log.length = 0;
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(stranger));
    assert.equal(res.status, 403);
    assert.doesNotMatch(res.headers.get("content-type") ?? "", /pdf/);
    assert.deepEqual(jsonOf(res.body), {
      success: false,
      error: "You do not have access to this business",
    });
  });
  assert.equal(renderQueries(db).length, 0, "no document for a stranger");
});

test("business PDF: unknown and malformed ids are 404 and render nothing", async () => {
  const db = scriptedDb({ missing: true });
  await serve(async (origin) => {
    const headers = signIn(owner);

    const unknown = await download(origin, pdfPath(), headers);
    assert.equal(unknown.status, 404);
    assert.equal(jsonOf(unknown.body).error, "Business not found");
    assert.equal(renderQueries(db).length, 0);

    db.log.length = 0;
    for (const bad of ["abc", "0", "-1", "1.5", "99999999999", "5%20OR%201"]) {
      const res = await download(origin, pdfPath(bad), headers);
      assert.equal(res.status, 404, bad);
    }
    assert.equal(db.log.length, 0, "bad ids never reach the database");
  });
});

test("business PDF: it needs no stored file, so a redeploy cannot break it", async () => {
  const db = scriptedDb();
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(owner));
    assert.equal(res.status, 200);
  });
  assert.ok(
    db.log.every((entry) => !entry.sql.includes("pdf_path")),
    "the document is rendered, not read back from pdf_path",
  );
});

test("business PDF: a hostile business name cannot break the headers", async () => {
  const hostile = 'Evil"\r\nSet-Cookie: pwned=1 / ../../etc/passwd 北京 🍞';
  scriptedDb({ row: { name: hostile } });
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(owner));
    assert.equal(res.status, 200);
    const disposition = res.headers.get("content-disposition") ?? "";
    assert.match(disposition, /^attachment;/);
    assert.doesNotMatch(disposition, /[\r\n]/);
    assert.equal(res.headers.get("set-cookie"), null);
    assert.equal(res.body.subarray(0, 5).toString("latin1"), "%PDF-");
    const { text } = await readPdf(res.body);
    assert.match(text, /Evil/);
  });
});

test("business PDF: a very long description is capped and still renders", async () => {
  scriptedDb({ row: { description: "word ".repeat(5000) } });
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(owner));
    assert.equal(res.status, 200);
    const { text, pages } = await readPdf(res.body);
    assert.ok(text.includes("…"), "the cut is visible");
    assert.ok((text.match(/word/g) ?? []).length <= 400);
    assert.ok(pages <= 2, `${pages} pages`);
    assert.match(text, /Reference ID: VA-BIZ-5/, "later rows are not lost");
  });
});

test("business PDF: a wrapped value never runs into the row below it", async () => {
  const draw = PDFDocument.prototype.text;
  const calls: { y: number; bottom: number; x: number }[] = [];
  mock.method(PDFDocument.prototype, "text", function (
    this: any,
    ...args: any[]
  ) {
    const result = (draw as any).apply(this, args);
    calls.push({ x: args[1], y: args[2], bottom: this.y });
    return result;
  } as never);

  await renderBusinessPDF({
    id: BUSINESS,
    name: "Chez Ada",
    description: "lorem ipsum dolor sit amet ".repeat(30).trim(),
    approvalStatus: "approved",
  });

  const values = calls.filter((call) => call.x === 170);
  assert.ok(values.length >= 10, "the value column was drawn");
  const wrapped = values.filter((call) => call.bottom - call.y > 60);
  assert.equal(wrapped.length, 1, "the description wraps onto many lines");

  for (let i = 0; i < calls.length - 1; i++) {
    const [current, next] = [calls[i], calls[i + 1]];
    // A smaller y means a new page was started, which is fine.
    if (current.x === 170 && next.y > current.y) {
      assert.ok(
        next.y >= current.bottom - 0.01,
        `a row at y=${next.y} starts inside the value drawn at y=${current.y} (ends ${current.bottom})`,
      );
    }
  }
});

test("business PDF: a database failure does not leak", async () => {
  scriptedDb({ readFails: true });
  mock.method(console, "error", () => {});
  await serve(async (origin) => {
    const res = await download(origin, pdfPath(), signIn(owner));
    assert.equal(res.status, 500);
    assert.deepEqual(jsonOf(res.body), {
      success: false,
      error: "Failed to download PDF",
    });
    assert.ok(!res.body.toString("utf8").includes("secret-db-host"));
  });
});

test("generateBusinessPDF still writes a valid file for the submit route", async () => {
  const file = await generateBusinessPDF({
    id: 99,
    name: "Chez Ada",
    submittedBy: "ada",
  });
  try {
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-");
    const { text, pages } = await readPdf(bytes);
    assert.equal(pages, 1);
    assert.match(text, /PENDING APPROVAL/);
    assert.match(text, /Business Name: Chez Ada/);
  } finally {
    fs.rmSync(file, { force: true });
  }
});
