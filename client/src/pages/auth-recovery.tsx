import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { authErrorMessage } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AuthRecoveryPage() {
  const [location] = useLocation();
  const isInvitation = location === "/geo-admin/accept-invitation";
  const isForgot = location === "/auth/forgot-password";
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const { user, restoreAuth } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [acceptedExistingAccount, setAcceptedExistingAccount] = useState(false);
  const [error, setError] = useState("");
  const title = isForgot ? "Forgot password" : isInvitation ? "Accept Geo Admin invitation" : "Reset password";

  const acceptForExistingAccount = async () => {
    setError("");
    setWorking(true);
    try {
      await apiRequest("POST", "/auth/accept-geoadmin-invitation-existing", { token });
      setAcceptedExistingAccount(true);
      setComplete(true);
      await restoreAuth();
      window.history.replaceState({}, "", window.location.pathname);
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!isForgot && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isForgot && (password.length < 12 || !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) || !/[0-9]/.test(password))) {
      setError("Use at least 12 characters, including uppercase, lowercase and a number.");
      return;
    }
    setWorking(true);
    try {
      const endpoint = isForgot ? "/auth/forgot-password" :
        isInvitation ? "/auth/accept-geoadmin-invitation" : "/auth/reset-password";
      await apiRequest(
        "POST",
        endpoint,
        isForgot
          ? { email: email.trim() }
          : isInvitation
            ? { token, password }
            : { token, password },
      );
      setComplete(true);
      setPassword("");
      setConfirmPassword("");
      if (!isForgot) window.history.replaceState({}, "", window.location.pathname);
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          {complete ? (
            <p role="status">
              {isForgot
                ? "If that email is registered and delivery succeeds, you will receive a reset link. Check your inbox and spam folder. The link expires in one hour."
                : isInvitation
                  ? acceptedExistingAccount
                    ? "Geo Admin access is now linked to your existing account. Your password and other portal access were kept unchanged. Use your assigned admin username and existing password at Geo Admin sign-in."
                    : "Your Geo Admin account is ready. Sign in with your assigned admin username and the password you just set."
                  : "Your password has been reset. Sign in with your new password."}
            </p>
          ) : !isForgot && !token ? (
            <p role="alert">This link is missing its token. Request a new reset link or ask your superadmin for another invitation.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {isForgot ? (
                <div>
                  <Label htmlFor="recovery-email">Registered email</Label>
                  <Input id="recovery-email" type="email" autoComplete="email" required
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                  <p className="mt-2 text-sm text-slate-600">
                    Use the real email attached to your account, not your admin username.
                    Password recovery does not grant Geo Admin access.
                  </p>
                </div>
              ) : isInvitation ? (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                    Already have a Verso Air account? Sign in to that account and accept this invitation here. Your current password will not change.
                    {user ? (
                      <p className="mt-2 font-medium">Signed in as {user.email}</p>
                    ) : (
                      <p className="mt-2">
                        <a className="underline" href="/auth/signin" target="_blank" rel="noreferrer">
                          Sign in to your account in a new tab
                        </a>
                        , then return here to accept the invitation.
                      </p>
                    )}
                  </div>
                  {user && (
                    <Button type="button" disabled={working} onClick={acceptForExistingAccount}
                      className="w-full">
                      {working ? "Please wait..." : "Accept for my signed-in account"}
                    </Button>
                  )}
                  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                  {!user && (
                    <>
                      <PasswordFields
                        password={password}
                        confirmPassword={confirmPassword}
                        onPasswordChange={setPassword}
                        onConfirmPasswordChange={setConfirmPassword}
                      />
                      <Button type="submit" disabled={working} className="w-full">
                        {working ? "Please wait..." : "Set password"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="recovery-password">New password</Label>
                    <Input id="recovery-password" type="password" autoComplete="new-password"
                      minLength={12} maxLength={128} required value={password}
                      onChange={(event) => setPassword(event.target.value)} />
                    <p className="mt-2 text-sm text-slate-600">
                      At least 12 characters, with uppercase, lowercase and a number.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="recovery-confirm">Confirm password</Label>
                    <Input id="recovery-confirm" type="password" autoComplete="new-password"
                      required value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)} />
                  </div>
                </>
              )}
              {!isInvitation && error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {!isInvitation && (
                <Button type="submit" disabled={working} className="w-full">
                  {working ? "Please wait..." : isForgot ? "Send reset link" : "Set password"}
                </Button>
              )}
            </form>
          )}
          <Link href="/geo-admin" className="block text-sm underline">Back to Geo Admin sign-in</Link>
          {!isForgot && !complete && <Link href="/auth/forgot-password" className="block text-sm underline">Request a password reset</Link>}
        </CardContent>
      </Card>
    </main>
  );
}

function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <Label htmlFor="recovery-password">New password</Label>
        <Input id="recovery-password" type="password" autoComplete="new-password"
          minLength={12} maxLength={128} required value={password}
          onChange={(event) => onPasswordChange(event.target.value)} />
        <p className="mt-2 text-sm text-slate-600">
          At least 12 characters, with uppercase, lowercase and a number.
        </p>
      </div>
      <div>
        <Label htmlFor="recovery-confirm">Confirm password</Label>
        <Input id="recovery-confirm" type="password" autoComplete="new-password"
          required value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)} />
      </div>
    </>
  );
}
