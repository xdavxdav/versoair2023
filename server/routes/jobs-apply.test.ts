import assert from "node:assert/strict";
import test, { mock } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import {
  JOB_APPLICATIONS_DDL,
  RESUME_MAX_BYTES,
  cleanResumeName,
  decodeMultipartFileName,
  isGenuineResume,
  resumeFormatOf,
  resumeMimeOf,
} from "../utils/job-applications";
import jobsRouter from "./jobs";

// jobs.id and job_applications.id are UUID columns
const JOB = "3f2a8b9c-1d4e-4f5a-8b6c-7d8e9f0a1b2c";
const APPLICATION = "5d1c9e0a-7b3f-4c2d-9a8e-1f2b3c4d5e6f";

const applicant = { id: 7, role: "user" };
const postingOwner = { id: 21, role: "user" };
const stranger = { id: 8, role: "user" };
const admin = { id: 1, role: "admin" };
const superuser = { id: 2, role: "superuser" };

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

// The table is created on first use and then remembered for the life of the
// process, so this has to outlive a single test.
let tableCreated = false;

interface Scenario {
  /** null: the job does not exist */
  jobStatus?: string | null;
  /** This person already applied to this job. */
  duplicate?: boolean;
  insertFails?: boolean;
  /** The signed-in user owns the business that posted the job. */
  ownsPosting?: boolean;
  /** The row behind a CV download; undefined: no such application. */
  application?: Record<string, unknown>;
}

function scriptedDb(scenario: Scenario = {}) {
  const { jobStatus = "active" } = scenario;
  return scriptPool((sql) => {
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS job_applications")) {
      tableCreated = true;
      return undefined;
    }
    if (!/^(CREATE|ALTER)\b/.test(sql) && /\bjob_applications\b/.test(sql)) {
      assert.ok(
        tableCreated,
        `job_applications was used before it was created: ${sql}`,
      );
    }
    if (sql.startsWith("SELECT status FROM jobs WHERE id = $1")) {
      return { rows: jobStatus === null ? [] : [{ status: jobStatus }] };
    }
    if (
      sql.startsWith(
        "SELECT 1 FROM job_applications WHERE job_id = $1 AND applicant_id = $2",
      )
    ) {
      return { rows: scenario.duplicate ? [{ "?column?": 1 }] : [] };
    }
    if (sql.startsWith("INSERT INTO job_applications")) {
      if (scenario.insertFails)
        throw new Error("password authentication failed for secret-db-host");
      return { rows: [{ id: APPLICATION, status: "submitted" }] };
    }
    if (sql.startsWith("SELECT 1 FROM jobs j JOIN businesses b")) {
      return { rows: scenario.ownsPosting ? [{ one: 1 }] : [] };
    }
    if (sql.includes("a.resume_data")) {
      return { rows: scenario.application ? [scenario.application] : [] };
    }
    if (sql.includes("FROM job_applications WHERE job_id::text = $1")) {
      return {
        rows: [
          {
            id: APPLICATION,
            applicant_id: "7",
            applicant_name: "Ada Lovelace",
            applicant_email: "ada@example.com",
            status: "submitted",
            resume_name: "Ada CV.pdf",
            has_resume: true,
          },
        ],
      };
    }
    if (sql.includes("WHERE a.applicant_id = $1")) {
      return {
        rows: [
          {
            id: APPLICATION,
            job_id: JOB,
            status: "submitted",
            title: "Barista",
          },
        ],
      };
    }
    return undefined;
  });
}

type ScriptedDb = ReturnType<typeof scriptedDb>;

const writes = (db: ScriptedDb) =>
  db.log.filter((entry) => /^(INSERT|UPDATE|DELETE)\b/.test(entry.sql));

// The statements of the apply transaction in order, without their bodies.
const transaction = (db: ScriptedDb) =>
  db.log
    .map((entry) => entry.sql)
    .filter((sql) => /^(BEGIN|COMMIT|ROLLBACK|INSERT|UPDATE)\b/.test(sql))
    .map((sql) => sql.split(" ").slice(0, 3).join(" "));

async function postForm(
  origin: string,
  path: string,
  form: FormData,
  headers: Record<string, string>,
) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, text };
}

