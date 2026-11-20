import assert from "node:assert/strict";
import test from "node:test";
import { parseProfileLink } from "./profile-link";

test("parseProfileLink classifies SoundCloud and strips utm_* tracking params", () => {
  const res = parseProfileLink(
    "https://soundcloud.com/user-63192703-824225280?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.provider, "soundcloud");
    assert.equal(
      res.normalizedUrl,
      "https://soundcloud.com/user-63192703-824225280",
    );
    assert.equal(res.handle, "user-63192703-824225280");
  }
});

test("parseProfileLink rejects non-https, private hosts, and lookalike SoundCloud domains", () => {
  assert.equal(parseProfileLink("http://soundcloud.com/jdcz").ok, false);
  assert.equal(parseProfileLink("https://127.0.0.1/admin").ok, false);
  assert.equal(parseProfileLink("https://localhost/profile").ok, false);
  assert.equal(parseProfileLink("https://169.254.169.254/latest").ok, false);
  assert.equal(parseProfileLink("https://soundcloud.com.evil.com/jdcz").ok, false);
  assert.equal(parseProfileLink("https://user:pass@soundcloud.com/jdcz").ok, false);
});

test("parseProfileLink classifies other major music & social platforms", () => {
  const sp = parseProfileLink("https://open.spotify.com/artist/123?si=abc");
  assert.equal(sp.ok && sp.provider, "spotify");
  assert.equal(sp.ok && sp.normalizedUrl, "https://open.spotify.com/artist/123");

  const yt = parseProfileLink("https://www.youtube.com/@jdcz");
  assert.equal(yt.ok && yt.provider, "youtube");

  const bc = parseProfileLink("https://jdcz.bandcamp.com/");
  assert.equal(bc.ok && bc.provider, "bandcamp");
});
