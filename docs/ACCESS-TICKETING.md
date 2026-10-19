# Owner access, staff support and implementation tracking

## Access boundaries

`SUPERADMIN_EMAIL` must name the existing owner's account on the server.
The stored role must also be `superuser`. Do not expose this setting through
a `VITE_` variable. Missing configuration denies access, including development;
there is no email-domain, username or arbitrary-superuser fallback.

SuperAdmin is a personal, non-transferable owner status, not a delegable staff
role. Even the owner cannot assign `superuser`, `superadmin` or owner aliases
through invitations, user creation/editing, security role changes, role
assignment or generic user-table forms. Owner role controls are read-only.
The integrated SQL console runs one read-only statement per request, in a
read-only transaction on a discarded connection, so it cannot bypass the
role-management policy. Use dedicated forms for authorized mutations.
The owner's identity/role bootstrap remains server-managed. Admin/Moderator
invitations are the supported delegation path. This does not prevent an
infrastructure operator with direct database/configuration access from changing
the system outside these application workflows.

GeoAdmin access has three lanes:

1. **GeoAdmin Subscriber** — paid Pro Max/Enterprise subscribers at
   `/geo-admin`. This is a customer subscription, not a staff
   role, and it grants no Admin Panel or support-workspace authority. The
   `/geo-admin`, `/geo-admin/business-verification` and
   `/geo-admin/immobilier` experiences are consultation-only: subscribers
   cannot submit GeoAdmin requests, Digital Passport applications or property
   listings, or change the portal's business data. Subscriber-specific write
   APIs reject authenticated active Max/Enterprise accounts; anonymous public
   submission routes remain available to non-portal visitors.
2. **GeoAdmin Admin Panel** — an invited `admin` at `/geo-admin/dashboard`.
   Delegated sections: overview, businesses, categories, jobs, advertising,
   marketplace, artists, analytics, content, contractor applications and
   assignments, community operations, events and the geo-action queue. The
   activity log only shows artist, business, campaign, category and job events.
3. **Owner** — the same panel plus the owner-only areas below.

Invited Admins may view the 11-lot implementation tracker and its change
history, and can send an append-only signal to the configured owner's
in-application notification inbox. They cannot edit lot statuses, evidence,
blockers, versions or history, and cannot mark signals as owner decisions. The
owner alone makes and records final technical decisions.

Invited Admins never access ticket voiding, users/roles/security/SMTP/TSR
whitelist, artisan identity profiles, verification, invitations,
SQL/backup/import/export/database management, `/api/admin`, credentials,
payment settings or the Card Vault. These limits are enforced by the API;
hidden menu items are only a convenience. Moderators do not enter the Admin
Panel. Public email-only business/artist/job request endpoints remain public
for non-portal website visitors; the subscriber GeoAdmin UI does not expose
their submit actions.

Owner-only areas include the technical parts of `/geo-admin/dashboard`, the
`/api/admin` and database-management APIs, `/api/v1/admin/{users,roles,security,verification}`,
the global Card
Vault at `/account/cards`, privileged financial operations, credentials
management, payment-provider settings, GeoAdmin invitations and the legacy TSR
whitelist. Only the owner can revoke another account's session. Customer access to their own
billing and cards is separate. The musical vault is a different product.

Staff work at `/geo-admin/workspace` (also `/admin/tickets`):

| Actor | Read | Work | Assignment | Sensitive actions |
|---|---|---|---|---|
| Customer | Own tickets | Public replies, withdraw own active request, reopen own non-voided request | None | None |
| Moderator / existing TSR role | Unassigned and personally assigned tickets | Claim an unassigned ticket, reply, internal note, transition assigned ticket, request escalation | Self-claim only | No priority changes, abandonment, invalidation or deletion |
| Admin | All support tickets | Operational supervision, transitions, replies, notes, priority and escalation | Assign active support staff or unassign | Confirm proposed abandonment, but cannot void |
| Configured owner | All tickets | All support operations | All support assignments | Void with reason; exclusive technical/financial control |
| Other superuser | Own customer tickets only | Customer operations | None | No owner privileges |

An invitation does not confer a commercial subscription or a country scope.
An account's stored role, not an email pattern or browser storage flag,
determines its staff lane. Revoked sessions are checked on protected requests.
Database authorization failures deny access rather than silently permitting it.
The staff support workspace does not grant technical database editing.

## Ticket lifecycle

The shared contract is [ticket-policy.ts](../shared/ticket-policy.ts).
Eight states are distinct:

- `open`: received, awaiting qualification.
- `in-progress`: active work; assignment required.
- `pending`: waiting for customer, internal team, third party or approval.
  Requires a reason and a future follow-up time.
- `resolved`: solution supplied, awaiting confirmation.
- `closed`: manually completed.
- `withdrawn`: requester withdrew the request.
- `abandoned`: manager-confirmed end after the customer reminder cycle.
- `voided`: owner-invalidated error or duplicate.

Every state/priority update requires a reason and is transactional with its
history. Public history exposes state changes, not staff-only reasons.
Internal notes are filtered by the API, including history. Legacy comments
remain public because the old system did not distinguish note visibility.