function resumeForm(
  file: { name: string; content: Buffer | string; type?: string },
  fields: Record<string, string> = { applicant_email: "ada@example.com" },
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append(
    "resume",
    new Blob([new Uint8Array(Buffer.from(file.content))], {
      type: file.type ?? "application/octet-stream",
    }),
    file.name,
  );
  return form;
}

async function download(
  origin: string,
  path: string,
  headers: Record<string, string>,
) {
  const response = await fetch(`${origin}${path}`, {
    headers,
    signal: AbortSignal.timeout(3000),
  });
  return {
    status: response.status,
    headers: response.headers,
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

const storedResume = {
  applicant_id: "7",
  owner_id: 21,
  resume_name: "Ada CV.pdf",
  resume_mime: "application/pdf",
  resume_data: PDF,
};
const RESUME_PATH = `/${JOB}/applications/${APPLICATION}/resume`;

test("applying, listing applicants and reading a CV need a signed-in user", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const apply = await call(origin, "POST", `/${JOB}/apply`, {
      body: { applicant_email: "ada@example.com" },
    });
    assert.equal(apply.status, 401);
    assert.equal(
      (await call(origin, "GET", `/${JOB}/applications`)).status,
      401,
    );
    assert.equal((await call(origin, "GET", RESUME_PATH)).status, 401);
    assert.equal((await call(origin, "GET", "/my-applications")).status, 401);
  });
  assert.equal(db.log.length, 0, "nothing was read or written");
  assert.equal(db.connections, 0);
});

test("job and application ids are UUIDs: any other shape is a 404 before a query runs", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const headers = signIn(applicant);
    for (const id of ["1", "abc", "x' OR '1'='1"]) {
      const encoded = encodeURIComponent(id);
      const attempts = [
        call(origin, "POST", `/${encoded}/apply`, { headers, body: {} }),
        call(origin, "GET", `/${encoded}/applications`, { headers }),
        call(origin, "GET", `/${JOB}/applications/${encoded}/resume`, {
          headers,
        }),
      ];
      for (const attempt of attempts) {
        assert.equal((await attempt).status, 404, id);
      }
    }
  });
  assert.equal(db.log.length, 0);
});

test("applying stores one application for the signed-in user, whatever the body claims", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: {
        applicant_id: 99,
        user_id: 99,
        applicant_name: "  Ada Lovelace ",
        applicant_email: "ada@example.com",
        applicant_phone: "+1 555 0100",
        linkedin: "https://linkedin.com/in/ada",
        cover_letter: "Hello",
        resume_url: "https://example.com/cv.pdf",
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.equal(res.body.jobId, JOB);
    assert.equal(res.body.applicationId, APPLICATION);
    assert.equal(res.body.resumeSaved, false);
  });

  const [insert] = db.matching("INSERT INTO job_applications");
  assert.match(insert.sql, /RETURNING id, status/);
  assert.deepEqual(insert.params, [
    JOB,
    "7",
    "Ada Lovelace",
    "ada@example.com",
    "Hello",
    "https://example.com/cv.pdf",
    null,
    null,
    null,
    "Phone: +1 555 0100\nLinkedIn: https://linkedin.com/in/ada",
  ]);
  assert.deepEqual(transaction(db), [
    "BEGIN",
    "INSERT INTO job_applications",
    "UPDATE jobs SET",
    "COMMIT",
  ]);
  assert.deepEqual(
    db.matching("pg_advisory_xact_lock")[0].params,
    [JOB, "7"],
  );
  assert.deepEqual(db.matching("UPDATE jobs SET")[0].params, [JOB]);
  assert.equal(db.connections, 1);
  assert.equal(db.released, 1);
});

test("only a web link is kept as a CV link", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const headers = signIn(applicant);
    for (const resume_url of [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "cv.pdf",
    ]) {
      const res = await call(origin, "POST", `/${JOB}/apply`, {
        headers,
        body: { applicant_email: "ada@example.com", resume_url },
      });
      assert.equal(res.status, 200, resume_url);
    }
  });
  for (const insert of db.matching("INSERT INTO job_applications")) {
    assert.equal(insert.params[5], null);
  }
});

test("the account's email is used when the form sends none, and a malformed one is refused", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const ok = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn({ ...applicant, email: "seven@example.com" }),
      body: { applicant_name: "Ada" },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));

    const refused = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: { applicant_email: "not-an-email" },
    });
    assert.equal(refused.status, 400);
    assert.match(refused.body.error, /valid email/);
  });
  const inserts = db.matching("INSERT INTO job_applications");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].params[3], "seven@example.com");
});

