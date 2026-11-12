import assert from "node:assert/strict";
import test, { mock } from "node:test";

// The mailer only reaches the database on failure paths; point it at nothing.
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused";
process.env.SMTP_HOST = "smtp.test.invalid";
process.env.SMTP_USER = "mailer@example.test";
process.env.SMTP_PASS = "not-a-real-password";
process.env.SMTP_FROM = "VERSO Test <mailer@example.test>";
process.env.APP_PUBLIC_URL = "https://versoair.test";

type SentMail = { to: string; subject: string; html: string };

const { default: nodemailer } = await import("nodemailer");
const sent: SentMail[] = [];
mock.method(nodemailer, "createTransport", () => ({
  sendMail: async (options: SentMail) => {
    sent.push(options);
    return { messageId: "test-message" };
  },
}));

const { sendArtistApplicationAdminNotification, sendArtistApplicationConfirmation } =
  await import("./email-service");

const HOSTILE_NAME = `Mc<script>alert(1)</script> & "Co" <img src=x onerror=alert(2)>\r\nBcc: victim@example.test`;
const HOSTILE_EMAIL = `a"><b onmouseover=alert(3)>@example.test`;
const HOSTILE_GENRE = `<a href="https://evil.example">Afro</a>`;
const HOSTILE_COUNTRY = `Cote <i>d'Ivoire</i>`;

const RAW_FRAGMENTS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(2)>",
  "<b onmouseover=alert(3)>",
  `<a href="https://evil.example">`,
  "<i>d'Ivoire</i>",
];

function assertNothingRaw(html: string) {
  for (const fragment of RAW_FRAGMENTS) {
    assert.ok(!html.includes(fragment), `raw markup reached the email: ${fragment}`);
  }
}

test("artist application notice: every applicant-supplied field is escaped and the subject stays on one line", async () => {
  sent.length = 0;
  const delivered = await sendArtistApplicationAdminNotification({
    adminEmail: "admin-inbox@example.test",
    stageName: HOSTILE_NAME,
    applicantEmail: HOSTILE_EMAIL,
    applicationId: 42,
    genre: HOSTILE_GENRE,
    country: HOSTILE_COUNTRY,
  });
  assert.equal(delivered, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "admin-inbox@example.test");
  assert.doesNotMatch(sent[0].subject, /[\r\n]/);
  assertNothingRaw(sent[0].html);
  assert.ok(sent[0].html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(sent[0].html.includes("&lt;b onmouseover=alert(3)&gt;"));
  assert.ok(sent[0].html.includes("#42"));
});

test("artist application confirmation: the applicant-supplied name is escaped before it is mailed to the applicant's address", async () => {
  sent.length = 0;
  const delivered = await sendArtistApplicationConfirmation({
    toEmail: "someone-else@example.test",
    stageName: HOSTILE_NAME,
    applicationId: 43,
  });
  assert.equal(delivered, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "someone-else@example.test");
  assert.doesNotMatch(sent[0].subject, /[\r\n]/);
  assertNothingRaw(sent[0].html);
  assert.ok(sent[0].html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("artist application emails keep ordinary names readable: accents and ampersands survive, missing fields show a dash", async () => {
  sent.length = 0;
  await sendArtistApplicationAdminNotification({
    adminEmail: "admin-inbox@example.test",
    stageName: "Zoé & Fatou",
    applicantEmail: "zoe@example.test",
    applicationId: 44,
  });
  assert.equal(sent.length, 1);
  assert.ok(sent[0].html.includes("Zoé &amp; Fatou"));
  assert.ok(sent[0].html.includes("zoe@example.test"));
  assert.ok(sent[0].html.includes("—"));
  assert.ok(sent[0].subject.includes("Zoé & Fatou"), "the subject is plain text, not HTML");
});
