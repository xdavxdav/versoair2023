import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authErrorMessage } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGeoAdminInvitationSchema } from "@shared/geoadmin-invitation";

interface GeoAdminMember {
  id: string;
  email: string;
  gateUsername: string;
  role: "admin" | "moderator";
  status: "pending" | "active";
}

export default function GeoAdminAccessManager() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [gateUsername, setGateUsername] = useState("");
  const [role, setRole] = useState<"admin" | "moderator">("admin");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const members = useQuery<{ users: GeoAdminMember[] }>({
    queryKey: ["/auth/geoadmin-access"],
  });

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = createGeoAdminInvitationSchema.safeParse({ email, gateUsername, role });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setWorking(true);
    try {
      await apiRequest("POST", "/auth/geoadmin-access", parsed.data);
      setMessage("Invitation sent. Access starts only after the recipient sets a password.");
      setEmail("");
      setGateUsername("");
      await queryClient.invalidateQueries({ queryKey: ["/auth/geoadmin-access"] });
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  };

  const revoke = async (member: GeoAdminMember) => {
    if (!window.confirm(`Revoke Geo Admin access for ${member.email}?`)) return;
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await apiRequest("DELETE", `/auth/geoadmin-access/${encodeURIComponent(member.id)}`);
      setMessage("Geo Admin access revoked.");
      await queryClient.invalidateQueries({ queryKey: ["/auth/geoadmin-access"] });
    } catch (requestError) {
      setError(authErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="m-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <h2 className="text-xl font-bold">Manage Geo Admin access</h2>
      <p className="mt-2 text-sm text-slate-600">
        Superadmin only. Invite selected staff using real email addresses.
        Admin and Moderator use the existing staff permissions; neither can
        invite others here. Invitations do not include a paid subscription.
      </p>
      <form onSubmit={invite} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="geo-invite-email">Staff email</Label>
          <Input id="geo-invite-email" type="email" autoComplete="off"
            className="border-amber-400 bg-violet-950 text-amber-300 placeholder:text-violet-300 focus-visible:ring-amber-400"
            required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="geo-invite-username">Admin username</Label>
          <Input id="geo-invite-username" required autoComplete="off"
            className="border-amber-400 bg-violet-950 text-amber-300 placeholder:text-violet-300 focus-visible:ring-amber-400"
            minLength={3} maxLength={50} pattern="[a-z0-9_]+"
            value={gateUsername} onChange={(event) => setGateUsername(event.target.value)}
            aria-describedby="geo-invite-username-help" />
          <p id="geo-invite-username-help" className="mt-1 text-xs text-slate-600">
            Lowercase letters, numbers and underscores.
          </p>
        </div>
        <div>
          <Label htmlFor="geo-invite-role">Staff role</Label>
          <select id="geo-invite-role" value={role}
            onChange={(event) => setRole(event.target.value === "moderator" ? "moderator" : "admin")}
            className="mt-1 block h-10 w-full rounded-md border border-amber-400 bg-violet-950 px-3 text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>
        <Button type="submit" disabled={working} className="self-end">
          {working ? "Working..." : "Send invitation"}
        </Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      {members.isLoading && <p className="mt-4">Loading access list...</p>}
      {members.isError && (
        <div role="alert" className="mt-4 text-red-700">
          {authErrorMessage(members.error)}
          <Button variant="outline" onClick={() => void members.refetch()}>Retry</Button>
        </div>
      )}
      {members.data && (
        <ul className="mt-5 divide-y">
          {members.data.users.length === 0 && <li>No invited Geo Admin staff yet.</li>}
          {members.data.users.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{member.email}</p>
                <p className="text-sm text-slate-600">
                  {member.gateUsername} - {member.role} - {member.status}
                </p>
              </div>
              <Button variant="outline" disabled={working} onClick={() => void revoke(member)}>
                {member.status === "pending" ? "Cancel invitation" : "Revoke access"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