Tickets are not physically deleted by the ticket API. Use a voided transition
with a reason and optionally a duplicate ticket reference. Reopen to `open`
if not assigned, or `in-progress` if assigned; only the owner can reopen a
voided ticket. Batch operations validate the same rules and roll back together.

These are conservative operational defaults selected because the owner was
unavailable for the policy form, not a claim of externally approved TSR rules:

- Existing targets remain low 72 h, medium 24 h, high 8 h, critical 2 h.
- Targets use calendar time, without automatic SLA pauses.
- Resolution and closure are distinct; closure is manual.
- Priority changes preserve the current SLA cycle start; reopening starts
  a new cycle. Historical breach events remain in the audit log.
- Pending/customer receives in-app reminders at day 3 and day 7.
- At day 14 a manager receives an abandonment proposal; the ticket is
  **never automatically abandoned**. Internal/third-party/approval waits
  do not generate customer-abandonment proposals.
- A customer reply to a pending/customer ticket resumes work and clears
  its old follow-up cycle.

## VersoAI handoff and notifications

Both the global assistant and the support Inbox offer a confirmed human
handoff. An authenticated customer must confirm it. The server checks support
conversation ownership, persists the latest customer message and ticket
atomically when starting from the widget, and links one ticket per support
conversation. Concurrent retries return the same reference.

The handoff transfers the latest question, not the full chat transcript.
Follow the reference at `/tickets?ticket=<id>`. If the conversation already has
a ticket, the existing reference is returned; reopen it when appropriate.
The assistant never receives payment, role-management or owner capabilities.

The minute-based monitor starts after schema verification. PostgreSQL locks
serialize monitor work across instances; ticket row locks serialize it with
replies/transitions. Persistent, uniquely keyed alerts prevent duplicates
after a process restart. Public reminders appear in ticket comments; staff
follow-ups, SLA breaches and escalations appear in the workspace alerts.

This release delivers **in-app notifications**, not guaranteed email, SMS,
WhatsApp or Zapier delivery. It requires no new paid provider. Existing
optional Zapier integration is not a delivery guarantee. Errors are logged
and work is retried on the next monitor cycle; unavailable databases do not
produce a success-shaped ticket response. A sleeping free web service cannot
run the minute job until it wakes; persisted deadlines are processed then.

## Integrated owner tracking

The Admin Panel overview contains the 11 lots from
[implementation-plan.ts](../shared/implementation-plan.ts), their priorities,
dependencies, acceptance criteria, blockers, evidence and last update.
The owner and invited Admins can read these lots and the change timeline.
Admins can send a separate signal for an owner to review; that signal is
persisted and generates an in-application notification with a link to the
panel. It is not email, SMS or WhatsApp delivery. The tracker polls every 15
seconds while open, and displays the hosting release SHA when supplied by the
deployment environment.

Only the configured owner can edit statuses, evidence or blockers. Statuses are
manually recorded, not auto-certified:
`todo`, `in-progress`, `in-review`, `tested`, `deployed`, `live-verified`,
`blocked`. Unrecorded lots initially display `in-review`, because this release
includes their implementation but does not certify their acceptance.
Tests/deployment/live verification require evidence; blockers require an
explanation. Deployment requires deployed prerequisites. Updates are saved
with an audit entry including the deployed version when available. The
read-only history shows who changed each lot, what was recorded and the
version; legacy entries may not contain a version. A push alone is not a
successful production acceptance.

## Schema rollout and rollback

Startup applies the idempotent, additive
[ticket schema upgrades](../server/services/ticket-schema.ts) after creating
base tables. It retains old tickets/comments, normalizes legacy `in_progress`,
backfills deadlines and creates event, alert and tracking tables. It also
ensures the session-revocation table exists. A schema error prevents startup.

Before production rollout, retain the provider's database backup/restore
point. Do not drop new columns or tables to roll back. An old ticket writer
does not understand the new states or internal-note filtering: **do not
roll back to it while leaving customer ticket routes open**. Prefer a
forward fix or disable those routes during recovery; preserve history.
Owner configuration must be checked before admitting staff.

## Validation

Policy and invitation tests need no production accounts:

```sh
node --import tsx --test shared/ticket-policy.test.ts \
  shared/geoadmin-invitation.test.ts server/services/geoadmin-invitations.test.ts \
  client/src/lib/dashboard-routes.test.ts
```

The integration suite **inserts fixtures** and requires an explicitly
disposable local PostgreSQL database. Never pass a shared or production URL:

```sh
TICKET_INTEGRATION_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/DISPOSABLE_DB \
  node --import tsx --test scripts/tests/ticket-workflow.test.mjs
npm run check -- --incremental false
npm run check:api
npm run build
```

The suite covers actual privileged router refusals, role changes, revocation,
ticket scopes, private notes, transitions, atomic batches, concurrent handoff,
durable reminders, tracking evidence and browser responsiveness/localization.
It provisions minimal Arena base tables solely to satisfy the application's
existing separate music bootstrap dependencies.

Live acceptance must additionally verify the deployed revision, unauthenticated
refusals and, with authorized accounts, the owner and staff journeys. Never
test with real card charges, client messages or destructive database actions.
