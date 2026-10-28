export async function revokeSessionForLogout(
  token: string | null,
  revoke: (token: string) => Promise<void>,
): Promise<Error | null> {
  if (!token) return null;

  try {
    await revoke(token);
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}
