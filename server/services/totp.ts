import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW_STEPS = 1;
const MIN_SECRET_BYTES = 20;

export function generateTotpSecret(): string {
  let bits = 0;
  let value = 0;
  let secret = "";
  for (const byte of randomBytes(32)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      secret += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) secret += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return secret;
}

export function buildTotpUri(secret: string, account: string): string {
  decodeBase32Secret(secret);
  const issuer = "Verso Air";
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?${params}`;
}

export function decodeBase32Secret(secret: string): Buffer {
  const normalized = secret.trim().toUpperCase().replace(/=+$/, "");
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error("TOTP secret must be Base32");
  }

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }

  if (bits > 0 && (value & ((1 << bits) - 1)) !== 0) {
    throw new Error("TOTP secret has invalid Base32 padding");
  }

  const key = Buffer.from(bytes);
  if (key.length < MIN_SECRET_BYTES) {
    throw new Error("TOTP secret must contain at least 160 bits");
  }
  return key;
}

export function getTotpStep(now = Date.now()): number {
  return Math.floor(now / 1000 / TOTP_STEP_SECONDS);
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  const key = decodeBase32Secret(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(getTotpStep(now)));

  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(
  secret: string,
  suppliedCode: string,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(suppliedCode)) return null;
  const key = decodeBase32Secret(secret);
  const currentStep = getTotpStep(now);
  const supplied = Buffer.from(suppliedCode);

  for (
    let step = currentStep - TOTP_WINDOW_STEPS;
    step <= currentStep + TOTP_WINDOW_STEPS;
    step += 1
  ) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac("sha1", key).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const expected = Buffer.from(
      String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0"),
    );

    if (timingSafeEqual(supplied, expected)) return step;
  }

  return null;
}

export function isValidTotpSecret(secret: string | undefined): secret is string {
  if (!secret) return false;
  try {
    decodeBase32Secret(secret);
    return true;
  } catch {
    return false;
  }
}
