import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { scrapeDirectoryUrl } from "../services/web-scraper";
import {
  assertPublicHttpUrl,
  fetchPublicText,
  isPrivateAddress,
  UnsafeUrlError,
  type HostResolver,
} from "./public-url";

const PUBLIC_IP = "93.184.216.34";

const resolver: HostResolver = async (host) => {
  switch (host.replace(/\.$/, "")) {
    case "example.test":
    case "other.test":
      return [PUBLIC_IP];
    case "internal.test":
      return ["10.1.2.3"];
    case "mixed.test":
      return [PUBLIC_IP, "127.0.0.1"];
    case "localhost":
      return ["127.0.0.1", "::1"];
    case "empty.test":
      return [];
    default:
      throw new Error(`ENOTFOUND ${host}`);
  }
};

const PRIVATE_ADDRESSES = [
  "0.0.0.0",
  "0.255.255.255",
  "10.0.0.1",
  "10.255.255.255",
  "100.64.0.1",
  "100.127.255.255",
  "127.0.0.1",
  "127.255.255.254",
  "169.254.169.254",
  "172.16.0.1",
  "172.31.255.255",
  "192.0.0.1",
  "192.0.2.1",
  "192.88.99.1",
  "192.168.1.1",
  "198.18.0.1",
  "198.19.255.255",
  "198.51.100.7",
  "203.0.113.9",
  "224.0.0.1",
  "239.255.255.255",
  "240.0.0.1",
  "255.255.255.255",
  "::",
  "::1",
  "::2",
  "fc00::1",
  "fd12:3456:789a::1",
  "fe80::1",
  "fec0::1",
  "ff02::1",
  "2001:db8::1",
  "2001::1",
  "2002:7f00:1::1",
  "64:ff9b::7f00:1",
  "64:ff9b::808:808",
  "100::1",
  "::ffff:127.0.0.1",
  "::ffff:10.0.0.1",
  "::ffff:a9fe:a9fe",
  "fe80::1%eth0",
  "not-an-ip",
  "",
];

const PUBLIC_ADDRESSES = [
  "8.8.8.8",
  "1.1.1.1",
  PUBLIC_IP,
  "172.15.255.255",
  "172.32.0.1",
  "100.63.255.255",
  "100.128.0.1",
  "198.17.255.255",
  "198.20.0.1",
  "169.253.255.255",
  "169.255.0.1",
  "2606:4700:4700::1111",
  "2001:4860:4860::8888",
  "2a00:1450:4001:81b::200e",
  "::ffff:8.8.8.8",
];

test("isPrivateAddress blocks private, reserved and unparseable addresses", () => {
  for (const address of PRIVATE_ADDRESSES) {
    assert.equal(isPrivateAddress(address), true, `${address} must be blocked`);
  }
});

test("isPrivateAddress allows ordinary public addresses", () => {
  for (const address of PUBLIC_ADDRESSES) {
    assert.equal(
      isPrivateAddress(address),
      false,
      `${address} must be allowed`,
    );
  }
});

test("assertPublicHttpUrl accepts public http(s) URLs", async () => {
  for (const url of [
    "https://example.test/path?q=1#frag",
    "http://example.test/",
    "http://example.test:80/",
    "https://example.test:443/x",
    "HTTPS://EXAMPLE.TEST/",
    "https://[2606:4700:4700::1111]/",
    "http://8.8.8.8/",
  ]) {
    const parsed = await assertPublicHttpUrl(url, resolver);
    assert.ok(parsed instanceof URL, url);
  }
});

test("assertPublicHttpUrl rejects unsafe URLs", async () => {
  for (const url of [
    "",
    "not a url",
    "file:///etc/passwd",
    "ftp://example.test/",
    "gopher://example.test/",
    "javascript:alert(1)",
    "http://127.0.0.1/",
    "http://127.0.0.1:80/",
    "http://localhost/",
    "http://localhost./",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://0x7f.0.0.1/",
    "http://127.1/",
    "http://017700000001/",
    "http://0/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[fd00::1]/",
    "http://10.0.0.1/",
    "http://192.168.0.1/",
    "http://user:pass@example.test/",
    "http://user@example.test/",
    "http://example.test:22/",
    "http://example.test:8080/",
    "https://example.test:6379/",
    "http://internal.test/",
    "http://mixed.test/",
    "http://empty.test/",
    "http://nx.test/",
  ]) {
    await assert.rejects(
      assertPublicHttpUrl(url, resolver),
      UnsafeUrlError,
      `${url} must be rejected`,
    );
  }
});

