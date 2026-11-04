# Zapier automation: durable delivery and callbacks

Status: **foundation only, disabled by default.** Nothing here configures a Zap,
a mailbox or a production setting. With `AUTOMATION_OUTBOX_ENABLED` unset the
app behaves as before, with one difference: a contact message whose subject
names a pilot is sent as category `pilot_lead` instead of `contact` (see
"Categories and topics").

Automation supports the manual operation (listening sessions, artisan
onboarding, the pilot); it never replaces or blocks it. If Zapier or Zoho is
down, field work continues by hand.

## How it works

```
source event -> notifyZapier() -> automation_outbox -> dispatcher -> Zapier Catch Hook
                                                                         |
          claim / ack / health  <----- Zap (Authorization: Bearer) <-----+
```

1. A source route (contact form, artist application, event submission) calls
   `notifyZapier(category, payload)` as it always has.
2. **Flag off (default):** one fire-and-forget POST to `ZAPIER_WEBHOOK_URL`, in
   the same format as before (a pilot request carries category `pilot_lead`).
3. **Flag on:** the event is stored in `automation_outbox`. A background
   dispatcher posts it with a timeout and retries, and dead-letters it if
   Zapier never accepts it. If the database write itself fails, the event is
   posted directly as a last resort (one attempt, not tracked or retried).
