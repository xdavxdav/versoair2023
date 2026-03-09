/**
 * CREDENTIALS VAULT
 * Development/Admin credential storage for rapid account switching
 * FOR DEVELOPMENT & ADMIN USE ONLY
 *
 * All accounts use the same password: VersoTest2026!
 * These match the actual users in the PostgreSQL database.
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
    id: "superuser-1",
    username: "superadmin_test",
    email: "superadmin@versoair.test",
    password: "VersoTest2026!",
    firstName: "Super",
    lastName: "Admin",
    businessName: "Verso Air - Master Control",
    role: "superuser",
    description: "Master superuser - Full system control",
    color: "from-red-600 to-pink-600",
    icon: "crown",
  },
  {
    id: "superuser-2",
    username: "sys_operator",
    email: "operator@versoair.test",
    password: "VersoTest2026!",
    firstName: "System",
    lastName: "Operator",
    businessName: "Verso Air - Operations",
    role: "superuser",
    description: "System operator - Infrastructure and database ops",
    color: "from-red-700 to-orange-600",
    icon: "zap",
  },
  {
    id: "admin-1",
    username: "admin_test",
    email: "admin@versoair.test",
    password: "VersoTest2026!",
    firstName: "Platform",
    lastName: "Admin",
    businessName: "Admin Dashboard",
    role: "admin",
    sector: "administration",
    description: "General admin - Platform management",
    color: "from-blue-600 to-cyan-600",
    icon: "shield",
  },
  {
    id: "moderator-1",
    username: "moderator_test",
    email: "moderator@versoair.test",
    password: "VersoTest2026!",
    firstName: "Community",
    lastName: "Moderator",
    businessName: "Moderation Team",
    role: "moderator",
    description: "Community moderator",
    color: "from-teal-600 to-green-600",
    icon: "wrench",
  },
  {
    id: "business-1",
    username: "business_owner_test",
    email: "owner@versoair.test",
    password: "VersoTest2026!",
    firstName: "Business",
    lastName: "Owner",
    businessName: "Test Business",
    role: "business-owner",
    description: "Business owner account",
    color: "from-amber-500 to-orange-500",
    icon: "store",
  },
  {
    id: "user-1",
    username: "free_user_test",
    email: "freeuser@versoair.test",
    password: "VersoTest2026!",
    firstName: "Free",
    lastName: "User",
    businessName: "Personal Profile",
    role: "user",
    description: "Free tier user account",
    color: "from-slate-400 to-zinc-400",
    icon: "user",
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
