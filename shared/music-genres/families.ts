import type { GenreSeed } from "./types";

export const FAMILY_GENRES: readonly GenreSeed[] = [
  {
    slug: "afropop",
    name: "Afropop",
    kind: "family",
    parent: null,
    countries: [],
    aliases: ["Afro-pop","African pop"],
    wikidata: "Q972634",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/African_popular_music",
        evidence: "African popular music (also styled Afropop, Afro-pop, Afro pop or African pop) can be defined as any African music, regardless of genre, that uses Western pop musical instruments, such as the guitar, piano, trumpet, etc.",
      },
    ],
  },
  {
    slug: "blues",
    name: "Blues",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q9759",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Blues",
        evidence: "Blues is a music genre and musical form that originated among African Americans in the Deep South of the United States around the 1860s.",
      },
    ],
  },
  {
    slug: "caribbean",
    name: "Caribbean",
    kind: "family",
    parent: null,
    countries: [],
    aliases: [],
    wikidata: "Q10563340",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/List_of_Caribbean_music_genres",
        evidence: "Caribbean music genres are very diverse.",
      },
    ],
  },
  {
    slug: "classical",
    name: "Classical",
    kind: "family",
    parent: null,
    countries: [],
    aliases: [],
    wikidata: "Q9730",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Classical_music",
        evidence: "Classical music is a tradition of art music in the Western world, considered to be distinct from Western folk music or popular music.",
      },
    ],
  },
  {
    slug: "country",
    name: "Country",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q83440",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Country_music",
        evidence: "Country music, also known as country and western or simply country, is a music genre originating from the United States.",
      },
    ],
  },
  {
    slug: "dancehall",
    name: "Dancehall",
    kind: "family",
    parent: null,
    countries: ["JM"],
    aliases: [],
    wikidata: "Q474027",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Dancehall",
        evidence: "Dancehall is a genre of Jamaican popular music that originated in the late 1970s.",
      },
    ],
  },
  {
    slug: "electronic",
    name: "Electronic",
    kind: "family",
    parent: null,
    countries: [],
    aliases: ["Electronica"],
    wikidata: "Q9778",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Electronic_music",
        evidence: "Electronic music broadly is a group of music genres that employ electronic musical instruments, circuitry-based music technology and software, or general-purpose electronics (such as personal computers) in its creation.",
      },
    ],
  },
  {
    slug: "folk",
    name: "Folk",
    kind: "family",
    parent: null,
    countries: [],
    aliases: [],
    wikidata: "Q43343",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Folk_music",
        evidence: "Folk music is a music genre that includes traditional folk music and the contemporary genre that evolved from the former during the 20th-century folk revival.",
      },
    ],
  },
  {
    slug: "funk",
    name: "Funk",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q164444",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funk",
        evidence: "Funk is a music genre that originated in African-American communities in the mid-1960s when musicians created a rhythmic, danceable new form of music through a mixture of various music genres that were popular among African-Americans in the…",
      },
    ],
  },
  {
    slug: "gospel",
    name: "Gospel",
    kind: "family",
    parent: null,
    countries: [],
    aliases: [],
    wikidata: "Q180268",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Gospel_music",
        evidence: "Gospel music is a traditional genre of Christian music and a cornerstone of Christian media, characterized by dominant vocals (often with strong harmonies) and lyrics that reflect Christian teachings and values.",
      },
    ],
  },
  {
    slug: "hip-hop",
    name: "Hip-Hop",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: ["Hip-hop & Rap","Hip Hop","Rap","Hip-hop and Rap"],
    wikidata: "Q11401",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Hip-hop",
        evidence: "Hip-hop (also known as rap music or simply rap) is a genre of popular music that emerged in the early 1970s alongside an associated subculture in New York City.",
      },
    ],
  },
  {
    slug: "house",
    name: "House",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q20502",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/House_music",
        evidence: "House music, or simply house, is a type of electronic dance music which is characterized by a repetitive four-on-the-floor beat and a typical tempo of 115–130 beats per minute.",
      },
    ],
  },
  {
    slug: "jazz",
    name: "Jazz",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q8341",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Jazz",
        evidence: "Jazz is a music genre that originated in the African-American communities of New Orleans, Louisiana, in the late 19th and early 20th centuries.",
      },
    ],
  },
  {
    slug: "latin",
    name: "Latin",
    kind: "family",
    parent: null,
    countries: [],
    aliases: [],
    wikidata: "Q18345375",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Latin_music",
        evidence: "Latin music (Portuguese and Spanish: música latina) is a term used by the music industry as a catch-all category for various styles of Spanish- and Portuguese-language music genres from Latin America, Spain, Portugal, and the Latino diaspora in…",
      },
    ],
  },
  {
    slug: "metal",
    name: "Metal",
    kind: "family",
    parent: null,
    countries: ["GB","US"],
    aliases: ["Heavy metal"],
    wikidata: "Q38848",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Heavy_metal_music",
        evidence: "Heavy metal (or simply metal) is a genre of rock music that developed in the late 1960s and early 1970s, largely in the United Kingdom and United States.",
      },
    ],
  },
  {
    slug: "pop",
    name: "Pop",
    kind: "family",
    parent: null,
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q37073",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pop_music",
        evidence: "Pop music, or simply pop, is a genre of popular music that originated in its modern form during the mid-1950s in the United States and the United Kingdom.",
      },
    ],
  },
  {
    slug: "punk",
    name: "Punk",
    kind: "family",
    parent: null,
    countries: ["US","GB"],
    aliases: ["Punk rock"],
    wikidata: "Q3071",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Punk_rock",
        evidence: "Punk rock (or simply punk) is a genre of rock music that emerged in the mid-1970s.",
      },
    ],
  },
  {
    slug: "r-and-b",
    name: "R&B",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: ["RnB","Rhythm and blues","R and B"],
    wikidata: "Q850412",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Contemporary_R%26B",
        evidence: "Contemporary R&B is a popular music genre, originating from African-American musicians in the 1970s that combines rhythm and blues with elements of pop, disco, funk, soul, jazz, blues, electronic and hip-hop.",
      },
    ],
  },
  {
    slug: "reggae",
    name: "Reggae",
    kind: "family",
    parent: null,
    countries: ["JM"],
    aliases: [],
    wikidata: "Q9794",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Reggae",
        evidence: "Reggae ( ) is a music genre that originated in Jamaica in the late 1960s.",
      },
    ],
  },
  {
    slug: "rock",
    name: "Rock",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q11399",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rock_music",
        evidence: "Rock music is a genre of popular music that originated in the United States as \"rock and roll\" in the late 1940s and early 1950s, developing into a range of styles from the late 1950s to mid-1960s, primarily in the United States and United Kingdom.",
      },
    ],
  },
  {
    slug: "soul",
    name: "Soul",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q131272",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Soul_music",
        evidence: "Soul music is a popular music genre that originated in African-American communities throughout the United States in the late 1950s and early 1960s.",
      },
    ],
  },
  {
    slug: "techno",
    name: "Techno",
    kind: "family",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q170611",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Techno",
        evidence: "Techno is a genre of electronic music which is generally produced for use in a continuous DJ set, with tempos being in the range from 120 to 150 beats per minute (bpm).",
      },
    ],
  },
];