4. The Zap confirms its work by calling back (`claim`, `ack`). The callbacks
   are what prove a workflow ran; an HTTP 200 from a Catch Hook only proves the
   hook accepted the request.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ZAPIER_WEBHOOK_URL` | empty | Catch Hook URL. Must be `https`. Empty disables sending. |
| `AUTOMATION_OUTBOX_ENABLED` | unset | Exactly `true` turns on the outbox, dispatcher and callbacks. |
| `AUTOMATION_CALLBACK_TOKEN` | unset | Bearer token for the callbacks. At least 32 characters. |
| `AUTOMATION_CALLBACK_TOKEN_PREVIOUS` | unset | Old token, accepted during a rotation. |

Generate a token with `openssl rand -hex 32`. Store it only in the hosting
provider's environment settings and in the Zap's header field. Never commit it,
paste it into a ticket, or put it in a Zapier Table.

With the flag off the callbacks answer `404`, as if they did not exist. With the
flag on but no valid `AUTOMATION_CALLBACK_TOKEN` configured they answer `503`,
and a missing or wrong bearer token gets `401`.

## What Zapier receives

The existing flat fields stay first and unchanged, so current Zaps keep
working. The versioned envelope is nested under `automation`:

```json
{
  "category": "contact",
  "name": "...", "email": "...", "message": "...",
  "sentAt": "2026-03-01T15:00:00.000Z",
  "automation": {
    "schemaVersion": 1,
    "eventId": "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b",
    "eventType": "contact.received",
    "occurredAt": "2026-03-01T15:00:00.000Z",
    "entityType": "contact_message",
    "entityId": null,
    "topic": "support",
    "marketId": "toronto",
    "countryCode": "CA",
    "timezone": "America/Toronto",
    "priority": "normal",
    "correlationId": "3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b",
    "safeSummary": "Contact message: ...",
    "data": { "subject": "..." }
  }
}
```

- `automation.topic` is one of `music_events`, `artisans`, `pilot`, `finance`,
  `support`, `management`. Route on it. An unknown or missing topic is an
  exception to surface, never a reason to guess an inbox.
- `marketId` / `timezone` are `toronto` / `America/Toronto`,
  `paris` / `Europe/Paris` and `abidjan` / `Africa/Abidjan`, or `null` when the
  source did not say. Do not default a missing market.
- `automation.data` carries only allow-listed fields. Text that people type
  (`subject`, and an artist application's stage name, genre and country) has
  emails and phone numbers replaced with `[email]` and `[number]`, and
  `safeSummary` is built the same way, so both are safe for subject lines and
  task titles. Ids and statuses are passed through untouched. Only the first
  1,000 characters of a typed value are examined and values are cut to 200.
- The flat legacy fields (`name`, `email`, `phone`, `message`, ...) are **not**
  redacted, because existing Zaps rely on them. Build new Zaps on `automation.*`
  and keep personal details out of task titles and mailbox subjects.
- Delivery is **at-least-once**. Dedupe on `automation.eventId` (see below).

### Categories and topics

| `category` | Sent by | `automation.topic` | Does the app already email the team? |
|---|---|---|---|
| `contact` | Contact form | `support` | Yes, to `CONTACT_EMAIL` (then `ADMIN_EMAIL`, then `SMTP_USER`). |
| `pilot_lead` | Contact form, when the subject contains the word "pilot" or "pilote" | `pilot` | Yes, the same email as `contact`. |
| `artist_application` | Artist application | `music_events` | Yes, to the shared Admin inbox (`ADMIN_EMAIL`, then `SMTP_FROM`, then `SMTP_USER`). |
| `event_submission` | Event submission | `music_events` | No. |
| `business_request` | Public "add your business" request form | `artisans` | Yes, `ADMIN_EMAIL`, plus a ticket. |
| `artist_request` | Public artist request form | `music_events` | Yes, `ADMIN_EMAIL`, plus a ticket. |
| `job_request` | Public job request form | `artisans` | Yes, `ADMIN_EMAIL`, plus a ticket. |
| `ticket` | Declared in the contract, not sent by any route yet | `support` | Not applicable. |

A pilot request uses the ordinary contact form: `/contact?subject=Pilot%20program`
prefills the subject, so outreach can link straight to it. It is sent as
`pilot_lead` **instead of** `contact` (never both), and the confirmation and
team emails do not change. The subject matches `pilot`, `pilots`, `pilote` or
`pilotes` as a whole word in any case; "Copilot" and "Pilotage" do not.

**Deploy order.** A pilot request is sent as `pilot_lead` as soon as this code
is deployed, even with the outbox flag off. Before `ZAPIER_WEBHOOK_URL` is set
in production, the Zap that receives it must have a `pilot_lead` path or a
"needs review" catch-all; a Zap that only knows `contact` would otherwise
treat pilot requests as unknown events.

With the flag off the body has no `automation` object and no `topic`: it is the
`category`, the flat fields and `sentAt`. A Zap built for that mode routes on
`category` and treats every flat field as personal data (`pilot_lead` carries
the name, email, phone, subject and message exactly as `contact` does). Send a
category it does not recognise to a visible "needs review" path, never to a
default inbox.

To avoid two alerts for one event, a Zap notifies the team only where the last
column says the app does not already do so. For `contact`, `pilot_lead`,
`artist_application` and the three `*_request` categories it records the task
and does not email again; only `event_submission` needs a team notification.

The three `*_request` events are sent only after the request was emailed or
saved as a ticket (never for a duplicate or a rejected form). Their payload is
deliberately small: `referenceId` (`REQ-BIZ-…`, `REQ-ART-…`, `REQ-JOB-…`), the
name or title, a category or genre, `countryCode` and `city`. No email, phone
or description is sent; the full detail stays in the admin email and the ticket.
As with `pilot_lead`, a Zap needs a path (or the "needs review" catch-all) for
each new category before `ZAPIER_WEBHOOK_URL` is set in production.

Mailbox addresses never live in this repository; they belong in Zapier.

## Delivery rules

| Response from Zapier | Result |
|---|---|
| `2xx` | Marked `sent`. |
| `408`, `425`, `429`, `5xx`, network error, 10 s timeout | Retried. `Retry-After` is honored as a minimum wait, up to 6 hours. |
| `404`, `410` | Retried at least 10 minutes apart (the Zap may simply be switched off). |
| Any other `3xx` or `4xx` | Dead-lettered at once (a configuration error such as a wrong URL). Redirects are never followed. |

Without a `Retry-After` header, retries back off from about 30 seconds up to 30
minutes with jitter. After 10 attempts (typically one to three hours of
retrying) the event is dead-lettered and shows in the health check. A longer
Zapier outage therefore leaves dead events that need a requeue (below). Two app
instances never send the same row at the same time (row leasing); a crash
mid-send is retried after the 60 s lease expires, which is why delivery is
at-least-once. Every result is tied to the lease that produced it: a slow
worker whose lease has expired cannot overwrite the state of the worker that
took over (its result is dropped and logged as "stale").

Error text stored with an event never contains the webhook URL.

## Building the Zaps (account side)

These are specifications for when the Zapier account and mailboxes are
confirmed. Verify in the actual account that the plan includes the features
used (Catch Hook, Webhooks by Zapier custom requests with headers, multi-step
Zaps, Filter, Tables, and the needed Schedule interval) before building.

**1. Intake Zap (one per workflow)**

1. Trigger: Webhooks by Zapier, Catch Hook, on `ZAPIER_WEBHOOK_URL`.
2. Filter: `automation.topic` equals the topic this Zap handles. Ignore events
   without the `automation` object (they are not part of the new contract).
3. Claim, before any side effect: Webhooks by Zapier, Custom Request,
   `POST {APP_URL}/api/automation/claim`, header
   `Authorization: Bearer <token>`, `Content-Type: application/json`, body
   `{"eventId": "<automation.eventId>", "actionKey": "<unique step name>"}`.
4. Filter: continue only if `claimed` is true. A replayed run gets
   `claimed: false` and stops, so the Zap does not create a second task or send
   a second email. Do not use "search the Table, then create" as deduplication;
   two runs can both find nothing.
5. Do the work: create the task row in Zapier Tables, notify the topic's Zoho
   inbox with a link to the record. Send assigned work and links, not copies of
   the personal details.
6. Acknowledge: `POST {APP_URL}/api/automation/ack` with `{"eventId": "..."}`.

Use a different `actionKey` for each irreversible step (for example
`task.create`, `email.notify`). Keys are 1 to 60 characters of lowercase
letters, digits and `_ . : -`, starting with a letter or digit.

`claim` also accepts an optional `detail` object (at most 2 KB, no NUL or
unpaired surrogate characters; anything else is a `400`). It is stored with the
claim and kept until that row is deleted. The privacy scrub does not touch it,
so never put personal data in `detail`.

Responses:

| Call | Success body |
|---|---|
| `claim` | `{"success":true,"status":"claimed"\|"duplicate","claimed":true\|false,"eventId":"...","actionKey":"..."}` |
| `ack` | `{"success":true,"status":"acknowledged"\|"already_acknowledged","eventId":"..."}` |

Errors use `{"success":false,"error":{"code":"...","message":"..."}}` with `400`
(bad input), `401` (bad token), `404` (unknown event), `429` (rate limited), or
`503` (not configured). If a callback fails, let the Zap step fail visibly and
use Zapier's replay; do not continue past a failed claim.

**2. Health Zap**

On a schedule, `GET {APP_URL}/api/automation/health` with the same header. Alert
the Management inbox when `status` is `degraded`. The reasons are:

- `dead_events`: some event exhausted its retries.
- `oldest_pending_over_15_min`: delivery is stuck.
- `ack_overdue`: events were sent but never confirmed (only reported once the
  Zap has confirmed at least one event, so a Zap without an `ack` step is not
  permanently degraded).

Also alert when the health request itself fails or times out.

## Operating it

Run these against the production database with a read/write database client.
They are manual, audited changes; never run them from a Zap.

Queue overview and recent problems:

```sql
SELECT status, COUNT(*) AS events, MIN(created_at) AS oldest
FROM public.automation_outbox GROUP BY status;