test("applying to a job that does not exist is a 404 and stores nothing", async () => {
  const db = scriptedDb({ jobStatus: null });
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: { applicant_email: "ada@example.com" },
    });
    assert.equal(res.status, 404);
  });
  assert.equal(writes(db).length, 0);
  assert.equal(db.connections, 0);
});

test("a closed position refuses applications", async () => {
  const db = scriptedDb({ jobStatus: "closed" });
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: { applicant_email: "ada@example.com" },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "JOB_CLOSED");
  });
  assert.equal(writes(db).length, 0);
  assert.equal(db.connections, 0);
});

test("applying twice to the same job is a 409 and does not count twice", async () => {
  const db = scriptedDb({ duplicate: true });
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: { applicant_email: "ada@example.com" },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "ALREADY_APPLIED");
  });
  assert.deepEqual(transaction(db), [
    "BEGIN",
    "COMMIT",
  ]);
  assert.equal(db.matching("INSERT INTO job_applications").length, 0);
  assert.equal(db.matching("UPDATE jobs SET").length, 0);
  assert.equal(db.released, 1);
});

test("a database failure rolls back, frees the connection and reveals nothing", async () => {
  mock.method(console, "error", () => undefined);
  const db = scriptedDb({ insertFails: true });
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "POST", `/${JOB}/apply`, {
      headers: signIn(applicant),
      body: { applicant_email: "ada@example.com" },
    });
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, {
      success: false,
      error: "Failed to submit application",
    });
    assert.ok(!res.text.includes("secret-db-host"));
  });
  assert.deepEqual(transaction(db), [
    "BEGIN",
    "INSERT INTO job_applications",
    "ROLLBACK",
  ]);
  assert.equal(db.released, 1);
});

test("a CV sent as a file is stored with the application, typed by its format", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const res = await postForm(
      origin,
      `/${JOB}/apply`,
      resumeForm(
        { name: "Ada CV.pdf", content: PDF, type: "text/html" },
        { applicant_email: "ada@example.com", applicant_name: "Ada" },
      ),
      signIn(applicant),
    );
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.resumeSaved, true);
    assert.equal(res.body.applicationId, APPLICATION);
  });

  const [insert] = db.matching("INSERT INTO job_applications");
  assert.equal(insert.params[1], "7");
  assert.equal(insert.params[2], "Ada");
  assert.equal(insert.params[6], "Ada CV.pdf");
  assert.equal(
    insert.params[7],
    "application/pdf",
    "the client's type is not trusted",
  );
  assert.ok(Buffer.isBuffer(insert.params[8]));
  assert.ok((insert.params[8] as Buffer).equals(PDF));
});

test("an accented CV filename remains readable after multipart upload", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const res = await postForm(
      origin,
      `/${JOB}/apply`,
      resumeForm({ name: "CV Hélène Côté.pdf", content: PDF }),
      signIn(applicant),
    );
    assert.equal(res.status, 200, res.text);
  });

  const [insert] = db.matching("INSERT INTO job_applications");
  assert.equal(insert.params[6], "CV Hélène Côté.pdf");
});

test("a file that is not really a PDF, DOC or DOCX is refused before anything is stored", async () => {
  const db = scriptedDb();
  const cases = [
    { name: "cv.pdf", content: "<script>alert(1)</script>" },
    { name: "cv.docx", content: PDF },
    { name: "cv.exe", content: "MZ\x90\x00 not a resume" },
    { name: "cv.pdf.exe", content: PDF },
    { name: "cv", content: PDF },
    { name: "cv.pdf", content: "%PDF" },
  ];
  await withRouter(jobsRouter, async (origin) => {
    const headers = signIn(applicant);
    for (const file of cases) {
      const res = await postForm(
        origin,
        `/${JOB}/apply`,
        resumeForm(file),
        headers,
      );
      assert.equal(res.status, 400, `${file.name}: ${res.text}`);
      assert.match(res.body.error, /PDF, DOC or DOCX/);
    }
  });
  assert.equal(writes(db).length, 0);
  assert.equal(db.connections, 0);
});

