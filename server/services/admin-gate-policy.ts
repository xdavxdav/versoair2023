// Account checks for POST /auth/admin-gate. The gate signs staff in with
// gate username + password, so it must enforce the same account state rules
// as the standard login instead of bypassing them.

export const ADMIN_GATE_ROLES = ["admin", "moderator", "superuser"] as const;

export interface AdminGateAccount {
  email: string;
  role: string | null;
  isVerified: boolean | null;
  lockedUntil: Date | string | null;
  mustChangePassword: boolean | null;
}

export interface AdminGateDenial {
  status: number;
  code: string;
  message: string;
}

/** Checked before the password so a locked account cannot be brute-forced. */
export function getAdminGateLockout(
  account: Pick<AdminGateAccount, "lockedUntil">,
  now = new Date(),
): AdminGateDenial | null {
  if (!account.lockedUntil) return null;
  const remainingMs = new Date(account.lockedUntil).getTime() - now.getTime();
  if (remainingMs <= 0) return null;
  const minutes = Math.ceil(remainingMs / 60000);
  return {
    status: 423,
    code: "ACCOUNT_LOCKED",
    message: `Account temporarily locked. Try again in ${minutes} minute(s).`,
  };
}

/** Checked only after the password has been verified. */
export function getAdminGatePostPasswordDenial(
  account: AdminGateAccount,
  options: { isSuperadminEmail: boolean },
): AdminGateDenial | null {
  if (
    !account.role ||
    !(ADMIN_GATE_ROLES as readonly string[]).includes(account.role)
  ) {
    return {
      status: 403,
      code: "INSUFFICIENT_PERMISSIONS",
      message: "Access denied. Admin, CEO, or Moderator clearance required.",
    };
  }

  // Mirrors /auth/login: only the configured superadmin skips verification.
  if (!account.isVerified && !options.isSuperadminEmail) {
    return {
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before signing in.",
    };
  }

  // The gate client cannot run the forced password-change flow, so those
  // accounts must use the standard sign-in, which does.
  if (account.mustChangePassword) {
    return {
      status: 403,
      code: "PASSWORD_CHANGE_REQUIRED",
      message:
        "You must set a new password first. Sign in through the standard login to update it.",
    };
  }

  return null;
}
