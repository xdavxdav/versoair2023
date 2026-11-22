import type { GenreSeed } from "./types";

export const AFRICA_GENRES: readonly GenreSeed[] = [
  {
    slug: "afro-house",
    name: "Afro house",
    kind: "style",
    parent: "house",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q388100",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Afro_house",
        evidence: "Afro house (also known as Afro-house or Afrohouse) is a sub-genre of house music mainly developed in South Africa.",
      },
    ],
  },
  {
    slug: "afro-tech",
    name: "Afro tech",
    kind: "style",
    parent: "afro-house",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q123413364",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Afro_tech",
        evidence: "Afro tech (also Afro-tech or AfroTech) is a sub-genre of afro house which originates and is predominantly made in South Africa.",
      },
    ],
  },
  {
    slug: "afrobeat",
    name: "Afrobeat",
    kind: "style",
    parent: "afropop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q388296",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Afrobeat",
        evidence: "Afrobeat (also known as Afrofunk) is a West African music genre, fusing influences from Yoruba and Ghanaian (such as highlife) music with American funk, jazz, and soul influences.",
      },
    ],
  },
  {
    slug: "afrobeats",
    name: "Afrobeats",
    kind: "style",
    parent: "afropop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q25099840",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Afrobeats",
        evidence: "Afrobeats, not to be confused with Afrobeat or Afroswing, is an umbrella term to describe popular music from West Africa and the diaspora that initially developed in Nigeria, Ghana, and the UK in the 2000s and 2010s.",
      },
    ],
  },
  {
    slug: "alte",
    name: "Alté",
    kind: "style",
    parent: "afropop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q110592306",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Alt%C3%A9",
        evidence: "Alté is a fusion genre of music that combines elements of afrobeats, dancehall, reggae, hip hop, and alternative R&B.",
      },
    ],
  },
  {
    slug: "amapiano",
    name: "Amapiano",
    kind: "style",
    parent: "house",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q85741139",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Amapiano",
        evidence: "Amapiano is a genre of music from South Africa that became popular in the early 2020s.",
      },
    ],
  },
  {
    slug: "apala",
    name: "Apala",
    kind: "style",
    parent: null,
    countries: ["NG"],
    aliases: [],
    wikidata: "Q617338",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Apala",
        evidence: "Apala (or akpala) is a music genre originally developed by the Yoruba people of Nigeria, during the country's history as a colony of the British Empire.",
      },
    ],
  },
  {
    slug: "boeremusiek",
    name: "Boeremusiek",
    kind: "style",
    parent: "folk",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q3310676",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Boeremusiek",
        evidence: "Boeremusiek (Afrikaans: ‘Boer music’) is a type of South African instrumental folk music.",
      },
    ],
  },
  {
    slug: "coupe-decale",
    name: "Coupé-Décalé",
    kind: "style",
    parent: "dancehall",
    countries: ["CI"],
    aliases: ["Coupe decale"],
    wikidata: "Q513357",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Coup%C3%A9-d%C3%A9cal%C3%A9",
        evidence: "is a type of popular dance music originating in Côte d'Ivoire.",
      },
    ],
  },
  {
    slug: "drill-ivoire",
    name: "Drill Ivoire",
    kind: "style",
    parent: "hip-hop",
    countries: ["CI"],
    aliases: ["Drill ivoirienne","Drill nouchi"],
    sources: [
      {
        url: "https://www.rfi.fr/fr/musique/20241223-himra-le-roi-de-la-drill-ivoire",
        evidence: "Avec sa drill Ivoire, Himra est parvenu à tracer sa propre voie, et à y connaître le succès.",
      },
    ],
  },
  {
    slug: "edo-funk",
    name: "Edo Funk",
    kind: "style",
    parent: "funk",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q105962378",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Edo_Funk",
        evidence: "Edo funk is a musical style from Benin City, Edo State, created in the early 1970s.",
      },
    ],
  },
  {
    slug: "gbegbe",
    name: "Gbégbé",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: [],
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Music_of_Ivory_Coast",
        evidence: "Gbégbé, a Bété rhythm, has been a part of popular music since Ivory Coast's independence…",
      },
    ],
  },
  {
    slug: "gqom",
    name: "Gqom",
    kind: "style",
    parent: "house",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q29973057",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Gqom",
        evidence: "Gqom, igqomu ([iᶢǃʱòmu]), gqom tech, sgubhu, 3-step or G.Q.O.M is a South African electronic dance music genre and subgenre of house music, that emerged in the early 2010s from Durban, pioneered and innovated by music producers Naked Boyz,…",
      },
    ],
  },
  {
    slug: "igbo-highlife",
    name: "Igbo highlife",
    kind: "style",
    parent: "afropop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q18208255",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Igbo_highlife",
        evidence: "Igbo highlife is a contemporary musical genre that combines highlife and Igbo traditional music.",
      },
    ],
  },
  {
    slug: "igbo-rap",
    name: "Igbo rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q18204859",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Igbo_rap",
        evidence: "Igbo rap is a Nigerian style of hip hop music that originated in the Igbo-dominated southeastern region of Nigeria and has become more popular since 2000.",
      },
    ],
  },
  {
    slug: "isicathamiya",
    name: "Isicathamiya",
    kind: "style",
    parent: null,
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q1673922",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Isicathamiya",
        evidence: "Isicathamiya is a singing style that originated from the Zulu people, a South African ethnic group.",
      },
    ],
  },
  {
    slug: "juju-music",
    name: "Jùjú music",
    kind: "style",
    parent: "afropop",
    countries: ["NG"],
    aliases: [],
    wikidata: "Q1715700",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/J%C3%B9j%C3%BA_music",
        evidence: "Jùjú is a style of Yoruba popular music, originated in Lagos, Nigeria.",
      },
    ],
  },
  {
    slug: "kwaito",
    name: "Kwaito",
    kind: "style",
    parent: "house",
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q956717",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Kwaito",
        evidence: "Kwaito is a music genre that emerged in Soweto, Johannesburg, South Africa, between the late 1980s and 1990s.",
      },
    ],
  },
  {
    slug: "kwela",
    name: "Kwela",
    kind: "style",
    parent: null,
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q1736883",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Kwela",
        evidence: "Kwela is a genre of street music originating from southern Africa.",
      },
    ],
  },
  {
    slug: "laba-laba",
    name: "Laba Laba",
    kind: "style",
    parent: "ziglibithy",
    countries: ["CI"],
    aliases: [],
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Music_of_Ivory_Coast",
        evidence: "Luckson Padaud's laba laba style, which is similar to the Bété ziglibithy, has had some success…",
      },
    ],
  },
  {
    slug: "logobi",
    name: "Logobi",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: ["Logobie"],
    wikidata: "Q373982",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Logobi",
        evidence: "Logobi (also written in French as Logobie) is an Ivorian musical genre…",
      },
    ],
  },
  {
    slug: "marabi",
    name: "Marabi",
    kind: "style",
    parent: null,
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q2798694",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Marabi",
        evidence: "Marabi is a style of music and dance form that evolved and emerged in South Africa between the 1890s and 1920s.",
      },
    ],
  },
  {
    slug: "maskandi",
    name: "Maskandi",
    kind: "style",
    parent: null,
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q6783396",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Maskandi",
        evidence: "Maskandi (also Maskanda) is a form of Zulu folk music, originally associated with migrant workers, that is evolving with South African society.",
      },
    ],
  },
  {
    slug: "mbaqanga",
    name: "Mbaqanga",
    kind: "style",
    parent: null,
    countries: ["ZA"],
    aliases: [],
    wikidata: "Q1914924",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Mbaqanga",
        evidence: "Mbaqanga is a style of South African music that emerged in the early 1960s in the urban townships, particularly around Johannesburg.",
      },
    ],
  },
  {
    slug: "nouchi-rap",
    name: "Nouchi Rap",
    kind: "style",
    parent: "rap-ivoire",
    countries: ["CI"],
    aliases: ["Rap nouchi","Nouchi hip-hop"],
    sources: [
      {
        url: "https://l-express.ca/nash-ambassadrice-du-rap-nouchi/",
        evidence: "Nash popularise le «rap nouchi».",
      },
    ],
  },
  {
    slug: "polihet",
    name: "Polihet",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: [],
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Music_of_Ivory_Coast",
        evidence: "Luckson Padaud's laba laba style, which is similar to the Bété ziglibithy, has had some success, as has Gnaore Djimi's polihet.",
      },
    ],
  },
  {
    slug: "rap-dogba",
    name: "Rap Dogba",
    kind: "style",
    parent: "rap-ivoire",
    countries: ["CI"],
    aliases: [],
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Music_of_Ivory_Coast",
        evidence: "includes a gangsta rap-influenced style called rap dogba",
      },
    ],
  },
  {
    slug: "rap-ivoire",
    name: "Rap Ivoire",
    kind: "style",
    parent: "hip-hop",
    countries: ["CI"],
    aliases: ["Ivorian hip-hop","Hip-hop ivoirien","Rap ivoirien","Ivorian hip hop"],
    wikidata: "Q3135791",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Ivorian_hip-hop",
        evidence: "Hip hop is a major part of the popular music of Côte d'Ivoire, and has been fused with many of the country's native styles, such as zouglou.",
      },
    ],
  },
  {
    slug: "sakara-music",
    name: "Sakara music",
    kind: "style",
    parent: null,
    countries: ["NG"],
    aliases: [],
    wikidata: "Q7402829",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Sakara_music",
        evidence: "Sakara music is a form of popular Nigerian music based in the traditions of Yoruba music.",
      },
    ],
  },
  {
    slug: "ziglibithy",
    name: "Ziglibithy",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: [],
    wikidata: "Q199415",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Ziglibithy",
        evidence: "Ziglibithy is a style of Ivorian popular music that developed in the 1970s.",
      },
    ],
  },
  {
    slug: "zoblazo",
    name: "Zoblazo",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: [],
    wikidata: "Q3575673",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Zoblazo",
        evidence: "Zoblazo is a musical style from Abidjan, Côte d'Ivoire, created in the early 1990s.",
      },
    ],
  },
  {
    slug: "zouglou",
    name: "Zouglou",
    kind: "style",
    parent: null,
    countries: ["CI"],
    aliases: [],
    wikidata: "Q227036",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Zouglou",
        evidence: "is a dance oriented style of music originated from Ivory Coast during the mid-1990s.",
      },
    ],
  },
];