test("a CV above the size limit is a 413 and stores nothing", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const tooBig = Buffer.concat([PDF, Buffer.alloc(RESUME_MAX_BYTES)]);
    const res = await postForm(
      origin,
      `/${JOB}/apply`,
      resumeForm({ name: "big.pdf", content: tooBig }),
      signIn(applicant),
    );
    assert.equal(res.status, 413, res.text);
    assert.match(res.body.error, /5 MB/);
  });
  assert.equal(writes(db).length, 0);
  assert.equal(db.connections, 0);
});

test("a form that cannot be read is a 400, not a hang or a crash", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const response = await fetch(`${origin}/${JOB}/apply`, {
      method: "POST",
      headers: { ...signIn(applicant), "Content-Type": "multipart/form-data" },
      body: "this is not multipart",
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, 400);
  });
  assert.equal(writes(db).length, 0);
});

test("a CV is private to its applicant, the posting's owner and the team", async () => {
  const db = scriptedDb({ application: storedResume });
  await withRouter(jobsRouter, async (origin) => {
    const allowed = [
      ["applicant", applicant],
      ["posting owner", postingOwner],
      ["admin", admin],
      ["superuser", superuser],
    ] as const;
    for (const [who, account] of allowed) {
      const res = await download(origin, RESUME_PATH, signIn(account));
      assert.equal(res.status, 200, who);
      assert.ok(res.bytes.equals(PDF), `${who} gets the exact bytes`);
      assert.equal(res.headers.get("content-type"), "application/pdf");
      assert.equal(
        res.headers.get("content-disposition"),
        `attachment; filename="Ada CV.pdf"; filename*=UTF-8''Ada%20CV.pdf`,
      );
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("cache-control"), "private, no-store");
    }

    const other = await download(origin, RESUME_PATH, signIn(stranger));
    assert.equal(other.status, 404);
    assert.ok(!other.bytes.toString("latin1").includes("%PDF"));
  });
  assert.deepEqual(db.matching("a.resume_data")[0].params, [APPLICATION, JOB]);
});

test("a posting without a business has no owner who could read its CVs", async () => {
  scriptedDb({ application: { ...storedResume, owner_id: null } });
  await withRouter(jobsRouter, async (origin) => {
    const res = await download(origin, RESUME_PATH, signIn(stranger));
    assert.equal(res.status, 404);
    const own = await download(origin, RESUME_PATH, signIn(applicant));
    assert.equal(own.status, 200);
  });
});

test("an application without a stored CV, or one that does not exist, is a 404", async () => {
  const scenario: Scenario = {
    application: { ...storedResume, resume_data: null },
  };
  scriptedDb(scenario);
  await withRouter(jobsRouter, async (origin) => {
    const linkOnly = await download(origin, RESUME_PATH, signIn(applicant));
    assert.equal(linkOnly.status, 404);

    scenario.application = undefined;
    const missing = await download(origin, RESUME_PATH, signIn(admin));
    assert.equal(missing.status, 404);
  });
});

test("a hostile or accented file name cannot break the download headers", async () => {
  const scenario: Scenario = {
    application: { ...storedResume, resume_name: 'a"b\r\nX-Injected: 1.pdf' },
  };
  scriptedDb(scenario);
  await withRouter(jobsRouter, async (origin) => {
    const hostile = await download(origin, RESUME_PATH, signIn(applicant));
    assert.equal(hostile.status, 200);
    assert.equal(hostile.headers.get("x-injected"), null);
    assert.equal(
      hostile.headers.get("content-disposition"),
      `attachment; filename="abX-Injected: 1.pdf"; filename*=UTF-8''abX-Injected%3A%201.pdf`,
    );

    scenario.application = {
      ...storedResume,
      resume_name: "Résumé d'Ada.pdf",
    };
    const accented = await download(origin, RESUME_PATH, signIn(applicant));
    assert.equal(accented.status, 200);
    assert.equal(
      accented.headers.get("content-disposition"),
      `attachment; filename="R_sum_ d'Ada.pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9%20d%27Ada.pdf`,
    );
  });
});

