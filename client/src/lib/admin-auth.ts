/**
 * Admin Authentication Utilities
 * Handles password generation, admin validation, and authentication logic
 */

// Admin users list - can be expanded or moved to backend
// canAccessVault: only the site creator (SuperAdmin) can reach the Credentials Vault
export const ADMIN_USERS = [
  { username: "joel_007", name: "Joel", role: "SuperAdmin", canAccessVault: true },
  { username: "admin_001", name: "Admin User", role: "Admin", canAccessVault: false },
  { username: "manager_001", name: "Manager", role: "Manager", canAccessVault: false },
];

/**
 * Generates a random 6-digit code (000000-999999)
 * @returns {string} 6-digit numeric code
 */
export function generateAccessCode(): string {
  const code = Math.floor(Math.random() * 1000000);
  return code.toString().padStart(6, "0");
}

/**
 * Validates admin access format and credentials
 * Format: XXXXXX/username
 * @param input - Combined input of code and username
 * @param generatedCode - The generated code to validate against
 * @returns {object} { isValid, error, user }
 */
export function validateAdminAccess(
  input: string,
  generatedCode: string,
): { isValid: boolean; error?: string; user?: (typeof ADMIN_USERS)[0] } {
  // Check format
  if (!input.includes("/")) {
    return {
      isValid: false,
      error: "Invalid format. Use: CODE/username",
    };
  }

  const [code, username] = input.split("/");

  // Validate code
  if (code !== generatedCode) {
    return {
      isValid: false,
      error: "Invalid access code. Please generate a new one.",
    };
  }

  // Validate username exists in admin list
  const user = ADMIN_USERS.find((u) => u.username === username);
  if (!user) {
    return {
      isValid: false,
      error: `Username '${username}' not found in admin list. Access denied.`,
    };
  }

  return {
    isValid: true,
    user,
  };
}

/**
 * Get list of valid admin usernames for display
 * @returns {string[]} Array of valid usernames
 */
export function getValidAdminUsernames(): string[] {
  return ADMIN_USERS.map((u) => u.username);
}

/**
 * Get admin user details by username
 * @param username - Admin username
 * @returns {object|null} Admin user object or null if not found
 */
export function getAdminUser(username: string): (typeof ADMIN_USERS)[0] | null {
  return ADMIN_USERS.find((u) => u.username === username) || null;
}

/**
 * Check if a username exists in admin list
 * @param username - Username to check
 * @returns {boolean}
 */
export function isValidAdminUsername(username: string): boolean {
  return ADMIN_USERS.some((u) => u.username === username);
}

/**
 * Check if a given admin username has vault access
 * Only the site creator (SuperAdmin) can access the Credentials Vault.
 * @param username - Admin username to check
 * @returns {boolean}
 */
export function canAccessVault(username: string): boolean {
  const user = ADMIN_USERS.find((u) => u.username === username);
  return user?.canAccessVault === true;
}
