export function getLegacySignInRedirect(search: string, hash: string): string {
  return `/auth/signin${search}${hash}`;
}
