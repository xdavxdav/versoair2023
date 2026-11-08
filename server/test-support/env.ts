// Must be imported before anything that imports server/db.ts, which reads
// DATABASE_URL and loads the developer's .env the first time it is evaluated.
// The database URL is unreachable on purpose: these tests never talk to a real
// database.
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET = "x".repeat(40);

// dotenv never overrides a variable that already exists, so blanking these here
// keeps a local .env from pointing tests at real mail, payment or Zapier accounts.
for (const name of [
  "SUPERADMIN_EMAIL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_ISSUING_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "ZAPIER_WEBHOOK_URL",
  "AUTOMATION_CALLBACK_TOKEN",
  "AUTOMATION_CALLBACK_TOKEN_PREVIOUS",
]) {
  process.env[name] = "";
}
process.env.AUTOMATION_OUTBOX_ENABLED = "false";
process.env.ONLINE_PAYMENTS_ENABLED = "false";
