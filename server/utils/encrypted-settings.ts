import crypto from "crypto";

function getKey(): Buffer {
  const secret =
    process.env.ADMIN_SETTINGS_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SETTINGS_ENCRYPTION_KEY is required for encrypted settings",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSetting(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSetting(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted setting");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivValue, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
