/**
 * 🔐 CREDENTIALS VAULT
 * Development/Admin credential storage for rapid account switching
 * ⚠️ FOR DEVELOPMENT & ADMIN USE ONLY
 *
 * This file stores credentials for superusers, admins, and test accounts
 * to facilitate quick access to different account types during development.
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
  // ══════════════════════════════════════════════════════════
  // 🔐 SUPERUSER ACCOUNTS (Full system access)
  // ══════════════════════════════════════════════════════════
  {
    id: "superuser-1",
    username: "superadmin",
    email: "superadmin@versoair.com",
    password: "SuperAdmin@2026!",
    firstName: "Super",
    lastName: "Admin",
    businessName: "Verso Air - Master Control",
    role: "superuser",
    description: "Master superuser - Full system control",
    color: "from-red-600 to-pink-600",
    icon: "👑",
  },

  {
    id: "superuser-2",
    username: "rootadmin",
    email: "root@versoair.com",
    password: "RootAccess@2026!",
    firstName: "Root",
    lastName: "Administrator",
    businessName: "System Root",
    role: "superuser",
    description: "System root access - Database & infrastructure",
    color: "from-red-700 to-orange-600",
    icon: "⚡",
  },

  // ══════════════════════════════════════════════════════════
  // 🛡️ ADMIN ACCOUNTS (Platform management)
  // ══════════════════════════════════════════════════════════
  {
    id: "admin-1",
    username: "admin-general",
    email: "admin@versoair.com",
    password: "AdminGeneral@2026!",
    firstName: "Platform",
    lastName: "Admin",
    businessName: "Admin Dashboard",
    role: "admin",
    sector: "administration",
    description: "General admin - Platform management",
    color: "from-blue-600 to-cyan-600",
    icon: "🎛️",
  },

  {
    id: "admin-2",
    username: "admin-commerce",
    email: "admin-commerce@versoair.com",
    password: "CommAdmin@2026!",
    firstName: "Commerce",
    lastName: "Administrator",
    businessName: "Commerce Sector Admin",
    role: "admin",
    sector: "commerce",
    description: "Commerce sector admin",
    color: "from-green-600 to-emerald-600",
    icon: "🏬",
  },

  {
    id: "admin-3",
    username: "admin-hospitality",
    email: "admin-hotel@versoair.com",
    password: "HotelAdmin@2026!",
    firstName: "Hospitality",
    lastName: "Manager",
    businessName: "Hospitality Admin",
    role: "admin",
    sector: "hotellerie",
    description: "Hospitality/Hotel sector admin",
    color: "from-purple-600 to-pink-600",
    icon: "🏨",
  },

  {
    id: "admin-4",
    username: "admin-construction",
    email: "admin-batiment@versoair.com",
    password: "BuildAdmin@2026!",
    firstName: "Construction",
    lastName: "Supervisor",
    businessName: "Construction Admin",
    role: "admin",
    sector: "batiment",
    description: "Construction/Building sector admin",
    color: "from-yellow-600 to-orange-600",
    icon: "🏗️",
  },

  {
    id: "admin-5",
    username: "admin-automotive",
    email: "admin-auto@versoair.com",
    password: "AutoAdmin@2026!",
    firstName: "Automotive",
    lastName: "Director",
    businessName: "Automotive Admin",
    role: "admin",
    sector: "automobile",
    description: "Automotive sector admin",
    color: "from-slate-600 to-gray-600",
    icon: "🚗",
  },

  {
    id: "admin-6",
    username: "admin-healthcare",
    email: "admin-health@versoair.com",
    password: "HealthAdmin@2026!",
    firstName: "Healthcare",
    lastName: "Coordinator",
    businessName: "Healthcare Admin",
    role: "admin",
    sector: "sante",
    description: "Healthcare/Medical sector admin",
    color: "from-red-600 to-rose-600",
    icon: "🏥",
  },

  {
    id: "admin-7",
    username: "admin-verifications",
    email: "verify@versoair.com",
    password: "VerifyAdmin@2026!",
    firstName: "Verification",
    lastName: "Officer",
    businessName: "Verification Center",
    role: "admin",
    description: "Business verification & approval",
    color: "from-indigo-600 to-blue-600",
    icon: "✅",
  },

  // ══════════════════════════════════════════════════════════
  // 👥 MODERATOR ACCOUNTS (Community management)
  // ══════════════════════════════════════════════════════════
  {
    id: "moderator-1",
    username: "moderator-main",
    email: "moderator@versoair.com",
    password: "Moderator@2026!",
    firstName: "Community",
    lastName: "Moderator",
    businessName: "Moderation Team",
    role: "moderator",
    description: "Main community moderator",
    color: "from-teal-600 to-green-600",
    icon: "🛠️",
  },

  // ══════════════════════════════════════════════════════════
  // 🏪 BUSINESS OWNER TEST ACCOUNTS
  // ══════════════════════════════════════════════════════════
  {
    id: "business-1",
    username: "owner-commerce-001",
    email: "commerce-owner@example.com",
    password: "Business@2026!",
    firstName: "Jean",
    lastName: "Merchant",
    businessName: "Jean's Electronics Store",
    role: "business-owner",
    sector: "commerce",
    description: "Commerce business owner (test)",
    color: "from-cyan-500 to-blue-500",
    icon: "🛍️",
  },

  {
    id: "business-2",
    username: "owner-hotel-001",
    email: "hotel-owner@example.com",
    password: "HotelBiz@2026!",
    firstName: "Marie",
    lastName: "Durand",
    businessName: "Hotel Côte d'Ivoire Luxury",
    role: "business-owner",
    sector: "hotellerie",
    description: "Hospitality business owner (test)",
    color: "from-pink-500 to-rose-500",
    icon: "🏨",
  },

  {
    id: "business-3",
    username: "owner-construction-001",
    email: "builder@example.com",
    password: "BuildCo@2026!",
    firstName: "Ahmed",
    lastName: "Construction",
    businessName: "Ahmed Building Solutions",
    role: "business-owner",
    sector: "batiment",
    description: "Construction business owner (test)",
    color: "from-amber-500 to-orange-500",
    icon: "🏗️",
  },

  {
    id: "business-4",
    username: "owner-automotive-001",
    email: "auto-dealer@example.com",
    password: "AutoShop@2026!",
    firstName: "Kofi",
    lastName: "Motors",
    businessName: "Kofi's Auto Parts & Service",
    role: "business-owner",
    sector: "automobile",
    description: "Automotive business owner (test)",
    color: "from-slate-500 to-gray-500",
    icon: "🚗",
  },

  {
    id: "business-5",
    username: "owner-healthcare-001",
    email: "clinic@example.com",
    password: "ClinicMed@2026!",
    firstName: "Dr. Sophie",
    lastName: "Medecin",
    businessName: "Clinique Sophie - Family Health",
    role: "business-owner",
    sector: "sante",
    description: "Healthcare provider (test)",
    color: "from-red-500 to-pink-500",
    icon: "⚕️",
  },

  {
    id: "business-6",
    username: "owner-artisan-001",
    email: "artisan@example.com",
    password: "Artisan@2026!",
    firstName: "Ibrahim",
    lastName: "Artisan",
    businessName: "Ibrahim Traditional Crafts",
    role: "business-owner",
    description: "Artisan/craftsperson (test)",
    color: "from-orange-500 to-amber-500",
    icon: "🎨",
  },

  {
    id: "business-7",
    username: "owner-restaurant-001",
    email: "chef@example.com",
    password: "Restaurant@2026!",
    firstName: "Chef",
    lastName: "Cuisine",
    businessName: "Chef's Authentic Restaurant",
    role: "business-owner",
    sector: "alimentation",
    description: "Restaurant owner (test)",
    color: "from-orange-600 to-red-500",
    icon: "🍽️",
  },

  // ══════════════════════════════════════════════════════════
  // 👤 REGULAR USER TEST ACCOUNTS
  // ══════════════════════════════════════════════════════════
  {
    id: "user-1",
    username: "user-test-001",
    email: "user.test@example.com",
    password: "UserTest@2026!",
    firstName: "Test",
    lastName: "User",
    businessName: "Personal Profile",
    role: "user",
    description: "Regular user account (test)",
    color: "from-emerald-500 to-teal-500",
    icon: "👤",
  },

  {
    id: "user-2",
    username: "user-test-002",
    email: "customer@example.com",
    password: "Customer@2026!",
    firstName: "Client",
    lastName: "Example",
    businessName: "Buyer Profile",
    role: "user",
    description: "Customer/buyer account (test)",
    color: "from-blue-500 to-cyan-500",
    icon: "🛒",
  },
];

/**
 * Helper functions for credential management
 */

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
  const colors: { [key: string]: string } = {
    superuser: "from-red-600 to-pink-600",
    admin: "from-blue-600 to-cyan-600",
    moderator: "from-teal-600 to-green-600",
    "business-owner": "from-emerald-600 to-teal-600",
    user: "from-gray-600 to-slate-600",
  };
  return colors[role] || "from-slate-600 to-gray-600";
}

export function getRoleIcon(role: string): string {
  const icons: { [key: string]: string } = {
    superuser: "👑",
    admin: "🛡️",
    moderator: "🛠️",
    "business-owner": "🏪",
    user: "👤",
  };
  return icons[role] || "👤";
}