test("applicants are listed for the posting's owner and the team, without the CV bytes", async () => {
  const db = scriptedDb({ ownsPosting: true });
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "GET", `/${JOB}/applications`, {
      headers: signIn(postingOwner),
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.applications.length, 1);
    assert.equal(res.body.applications[0].has_resume, true);
    assert.ok(!("resume_data" in res.body.applications[0]));
  });
  const [ownerLookup] = db.matching("SELECT 1 FROM jobs j JOIN businesses b");
  assert.deepEqual(ownerLookup.params, [JOB, 21]);
  const [read] = db.matching("FROM job_applications WHERE job_id::text = $1");
  assert.deepEqual(read.params, [JOB]);
  assert.ok(
    !/\bresume_data\b(?! IS NOT NULL)/.test(read.sql),
    "the CV bytes are never selected for a list",
  );
});

test("someone who does not own the posting cannot list its applicants; the team can", async () => {
  const db = scriptedDb({ ownsPosting: false });
  await withRouter(jobsRouter, async (origin) => {
    const refused = await call(origin, "GET", `/${JOB}/applications`, {
      headers: signIn(stranger),
    });
    assert.equal(refused.status, 404);
    assert.equal(
      db.matching("FROM job_applications WHERE job_id::text = $1").length,
      0,
      "the applicants were never read for them",
    );

    const team = await call(origin, "GET", `/${JOB}/applications`, {
      headers: signIn(admin),
    });
    assert.equal(team.status, 200, JSON.stringify(team.body));
    assert.equal(
      db.matching("FROM job_applications WHERE job_id::text = $1").length,
      1,
    );
  });
});

test("my applications are matched on the signed-in user's id and nothing else", async () => {
  const db = scriptedDb();
  await withRouter(jobsRouter, async (origin) => {
    const res = await call(origin, "GET", "/my-applications", {
      headers: signIn(applicant),
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.applications.length, 1);
  });
  const [read] = db.matching("WHERE a.applicant_id = $1");
  assert.deepEqual(read.params, ["7"]);
  assert.ok(
    !/applicant_email/.test(read.sql),
    "an email address must not claim someone else's application",
  );
});

test("the table stores applications and CVs and indexes applicant lookups", () => {
  const ddl = JOB_APPLICATIONS_DDL.join("\n").replace(/\s+/g, " ");
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS job_applications/);
  assert.match(ddl, /job_id UUID REFERENCES jobs\(id\) ON DELETE CASCADE/);
  assert.match(ddl, /ADD COLUMN IF NOT EXISTS resume_data BYTEA/);
  assert.match(
    ddl,
    /CREATE INDEX IF NOT EXISTS job_applications_job_applicant_idx ON job_applications \(job_id, applicant_id\)/,
  );
});

test("a CV must carry the signature of the format its name claims", () => {
  assert.equal(resumeFormatOf("cv.PDF"), "pdf");
  assert.equal(resumeFormatOf("cv.doc"), "doc");
  assert.equal(resumeFormatOf("cv.docx"), "docx");
  for (const name of ["cv", "cv.html", "cv.pdf.exe", "cv.pdf "]) {
    assert.equal(resumeFormatOf(name), null, name);
  }

  assert.equal(isGenuineResume(PDF, "pdf"), true);
  assert.equal(isGenuineResume(PDF, "docx"), false);
  assert.equal(
    isGenuineResume(Buffer.from("%PDF"), "pdf"),
    false,
    "no content",
  );
  assert.equal(
    isGenuineResume(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), "docx"),
    true,
  );
  assert.equal(
    isGenuineResume(
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]),
      "doc",
    ),
    true,
  );
  assert.equal(resumeMimeOf("pdf"), "application/pdf");
  assert.equal(resumeMimeOf("doc"), "application/msword");
});

test("a CV's name is reduced to the file's own name", () => {
  assert.equal(cleanResumeName("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(cleanResumeName("C:\\Users\\Ada\\cv.pdf"), "cv.pdf");
  assert.equal(cleanResumeName('a"b\r\n.pdf'), "ab.pdf");
  assert.equal(cleanResumeName(""), "resume");
  assert.equal(cleanResumeName(`${"x".repeat(300)}.pdf`).length, 120);
});

test("multipart filename decoding fixes UTF-8 bytes interpreted as Latin-1", () => {
  assert.equal(
    decodeMultipartFileName("CV HÃ©lÃ¨ne CÃ´tÃ©.pdf"),
    "CV Hélène Côté.pdf",
  );
  assert.equal(
    decodeMultipartFileName("CV Hélène Côté.pdf"),
    "CV Hélène Côté.pdf",
  );
  assert.equal(decodeMultipartFileName("Ada CV.pdf"), "Ada CV.pdf");
});
