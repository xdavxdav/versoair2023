import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  ownerCredentialResponseSchema,
  type OwnerCredentialDraft,
  type OwnerCredentialKind,
} from "@shared/geoadmin-credentials";
import { apiRequest } from "@/lib/queryClient";
import { authErrorMessage } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GeoAdminOwnerCredentials() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OwnerCredentialDraft | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!draft) return;
    const timeout = window.setTimeout(() => {
      setDraft(null);
      setMessage("The private draft was cleared after five minutes. Generate another if needed.");
    }, 5 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  const generate = async (kind: OwnerCredentialKind) => {
    if (draft && !window.confirm("Replace this unsaved draft? Save it privately first if you need it.")) return;
    setWorking(true);
    setError("");
    setMessage("");
    setDraft(null);
    try {
      const response = await apiRequest("POST", "/auth/geoadmin-access/owner-credentials", { kind });
      const parsed = ownerCredentialResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("The credential generator returned an invalid response. Please retry.");
      setDraft(parsed.data);
      void queryClient.invalidateQueries({ queryKey: ["/auth/geoadmin-access/history"] });
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  };

  const copy = async (value: string) => {
    setError("");
    setMessage("");
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied. Save privately, then clear your clipboard.");
    } catch {
      setError("Clipboard access failed. Select the value and copy it manually.");
    }
  };

  const privateValue = (id: string, label: string, value: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input id={id} readOnly value={value} autoComplete="off" spellCheck={false}
          className="min-w-0 flex-1 font-mono" onFocus={(event) => event.target.select()} />
        <Button type="button" variant="outline" onClick={() => void copy(value)}
          aria-label={`Copy ${label}`}>Copy</Button>
      </div>
    </div>
  );

  return (
    <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-slate-900"
      aria-labelledby="geo-owner-credentials-heading">
      <h3 id="geo-owner-credentials-heading" className="text-lg font-semibold">Owner credential tools</h3>
      <p className="mt-2 text-sm">
        Generate the same credentials as the terminal commands, here in GeoAdmin.
        These are private setup drafts, not active replacements. Your current sign-in stays unchanged.
        New staff should use the invitation form above, not the owner credentials.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={working} onClick={() => void generate("access-code")}>
          Generate owner access code
        </Button>
        <Button type="button" disabled={working} onClick={() => void generate("authenticator")}>
          Generate authenticator setup
        </Button>
      </div>
      {working && <p role="status" className="mt-3 text-sm">Generating private draft...</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      {draft && (
        <div className="mt-4 space-y-4" data-testid="owner-credential-draft">
          <p className="font-semibold">Not active yet. Save privately before leaving this page.</p>
          {draft.kind === "access-code" ? (
            <>
              {privateValue("owner-code-draft", "Private owner access code", draft.code)}
              {privateValue("owner-code-hash", draft.variable, draft.hash)}
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>Save the access code in your password manager.</li>
                <li>In Render, update <code>{draft.variable}</code> with the hash, never the raw code, then save and deploy.</li>
                <li>Keep your current authenticator. Test the new code in a separate browser before closing your current session.</li>
              </ol>
            </>
          ) : (
            <>
              <div className="inline-block rounded border bg-white p-3">
                <QRCodeSVG value={draft.uri} size={192} level="M" title="Owner authenticator setup QR code" />
              </div>
              {privateValue("owner-totp-secret", "Private authenticator setup key", draft.secret)}
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>Scan the QR code with your authenticator, or add the key manually as a time-based account.</li>
                <li>Back up the key privately. Keep your old authenticator entry until the replacement is tested.</li>
                <li>In Render, update <code>{draft.variable}</code> with this key, then save and deploy.</li>
                <li>Test a sign-in in a separate browser before closing your current session.</li>
              </ol>
            </>
          )}
          <p className="text-xs">
            Shown only in this tab; cleared after five minutes. No credentials are activated,
            emailed or saved by this generator. Initial owner access and account recovery still require deployment configuration.
          </p>
          <Button type="button" variant="outline" onClick={() => {
            setDraft(null);
            setMessage("Private draft cleared.");
          }}>Clear private draft</Button>
        </div>
      )}
    </section>
  );
}
