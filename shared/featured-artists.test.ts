import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURED_ARTISTS,
  getFeaturedArtistByName,
  getFeaturedArtistBySlug,
  getTmuFaceArtist,
} from "./featured-artists";
import { genreFilterValues } from "./music-genres";

test("Nooka is live as the featured face of TMU with verified metadata", () => {
  const nooka = getTmuFaceArtist();
  assert.equal(nooka.slug, "nooka");
  assert.equal(nooka.stageName, "Nooka");
  assert.equal(nooka.countryCode, "CI");
  assert.equal(nooka.group, "Wansh Way");
  assert.ok(nooka.aliases.includes("Nooka Wansh"));
  assert.ok(nooka.bio.fr.length >= 2 && nooka.bio.en.length >= 2);
  assert.ok(nooka.discography.some((r) => r.title === "Gbiyahée"));
  for (const release of nooka.discography) {
    assert.ok(release.mediaLinks.length > 0, `${release.title} must route to available media`);
    for (const link of release.mediaLinks) {
      assert.match(link.url, /^https:\/\//, `${release.title} media link must be HTTPS`);
    }
  }
  assert.ok(nooka.officialLinks.some((l) => l.platform === "spotify" && l.url.includes("2qtdNMrGdvad9V1ERBOpct")));
  assert.ok(nooka.officialLinks.some((l) => l.platform === "youtube" && l.url.includes("@nookawansh")));
});

test("featured artist lookup matches slug, stage name, and aliases", () => {
  assert.equal(getFeaturedArtistBySlug("nooka")?.stageName, "Nooka");
  assert.equal(getFeaturedArtistBySlug("kouzco")?.stageName, "Kouzco");
  assert.equal(getFeaturedArtistBySlug("deuzeus")?.stageName, "DeuZeus");
  assert.equal(getFeaturedArtistBySlug("unknown"), undefined);
  assert.equal(getFeaturedArtistByName("Nooka")?.slug, "nooka");
  assert.equal(getFeaturedArtistByName("Nooka Wansh")?.slug, "nooka");
  assert.equal(getFeaturedArtistByName("le Dashibah")?.slug, "nooka");
  assert.equal(getFeaturedArtistByName("Kouzco")?.slug, "kouzco");
  assert.equal(getFeaturedArtistByName("DeuZeus")?.slug, "deuzeus");
});

test("DeuZeus profile carries Canada (Surrey, BC) metadata and SoundCloud link", () => {
  const deuzeus = getFeaturedArtistBySlug("deuzeus");
  assert.ok(deuzeus);
  assert.equal(deuzeus.featuredFaceOfTmu, false);
  assert.equal(deuzeus.countryCode, "CA");
  assert.equal(deuzeus.countryName, "Canada");
  assert.equal(deuzeus.city, "Surrey, BC");
  assert.ok(
    deuzeus.officialLinks.some(
      (l) => l.platform === "soundcloud" && l.url === "https://soundcloud.com/DeuZeus",
    ),
  );
});

test("Kouzco profile carries verified SoundCloud links without invented fields", () => {
  const kouzco = getFeaturedArtistBySlug("kouzco");
  assert.ok(kouzco);
  assert.equal(kouzco.featuredFaceOfTmu, false);
  assert.ok(
    kouzco.officialLinks.some(
      (l) => l.platform === "soundcloud" && l.url === "https://soundcloud.com/kouzco",
    ),
  );
  assert.ok(
    kouzco.discography.some(
      (r) =>
        r.title === "The MD (feat. Manticore)" &&
        r.mediaLinks.some((m) => m.url === "https://soundcloud.com/kouzco/the-md-feat-manticore"),
    ),
  );
});

test("featured artist primary genre aligns with canonical taxonomy filtering", () => {
  for (const artist of FEATURED_ARTISTS) {
    const hipHopMatches = genreFilterValues("Hip-Hop");
    assert.ok(
      hipHopMatches.includes(artist.primaryGenre.toLowerCase()),
      `${artist.stageName} primary genre ${artist.primaryGenre} matches Hip-Hop family`,
    );
  }
});
