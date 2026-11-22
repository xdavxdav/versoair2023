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
  assert.ok(nooka.officialLinks.some((l) => l.platform === "spotify" && l.url.includes("2qtdNMrGdvad9V1ERBOpct")));
  assert.ok(nooka.officialLinks.some((l) => l.platform === "youtube" && l.url.includes("@nookawansh")));
});

test("featured artist lookup matches slug, stage name, and aliases", () => {
  assert.equal(getFeaturedArtistBySlug("nooka")?.stageName, "Nooka");
  assert.equal(getFeaturedArtistBySlug("unknown"), undefined);
  assert.equal(getFeaturedArtistByName("Nooka")?.slug, "nooka");
  assert.equal(getFeaturedArtistByName("Nooka Wansh")?.slug, "nooka");
  assert.equal(getFeaturedArtistByName("le Dashibah")?.slug, "nooka");
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
