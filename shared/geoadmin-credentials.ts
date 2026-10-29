import { z } from "zod";

export const ownerCredentialRequestSchema = z.object({
  kind: z.enum(["access-code", "authenticator"]),
}).strict();

export type OwnerCredentialKind = z.infer<typeof ownerCredentialRequestSchema>["kind"];

export const ownerCredentialResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("access-code"),
    code: z.string().regex(/^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
    variable: z.literal("SUPERADMIN_GEOADMIN_CODE_HASH"),
  }),
  z.object({
    kind: z.literal("authenticator"),
    secret: z.string().regex(/^[A-Z2-7]{52}$/),
    uri: z.string().startsWith("otpauth://totp/"),
    variable: z.literal("SUPERADMIN_TOTP_SECRET"),
  }),
]);

export type OwnerCredentialDraft = z.infer<typeof ownerCredentialResponseSchema>;
