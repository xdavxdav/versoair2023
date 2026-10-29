import { Router, type Request, type RequestHandler } from "express";
import {
  ownerCredentialRequestSchema,
  type OwnerCredentialDraft,
  type OwnerCredentialKind,
} from "@shared/geoadmin-credentials";
import { asyncHandler } from "../middleware/asyncHandler";
import { loginLimiter } from "../middleware/rate-limiter";
import { generateGeoAdminAccessCode, hashGeoAdminAccessCode } from "../services/geoadmin-staff-codes";
import { buildTotpUri, generateTotpSecret } from "../services/totp";

export function createGeoAdminCredentialRouter(deps: {
  authorizeOwner: RequestHandler;
  audit: (req: Request, kind: OwnerCredentialKind) => Promise<void>;
}) {
  const router = Router();
  router.post(
    "/geoadmin-access/owner-credentials",
    deps.authorizeOwner,
    loginLimiter,
    asyncHandler(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const parsed = ownerCredentialRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Choose an owner access code or authenticator setup.",
        });
      }
      if (!req.user?.email) {
        return res.status(401).json({ success: false, message: "Sign in again." });
      }

      // Drafts never mutate the current credentials or environment.
      let draft: OwnerCredentialDraft;
      if (parsed.data.kind === "access-code") {
        const code = generateGeoAdminAccessCode();
        draft = {
          kind: "access-code",
          code,
          hash: hashGeoAdminAccessCode(code),
          variable: "SUPERADMIN_GEOADMIN_CODE_HASH",
        };
      } else {
        const secret = generateTotpSecret();
        draft = {
          kind: "authenticator",
          secret,
          uri: buildTotpUri(secret, req.user.email),
          variable: "SUPERADMIN_TOTP_SECRET",
        };
      }

      await deps.audit(req, parsed.data.kind);
      return res.json(draft);
    }),
  );
  return router;
}
