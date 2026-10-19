export const IMPLEMENTATION_LOTS = [
  { id: "A1", title: "Owner identity and permission matrix", priority: "P0", dependsOn: [], acceptance: "Configured identity AND role; deny if configuration is missing." },
  { id: "A2", title: "Owner-only Admin Panel and Card Vault", priority: "P0", dependsOn: ["A1"], acceptance: "Pages and APIs reject every other account, including another superuser." },
  { id: "A3", title: "Invitations, roles and session revocation", priority: "P0", dependsOn: ["A1"], acceptance: "Owner-only management; revoked sessions rejected; no email-derived privileges." },
  { id: "A4", title: "Separate operational staff workspace", priority: "P1", dependsOn: ["A2"], acceptance: "Staff can do support work without technical or financial access." },
  { id: "T1", title: "Ticket lifecycle and SLA policy", priority: "P1", dependsOn: [], acceptance: "Eight states; reasoned transitions; manual closure and abandonment." },
  { id: "T2", title: "Durable lifecycle and audit history", priority: "P1", dependsOn: ["A1", "T1"], acceptance: "Transactional writes, history and batch validation; no in-memory success fallback." },
  { id: "T3", title: "TAM and scoped work queues", priority: "P1", dependsOn: ["A4", "T2"], acceptance: "Moderator: unassigned/own; Admin: all; consistent API and UI." },
  { id: "T4", title: "Internal notes versus customer replies", priority: "P1", dependsOn: ["A1", "T2"], acceptance: "Internal notes never returned to customer accounts." },
  { id: "I1", title: "Confirmed VersoAI human handoff", priority: "P2", dependsOn: ["T3", "T4"], acceptance: "Owned support thread; one persistent ticket per conversation; customer sees reference." },
  { id: "O1", title: "Durable SLA and follow-up alerts", priority: "P2", dependsOn: ["T1", "T2", "T3"], acceptance: "Deduplicated in-app alerts; restart recovery; no automatic abandonment." },
  { id: "V1", title: "Tests, deployment and live acceptance", priority: "P0/P1/P2", dependsOn: ["A2", "A3", "T3", "T4", "I1", "O1"], acceptance: "Record test results, deployed version and authorized live role tests." },
] as const;
export const WORK_STATUSES = ["todo", "in-progress", "in-review", "tested", "deployed", "live-verified", "blocked"] as const;
