import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSoundCloudHydration,
  fetchProfileSnapshot,
} from "./profile-link-fetcher";

test("extractSoundCloudHydration parses nested JSON with brackets in strings", () => {
  const html = `<html><script>window.__sc_hydration = [{"hydratable":"user","data":{"id":1158104212,"username":"jdcz","city":"kpetoukro","description":"bio [with brackets] and \\"quotes\\"","followers_count":4,"track_count":3,"avatar_url":"https://i1.sndcdn.com/avatar.jpg","visuals":{"visuals":[{"visual_url":"https://i1.sndcdn.com/banner.jpg"}]}}}];</script></html>`;
  const parsed = extractSoundCloudHydration(html);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed[0].data.username, "jdcz");
  assert.equal(parsed[0].data.city, "kpetoukro");
});

test("fetchProfileSnapshot extracts SoundCloud user + tracks and blocks cross-host redirects", async () => {
  const profileHtml = `
    <html>
      <a href="/user-63192703-824225280/1-2-baku">1/2 baku</a>
      <script>
        window.__sc_hydration = [
          {"hydratable":"user","data":{"id":1158104212,"username":"jdcz","city":"kpetoukro","description":"i kill beats","followers_count":4,"followings_count":3,"track_count":3,"avatar_url":"https://i1.sndcdn.com/avatar.jpg","visuals":{"visuals":[{"visual_url":"https://i1.sndcdn.com/banner.jpg"}]}}}
        ];
      </script>
    </html>`;
  const trackHtml = `
    <html>
      <script>
        window.__sc_hydration = [
          {"hydratable":"sound","data":{"id":1962831663,"title":"1/2 baku","description":"Still in a trip","genre":"Hip-hop & Rap","duration":80000,"created_at":"2024-11-20T00:00:00Z","license":"all-rights-reserved","artwork_url":"https://i1.sndcdn.com/art-large.jpg","permalink_url":"https://soundcloud.com/user-63192703-824225280/1-2-baku","playback_count":20,"likes_count":1}}
        ];
      </script>
    </html>`;

  const fakeFetch = async (url: string) => {
    if (url.endsWith("/1-2-baku")) {
      return new Response(trackHtml, { status: 200 });
    }
    return new Response(profileHtml, { status: 200 });
  };

  const snap = await fetchProfileSnapshot(
    "https://soundcloud.com/user-63192703-824225280?utm_source=clipboard",
    fakeFetch,
  );
  assert.ok(snap);
  assert.equal(snap.sourceTier, "hydration");
  assert.equal(snap.username, "jdcz");
  assert.equal(snap.city, "kpetoukro");
  assert.equal(snap.bio, "i kill beats");
  assert.equal(snap.tracks.length, 1);
  assert.equal(snap.tracks[0].title, "1/2 baku");
  assert.equal(snap.tracks[0].durationSec, 80);

  const redirectFetch = async (url: string) => {
    if (url.includes("/oembed")) return new Response("nope", { status: 404 });
    return new Response(null, {
      status: 302,
      headers: { location: "https://evil.internal/secret" },
    });
  };
  const safeSnap = await fetchProfileSnapshot(
    "https://soundcloud.com/jdcz",
    redirectFetch,
  );
  assert.ok(safeSnap);
  assert.equal(safeSnap.sourceTier, "link_only");
});