test("assertPublicHttpUrl checks IP literals without resolving them", async () => {
  const neverResolve: HostResolver = async () => {
    throw new Error("must not resolve");
  };
  await assert.rejects(
    assertPublicHttpUrl("http://169.254.169.254/", neverResolve),
    /publicly reachable/,
  );
  await assert.doesNotReject(
    assertPublicHttpUrl("http://8.8.8.8/", neverResolve),
  );
});

test("assertPublicHttpUrl rejects localhost through the real resolver", async () => {
  await assert.rejects(
    assertPublicHttpUrl("http://localhost/"),
    UnsafeUrlError,
  );
});

function scriptedFetch(
  responses: Array<Response | (() => Response | Promise<Response>)>,
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra fetch");
    return typeof next === "function" ? next() : next;
  }) as typeof fetch;
  return { impl, calls };
}

const page = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, ...init });
const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } });

test("fetchPublicText returns the page text and passes headers through", async () => {
  const { impl, calls } = scriptedFetch([page("<p>hello</p>")]);
  const result = await fetchPublicText("https://example.test/a", {
    fetchImpl: impl,
    resolve: resolver,
    headers: { Accept: "text/html" },
  });
  assert.deepEqual(result, {
    ok: true,
    status: 200,
    statusText: "",
    url: "https://example.test/a",
    text: "<p>hello</p>",
  });
  assert.deepEqual(calls[0].init?.headers, { Accept: "text/html" });
});

test("fetchPublicText reports HTTP errors without reading the body", async () => {
  const { impl } = scriptedFetch([page("nope", { status: 404 })]);
  const result = await fetchPublicText("https://example.test/missing", {
    fetchImpl: impl,
    resolve: resolver,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.text, "");
});

test("fetchPublicText follows redirects manually, re-validating each hop", async () => {
  const { impl, calls } = scriptedFetch([
    redirect("https://other.test/final"),
    page("<p>done</p>"),
  ]);
  const result = await fetchPublicText("https://example.test/start", {
    fetchImpl: impl,
    resolve: resolver,
  });
  assert.deepEqual(
    calls.map((call) => call.url),
    ["https://example.test/start", "https://other.test/final"],
  );
  assert.ok(calls.every((call) => call.init?.redirect === "manual"));
  assert.equal(result.text, "<p>done</p>");
  assert.equal(result.url, "https://other.test/final");
});

test("fetchPublicText resolves relative redirects against the current URL", async () => {
  const { impl, calls } = scriptedFetch([
    redirect("/next?a=1", 301),
    page("ok"),
  ]);
  await fetchPublicText("https://example.test/start", {
    fetchImpl: impl,
    resolve: resolver,
  });
  assert.equal(calls[1].url, "https://example.test/next?a=1");
});

test("fetchPublicText refuses redirects to unsafe targets", async () => {
  for (const target of [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1/admin",
    "http://[::1]/",
    "http://internal.test/",
    "http://mixed.test/",
    "file:///etc/passwd",
    "ftp://example.test/",
    "https://example.test:6379/",
  ]) {
    const { impl, calls } = scriptedFetch([redirect(target), page("secret")]);
    await assert.rejects(
      fetchPublicText("https://example.test/start", {
        fetchImpl: impl,
        resolve: resolver,
      }),
      UnsafeUrlError,
      `redirect to ${target} must be refused`,
    );
    assert.equal(calls.length, 1, `${target} must never be requested`);
  }
});

test("fetchPublicText follows at most maxRedirects redirects", async () => {
  const tooMany = scriptedFetch([
    redirect("/1"),
    redirect("/2"),
    redirect("/3"),
    redirect("/4"),
    page("unreachable"),
  ]);
  await assert.rejects(
    fetchPublicText("https://example.test/", {
      fetchImpl: tooMany.impl,
      resolve: resolver,
    }),
    /Too many redirects/,
  );
  assert.equal(tooMany.calls.length, 4);

  const allowed = scriptedFetch([
    redirect("/1"),
    redirect("/2"),
    redirect("/3"),
    page("made it"),
  ]);
  const result = await fetchPublicText("https://example.test/", {
    fetchImpl: allowed.impl,
    resolve: resolver,
  });
  assert.equal(result.text, "made it");
});

test("fetchPublicText enforces the byte cap", async () => {
  const declared = scriptedFetch([
    page("tiny", { headers: { "content-length": "999999999" } }),
  ]);
  await assert.rejects(
    fetchPublicText("https://example.test/", {
      fetchImpl: declared.impl,
      resolve: resolver,
      maxBytes: 1024,
    }),
    /too large/,
  );

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < 3; i++) controller.enqueue(new Uint8Array(1024));
      controller.close();
    },
  });
  const streamedImpl = (async () => new Response(body)) as typeof fetch;
  await assert.rejects(
    fetchPublicText("https://example.test/", {
      fetchImpl: streamedImpl,
      resolve: resolver,
      maxBytes: 2048,
    }),
    /too large/,
  );

  const exact = scriptedFetch([page("x".repeat(2048))]);
  const result = await fetchPublicText("https://example.test/", {
    fetchImpl: exact.impl,
    resolve: resolver,
    maxBytes: 2048,
  });
  assert.equal(result.text.length, 2048);
});