SELECT event_id, event_type, attempts, last_http_status, last_error, next_attempt_at
FROM public.automation_outbox
WHERE status IN ('pending', 'dead') AND attempts > 0
ORDER BY created_at DESC LIMIT 50;
```

Requeue a dead event after fixing the cause (the payload must not have been
scrubbed yet):

```sql
UPDATE public.automation_outbox
SET status = 'pending', attempts = 0, next_attempt_at = NOW(),
    dead_at = NULL, lease_until = NULL
WHERE status = 'dead' AND payload_scrubbed_at IS NULL
  AND event_id = '<event-id>';
```

Mark a dead event as handled by hand (so it stops showing in health):

```sql
UPDATE public.automation_outbox
SET status = 'acknowledged', acknowledged_at = NOW(), lease_until = NULL
WHERE status = 'dead' AND event_id = '<event-id>';
```

Rotate the callback token without downtime:

1. Set `AUTOMATION_CALLBACK_TOKEN_PREVIOUS` to the current token and
   `AUTOMATION_CALLBACK_TOKEN` to a new one, then deploy.
2. Update the header in every Zap that calls back.
3. Check `/api/automation/health` from a Zap run, then remove
   `AUTOMATION_CALLBACK_TOKEN_PREVIOUS` and deploy.

Pause or roll back: set `AUTOMATION_OUTBOX_ENABLED` to anything but `true`
(or remove it) and redeploy. Notifications return to the direct fire-and-forget
post, the dispatcher stops, and the callbacks answer `404`. Queued rows stay in
the database untouched. To stop all sending, also clear `ZAPIER_WEBHOOK_URL` and
pause the Zaps in Zapier.

Before re-enabling after a pause, look at the pending rows. Anything too old to
be useful should be discarded rather than delivered late:

```sql
UPDATE public.automation_outbox
SET status = 'dead', dead_at = NOW(), lease_until = NULL,
    last_error = 'Discarded by operator before re-enable'
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 days';
```

## Known limits

Read these before wiring a new source.

- **Queuing is not atomic with the source write.** `notifyZapier` queues the
  event right after the route has saved its own record, in a separate database
  call. If the server stops in that instant, the record exists but the event
  was never queued. This is no worse than the previous fire-and-forget post.
  The queue function accepts any database client, so a new source that needs
  a guarantee must queue the event inside its own transaction.
- **A claim is at-most-once.** `claim` marks a step as taken before the Zap does
  the work. If a Zap run dies after claiming but before finishing, a replay
  gets `duplicate` and skips the step, and the event shows as `ack_overdue` in
  the health check. Either finish that step by hand, or release the claim and
  replay the Zap run (this is a manual, audited change, never a Zap action):

  ```sql
  DELETE FROM public.automation_actions
  WHERE event_id = '<event-id>' AND action_key = '<action key>';
  ```
- **Delivery windows are finite.** Ten attempts cover roughly one to three
  hours (longer if Zapier asks for longer waits with `Retry-After`). After
  that the event is dead-lettered and waits for a requeue.
- **A failed start at boot is retried only when the next event is queued.** If
  the database is unreachable while the server boots, the dispatcher is not
  running. Rows that were already queued wait for the next queued event (which
  retries the start) or the next restart, and the health check reports them as
  `oldest_pending_over_15_min`.
- **Typed text is redacted on a best-effort basis.** Pattern matching removes
  common email and phone formats, not names or addresses. Do not treat
  `automation.data` as anonymous.

## Privacy

While enabled, the outbox keeps the body that is sent to Zapier, which for
existing events includes the same personal details the webhook already carries
(for example names, email addresses, phone numbers and message text). About
14 days after an event is acknowledged, sent or dead-lettered, an hourly job in
the dispatcher replaces the payload with `{"scrubbed": true}`; counters,
statuses and timestamps stay for reporting. The job only runs while the feature
is enabled, and a row that is still pending keeps its payload until it
finishes, so clear out stale pending rows (see the re-enable note above).

Zapier keeps its own run history, governed by the Zapier account's data
retention settings. The `automation_actions` claim records (action key, actor,
optional `detail`, timestamp) are not scrubbed and stay until deleted. Before enabling in production, have the person responsible
for privacy compliance confirm the retention period, the consent wording and
any provider agreements for each market (Canada, France, Côte d'Ivoire).

## Enabling (needs the owner's explicit approval)

Do not enable anything until the owner has confirmed:

- [ ] Zapier plan and the features listed above, and the expected monthly task
      volume against the plan's allowance.
- [ ] Zoho Mail region, the sending identity, and the **real destination
      address for each of the six topics** (music and events, artisans, pilot,
      finance, support, management). Topics may share an address, and the
      sending identity is not a topic destination. Placeholders are not valid
      destinations.
- [ ] Market owners and approvers, and the privacy review above.

Then, one market and topic first:

1. Create the tables, either by running `npm run db:migrate` (migration
   `0008_automation_outbox`) or by letting the first enabled start create them.
2. Build the intake Zap against a test destination and send a controlled
   submission; confirm the Zoho message actually arrives.
3. Set `ZAPIER_WEBHOOK_URL`, `AUTOMATION_CALLBACK_TOKEN` and
   `AUTOMATION_OUTBOX_ENABLED=true` in the hosting environment and deploy.
4. Confirm the log line `[automation] Zapier outbox dispatcher started`, submit
   one real form, and check the queue (`sent`, then `acknowledged`) and the
   health call.
5. Widen to other topics and markets only after a clean run.

## Not built yet

Wiring the remaining sources (listening sessions, artisan onboarding, pilot
fulfillment, payment follow-up, support tickets), the daily and
weekly local-time reports, and human-approval flows. They build on the contract
and callbacks above and wait on the confirmations in the checklist. Any new
source must be added behind the outbox flag so a default deployment does not
change, and external messages stay draft-only until a person approves them.
