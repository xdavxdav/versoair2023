import { pool } from "../db";

export interface VerificationDecision {
  /** Business id as received from the route. */
  id: unknown;
  actorId: number;
  /** Approve: what record was checked. Reject: why it was refused. */
  note: string;
  ipAddress?: string;
}

export interface VerificationResult {
  business: Record<string, any>;
  previousStatus: string | null;
}

export function cleanNote(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function businessId(value: unknown): number | null {
  const text = String(value);
  return /^[1-9]\d*$/.test(text) ? Number(text) : null;
}

// Both decisions are one transaction: the row change and its audit entry land
// together or not at all. No approval_status filter - any row can be decided.
async function decide(
  decision: VerificationDecision,
  action: "VERIFY_APPROVE" | "VERIFY_REJECT",
  updateSql: string,
): Promise<VerificationResult | null> {
  const id = businessId(decision.id);
  if (id === null) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT id, name, verification_status, is_verified, is_active FROM businesses WHERE id = $1 FOR UPDATE",
      [id],
    );
    const before = current.rows[0];
    if (!before) {
      await client.query("ROLLBACK");
      return null;
    }

    const updated = await client.query(updateSql, [
      decision.actorId,
      decision.note,
      id,
    ]);
    const business = updated.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
       VALUES ($1, $2, 'business', $3, $4, $5)`,
      [
        decision.actorId,
        action,
        String(id),
        JSON.stringify({
          businessName: before.name,
          previousStatus: before.verification_status,
          previousVerified: before.is_verified,
          previousActive: before.is_active,
          newStatus: business.verification_status,
          note: decision.note,
        }),
        decision.ipAddress ?? null,
      ],
    );
    await client.query("COMMIT");
    return { business, previousStatus: before.verification_status ?? null };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** The one publish path: verified + verified flag + active, with the evidence note. */
export function approveBusiness(decision: VerificationDecision) {
  return decide(
    decision,
    "VERIFY_APPROVE",
    `UPDATE businesses
     SET verification_status = 'verified',
         is_verified = true,
         is_active = true,
         verification_date = NOW(),
         verified_by = $1,
         verification_reason = $2,
         approval_status = 'approved',
         approved_by = $1,
         approval_notes = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
  );
}

export function rejectBusinessVerification(decision: VerificationDecision) {
  return decide(
    decision,
    "VERIFY_REJECT",
    `UPDATE businesses
     SET verification_status = 'rejected',
         is_verified = false,
         verification_date = NOW(),
         verified_by = $1,
         verification_reason = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
  );
}
