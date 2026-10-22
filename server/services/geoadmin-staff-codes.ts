import crypto from "node:crypto";

const STAFF_CODE_SHAPE = /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

type StaffCodeEnvironment = Record<string, string | undefined>;

export function generateGeoAdminAccessCode(): string {
  const pick = (alphabet: string) => alphabet[crypto.randomInt(alphabet.length)];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  return `${Array.from({ length: 3 }, () => pick(letters)).join("")}-${Array.from({ length: 3 }, () => pick(digits)).join("")}-${Array.from({ length: 3 }, () => pick(letters)).join("")}`;
}

export function hashGeoAdminAccessCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function matchGeoAdminStaffCode(
  code: string,
  environment: StaffCodeEnvironment = process.env,
): string | null {
  const normalizedCode = code.trim().toUpperCase();
  if (!STAFF_CODE_SHAPE.test(normalizedCode)) return null;

  const hashes = new Map<string, string>();
  const configuredCodes = environment.GEOADMIN_STAFF_CODE_HASHES;
  if (configuredCodes) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configuredCodes);
    } catch {
      throw new Error("GEOADMIN_STAFF_CODE_HASHES must be a JSON object");
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("GEOADMIN_STAFF_CODE_HASHES must be a JSON object");
    }

    for (const [identity, hash] of Object.entries(parsed)) {
      const normalizedIdentity = identity.trim().toLowerCase();
      if (!/^[a-z0-9_]+$/.test(normalizedIdentity) || normalizedIdentity === "superadmin") {
        throw new Error(
          "GEOADMIN_STAFF_CODE_HASHES keys must be non-owner staff usernames",
        );
      }
      if (typeof hash !== "string" || !SHA256_HEX.test(hash)) {
        throw new Error(
          `GEOADMIN_STAFF_CODE_HASHES contains an invalid SHA-256 hash for ${normalizedIdentity}`,
        );
      }
      hashes.set(normalizedIdentity, hash);
    }
  }

  const legacyHashes = [
    ["admin_025", environment.STAFF_CODE_HASH_ADMIN],
    ["mod_010", environment.STAFF_CODE_HASH_MOD],
  ] as const;
  for (const [identity, hash] of legacyHashes) {
    if (!hash) continue;
    const normalizedHash = hash.trim().toLowerCase();
    if (!SHA256_HEX.test(normalizedHash)) {
      throw new Error(`STAFF_CODE_HASH for ${identity} must be a SHA-256 hex digest`);
    }
    if (!hashes.has(identity)) hashes.set(identity, normalizedHash);
  }

  const seenHashes = new Set<string>();
  for (const hash of hashes.values()) {
    if (seenHashes.has(hash)) {
      throw new Error(
        "Each GeoAdmin staff account must have a different access code",
      );
    }
    seenHashes.add(hash);
  }

  if (environment.SUPERADMIN_GEOADMIN_CODE_HASH) {
    const ownerHash = environment.SUPERADMIN_GEOADMIN_CODE_HASH.trim().toLowerCase();
    if (!SHA256_HEX.test(ownerHash)) {
      throw new Error(
        "SUPERADMIN_GEOADMIN_CODE_HASH must be a SHA-256 hex digest",
      );
    }
    if (seenHashes.has(ownerHash)) {
      throw new Error("The owner GeoAdmin code must be unique to the owner");
    }
    hashes.set("superadmin", ownerHash);
  }

  const digest = crypto.createHash("sha256").update(normalizedCode).digest();
  for (const [identity, hash] of hashes) {
    const expected = Buffer.from(hash, "hex");
    if (crypto.timingSafeEqual(digest, expected)) return identity;
  }
  return null;
}
