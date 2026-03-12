/**
 * CREDENTIALS VAULT
 * Single master credential for ALL portals
 * FOR DEVELOPMENT & ADMIN USE ONLY
 *
 * One account — superadmin@versoair.test / JoeyD000
 * Works on: /auth/login, /auth/artist/login, /auth/community/login,
 *           /auth/subscriber/login, /auth/admin-gate, /api/vault/authorize
 */

export interface Credential {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  role: "superuser" | "admin" | "moderator" | "user" | "business-owner";
  sector?: string;
  description: string;
  color: string;
  icon: string;
}

export const CREDENTIALS: Credential[] = [
  {
    id: "superuser-master",
    username: "superadmin_test",
    email: "superadmin@versoair.test",
    password: "JoeyD000",
    firstName: "Joel",
    lastName: "D",
    businessName: "Verso Air — Master Control",
    role: "superuser",
    description:
      "Universal master account — connects to General, Artist Portal, Blog/Community, Geo-Admin, Vault, and all portals",
    color: "from-red-600 to-pink-600",
    icon: "crown",
  },
];

export function getCredentialsByRole(role: string): Credential[] {
  return CREDENTIALS.filter((cred) => cred.role === role);
}

export function getCredentialBySector(sector: string): Credential[] {
  return CREDENTIALS.filter((cred) => cred.sector === sector);
}

export function getCredentialById(id: string): Credential | undefined {
  return CREDENTIALS.find((cred) => cred.id === id);
}

export function searchCredentials(query: string): Credential[] {
  const lower = query.toLowerCase();
  return CREDENTIALS.filter(
    (cred) =>
      cred.username.toLowerCase().includes(lower) ||
      cred.email.toLowerCase().includes(lower) ||
      cred.businessName.toLowerCase().includes(lower) ||
      cred.firstName.toLowerCase().includes(lower) ||
      cred.lastName.toLowerCase().includes(lower) ||
      cred.description.toLowerCase().includes(lower),
  );
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    superuser: "from-red-600 to-pink-600",
    admin: "from-blue-600 to-cyan-600",
    moderator: "from-teal-600 to-green-600",
    "business-owner": "from-amber-500 to-orange-500",
    user: "from-slate-400 to-zinc-400",
  };
  return colors[role] || "from-slate-600 to-gray-600";
}

export function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    superuser: "crown",
    admin: "shield",
    moderator: "wrench",
    "business-owner": "store",
    user: "user",
  };
  return icons[role] || "user";
}