test("fetchPublicText applies one overall timeout", async () => {
  const hanging = ((_input: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
    })) as typeof fetch;
  await assert.rejects(
    fetchPublicText("https://example.test/", {
      fetchImpl: hanging,
      resolve: resolver,
      timeoutMs: 25,
    }),
    /timed out/,
  );
});

test("fetchPublicText works with a real fetch: manual redirects and streamed cap", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/start") {
      res.writeHead(302, { location: "http://other.test/final" });
      res.end();
    } else if (req.url === "/final") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<p>real</p>");
    } else if (req.url === "/big") {
      res.writeHead(200);
      const chunk = Buffer.alloc(1024, 97);
      let sent = 0;
      const timer = setInterval(() => {
        if (res.destroyed || sent === 5) {
          clearInterval(timer);
          res.end();
          return;
        }
        res.write(chunk);
        sent++;
      }, 5);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const toLocalServer = ((input: string | URL | Request, init?: RequestInit) =>
    fetch(
      String(input).replace(/^https?:\/\/[^/]+/, `http://127.0.0.1:${port}`),
      init,
    )) as typeof fetch;

  try {
    const followed = await fetchPublicText("http://example.test/start", {
      fetchImpl: toLocalServer,
      resolve: resolver,
    });
    assert.equal(followed.text, "<p>real</p>");
    assert.equal(followed.url, "http://other.test/final");

    await assert.rejects(
      fetchPublicText("http://example.test/big", {
        fetchImpl: toLocalServer,
        resolve: resolver,
        maxBytes: 2048,
      }),
      /too large/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("scrapeDirectoryUrl never contacts a loopback server", async () => {
  let hits = 0;
  const server = createServer((_req, res) => {
    hits++;
    res.end("<html></html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    for (const target of [
      `http://127.0.0.1:${port}/`,
      `http://localhost:${port}/`,
      "http://169.254.169.254/latest/meta-data/",
    ]) {
      const result = await scrapeDirectoryUrl(target);
      assert.equal(result.success, false, target);
      assert.equal(result.businesses.length, 0, target);
      assert.equal(result.errors.length, 1, target);
    }
    assert.equal(hits, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("connection-time lookup refuses hosts that resolve to private addresses", async () => {
  const { publicOnlyLookup } = await import("./public-url");
  const err = await new Promise<Error | null>((done) =>
    publicOnlyLookup("localhost", {}, (e) => done(e)),
  );
  assert.ok(err, "localhost must be refused at connect time");
});

test("pinned fetch refuses a loopback server at connect time", async () => {
  const { publicOnlyFetch } = await import("./public-url");
  const http = await import("node:http");
  const { once } = await import("node:events");
  const server = http.createServer((_q, r) => r.end("secret"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  try {
    await assert.rejects(publicOnlyFetch(`http://localhost:${port}/`), {
      code: "UNSAFE_URL",
    });
  } finally {
    server.close();
  }
});
