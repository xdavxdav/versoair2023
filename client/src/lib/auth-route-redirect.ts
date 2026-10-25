export function getLegacySignInRedirect(search: string, hash: string): string {
  return `/auth/signin${renameReturnTo(search)}${hash}`;
}

// Older links carry the destination as `returnTo`, but the sign-in page only reads `redirect`.
function renameReturnTo(search: string): string {
  if (!search.startsWith("?")) return search;

  const parts = search.slice(1).split("&");
  const keyOf = (part: string) => part.split("=", 1)[0];
  if (parts.some((part) => keyOf(part) === "redirect")) return search;

  const index = parts.findIndex((part) => keyOf(part) === "returnTo");
  if (index === -1) return search;

  parts[index] = `redirect${parts[index].slice("returnTo".length)}`;
  return `?${parts.join("&")}`;
}
