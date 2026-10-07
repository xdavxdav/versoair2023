/**
 * Admin sign-in input helpers.
 * Account authorization is performed by the server, not a client-side username list.
 */
export function generateAccessCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
}

export function validateAdminAccess(
  input: string,
  generatedCode: string,
): { isValid: boolean; error?: string; username?: string } {
  const separatorIndex = input.indexOf("/");
  if (separatorIndex < 0) {
    return { isValid: false, error: "Invalid format. Use: CODE/username" };
  }

  const code = input.slice(0, separatorIndex);
  const username = input.slice(separatorIndex + 1).trim();
  if (code !== generatedCode) {
    return {
      isValid: false,
      error: "Invalid access code. Please generate a new one.",
    };
  }

  if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) {
    return { isValid: false, error: "Enter a valid admin username." };
  }

  return { isValid: true, username };
}
