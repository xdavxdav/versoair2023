import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

// Guards server-side fetches of admin-supplied URLs (SSRF): only public
// http(s) hosts on ports 80/443 are reachable, and every redirect hop is
// re-validated.

export class UnsafeUrlError extends Error {
  readonly code = "UNSAFE_URL";
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type HostResolver = (hostname: string) => Promise<string[]>;

const blocked = new BlockList();

const BLOCKED_IPV4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

// IPv4-mapped IPv6 (::ffff:a.b.c.d) is matched against the IPv4 rules by
// BlockList itself, so it is intentionally not listed here. The translation
// prefixes (NAT64, 6to4, Teredo) embed an IPv4 address and are blocked whole.
const BLOCKED_IPV6: Array<[string, number]> = [
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

for (const [network, prefix] of BLOCKED_IPV4) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of BLOCKED_IPV6) {
  blocked.addSubnet(network, prefix, "ipv6");
}

export function isPrivateAddress(address: string): boolean {
  if (address.includes("%")) return true;
  const family = isIP(address);
  if (family === 0) return true;
  return blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

const resolveAll: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

export async function assertPublicHttpUrl(
  rawUrl: string,
  resolve: HostResolver = resolveAll,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("The URL is not valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs can be fetched.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed.");
  }
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (port !== "80" && port !== "443") {
    throw new UnsafeUrlError("Only ports 80 and 443 are allowed.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new UnsafeUrlError("The URL is not valid.");

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      throw new UnsafeUrlError("The host name could not be resolved.");
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError("That address is not publicly reachable.");
  }
  return url;
}

export interface PublicFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolve?: HostResolver;
  fetchImpl?: typeof fetch;
}

export interface PublicFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  text: string;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {});
}

async function readCappedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await discardBody(response);
    throw new Error("The response is too large.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error("The response is too large.");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export async function fetchPublicText(
  rawUrl: string,
  options: PublicFetchOptions = {},
): Promise<PublicFetchResult> {
  const {
    headers,
    timeoutMs = 15_000,
    maxBytes = 5 * 1024 * 1024,
    maxRedirects = 3,
    resolve,
    fetchImpl = fetch,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = rawUrl;
    for (let hop = 0; ; hop++) {
      const url = await assertPublicHttpUrl(current, resolve);
      const response = await fetchImpl(url.href, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });

      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        await discardBody(response);
        if (hop >= maxRedirects) throw new Error("Too many redirects.");
        current = new URL(location, url).href;
        continue;
      }

      const result = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: url.href,
      };
      if (!response.ok) {
        await discardBody(response);
        return { ...result, text: "" };
      }
      return { ...result, text: await readCappedText(response, maxBytes) };
    }
  } catch (err) {
    if (controller.signal.aborted) throw new Error("The request timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
