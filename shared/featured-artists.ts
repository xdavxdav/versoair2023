export interface LocalizedText {
  fr: string;
  en: string;
}

export interface FeaturedArtistMediaLink {
  platform: "youtube" | "spotify" | "youtube_music" | "reference";
  label: string;
  url: string;
}

export interface FeaturedArtistRelease {
  year: string;
  title: string;
  kind: "album" | "single" | "compilation" | "clips";
  note: LocalizedText;
  mediaLinks: readonly FeaturedArtistMediaLink[];
}

export interface FeaturedArtistLink {
  platform: "youtube" | "spotify" | "instagram" | "facebook" | "x" | "press" | "reference";
  label: string;
  url: string;
}

export interface FeaturedArtistProfile {
  slug: string;
  stageName: string;
  aliases: readonly string[];
  group: string;
  groupMembers: readonly string[];
  city: string;
  countryCode: string;
  countryName: string;
  primaryGenre: string;
  genres: readonly string[];
  featuredFaceOfTmu: boolean;
  tagline: LocalizedText;
  bio: {
    fr: readonly string[];
    en: readonly string[];
  };
  discography: readonly FeaturedArtistRelease[];
  officialLinks: readonly FeaturedArtistLink[];
  pressLinks: readonly FeaturedArtistLink[];
}

export const NOOKA_PROFILE: FeaturedArtistProfile = {
  slug: "nooka",
  stageName: "Nooka",
  aliases: ["Nooka Wansh", "le Dashibah", "Nookzilla"],
  group: "Wansh Way",
  groupMembers: ["Nooka", "Parker-Ice"],
  city: "Abidjan",
  countryCode: "CI",
  countryName: "Côte d'Ivoire",
  primaryGenre: "Nouchi Rap",
  genres: ["Nouchi Rap", "Rap Ivoire", "Hip-Hop"],
  featuredFaceOfTmu: true,
  tagline: {
    fr: "Rappeur ivoirien d'Abidjan, figure du rap nouchi et co-fondateur du duo Wansh Way.",
    en: "Veteran Ivorian rapper from Abidjan, Nouchi rap voice, and co-founder of the duo Wansh Way.",
  },
  bio: {
    fr: [
      "Originaire d'Abidjan en Côte d'Ivoire, Nooka — également connu sous les noms de Nooka Wansh, « le Dashibah » et Nookzilla — est un rappeur ivoirien issu de la vague hip-hop du début des années 2000.",
      "Co-fondateur du duo Wansh Way aux côtés de son frère Parker-Ice, il s'est imposé par une écriture majoritairement en nouchi — l'argot urbain d'Abidjan — portée par une esthétique boom-bap et un « Rap puissant » ancré dans le réel ivoirien.",
      "De la compilation « Abidjan rap tour » (2012) et ses clips de 2014 jusqu'à « Makiwara » (2020, prod. Kyo Itachi) puis son album « Gbiyahée » (2021, 13 titres), il continue de faire rayonner le rap ivoire avec des sorties remarquées comme « Gbiyahe » (2023, prod. Azaia), « Faut te rada » sur « Génération Hip Hop 225 » (2023), « Yékélé » en featuring avec Djo Lango (2024) et « Djôlô (Remix) » (2024), ainsi qu'un passage remarqué sur BBC Afrique en 2024.",
    ],
    en: [
      "Hailing from Abidjan, Côte d'Ivoire, Nooka — also known as Nooka Wansh, \"le Dashibah\", and Nookzilla — is a veteran Ivorian rapper who emerged with the early-2000s Abidjan hip-hop wave.",
      "Co-founder of the rap duo Wansh Way alongside his brother Parker-Ice, he built his reputation delivering boom-bap and self-described \"Rap puissant\" largely in Nouchi, Abidjan's urban street slang.",
      "From the 2012 \"Abidjan rap tour\" compilation and 2014 music videos through \"Makiwara\" (2020, prod. Kyo Itachi) and his 13-track album \"Gbiyahée\" (2021), he has remained a steady voice of Rap Ivoire with \"Gbiyahe\" (2023, prod. Azaia), \"Faut te rada\" on \"Génération Hip Hop 225\" (2023), \"Yékélé\" featuring Djo Lango (2024), \"Djôlô (Remix)\" (2024), and a 2024 BBC Afrique feature.",
    ],
  },
  discography: [
    {
      year: "2024",
      title: "Djôlô (Remix)",
      kind: "single",
      note: { fr: "Sortie single (décembre 2024)", en: "Single release (December 2024)" },
      mediaLinks: [
        {
          platform: "youtube",
          label: "YouTube",
          url: "https://www.youtube.com/watch?v=jZxnZGITKkc",
        },
      ],
    },
    {
      year: "2024",
      title: "Yékélé (feat. Djo Lango)",
      kind: "single",
      note: { fr: "Collaboration avec Djo Lango", en: "Collaboration with Djo Lango" },
      mediaLinks: [
        {
          platform: "youtube_music",
          label: "YouTube Music",
          url: "https://music.youtube.com/channel/UCprAGdmBxQRe18PstYN934g",
        },
        {
          platform: "spotify",
          label: "Spotify",
          url: "https://open.spotify.com/artist/2qtdNMrGdvad9V1ERBOpct",
        },
      ],
    },
    {
      year: "2023",
      title: "Faut te rada",
      kind: "single",
      note: { fr: "Paru sur Génération Hip Hop 225", en: "Featured on Génération Hip Hop 225" },
      mediaLinks: [
        {
          platform: "youtube",
          label: "YouTube",
          url: "https://www.youtube.com/watch?v=WMvgNiSqDwg",
        },
      ],
    },
    {
      year: "2023",
      title: "Gbiyahe",
      kind: "single",
      note: { fr: "Clip officiel — prod. Azaia", en: "Official video — prod. Azaia" },
      mediaLinks: [
        {
          platform: "youtube",
          label: "YouTube",
          url: "https://www.youtube.com/watch?v=bfNaeTwO9Tk",
        },
      ],
    },
    {
      year: "2021",
      title: "Gbiyahée",
      kind: "album",
      note: { fr: "Album 13 titres (juillet 2021)", en: "13-track album (July 2021)" },
      mediaLinks: [
        {
          platform: "spotify",
          label: "Spotify",
          url: "https://open.spotify.com/artist/2qtdNMrGdvad9V1ERBOpct",
        },
        {
          platform: "youtube_music",
          label: "YouTube Music",
          url: "https://music.youtube.com/channel/UCprAGdmBxQRe18PstYN934g",
        },
      ],
    },
    {
      year: "2020",
      title: "Makiwara",
      kind: "single",
      note: { fr: "Single — prod. Kyo Itachi", en: "Single — prod. Kyo Itachi" },
      mediaLinks: [
        {
          platform: "spotify",
          label: "Spotify",
          url: "https://open.spotify.com/track/5vMJX3flzqszxzPQD3N48c",
        },
        {
          platform: "youtube_music",
          label: "YouTube Music",
          url: "https://music.youtube.com/channel/UCprAGdmBxQRe18PstYN934g",
        },
      ],
    },
    {
      year: "2014",
      title: "Cicatrices · Blê Blê · Trop Fly · On s'enjaille",
      kind: "clips",
      note: { fr: "Série de clips diffusés en 2014", en: "Series of 2014 music videos" },
      mediaLinks: [
        {
          platform: "youtube",
          label: "Cicatrices (YouTube)",
          url: "https://www.youtube.com/watch?v=3_Fvdu2Lhh0",
        },
        {
          platform: "youtube",
          label: "Clips (YouTube)",
          url: "https://www.youtube.com/@nookawansh/videos",
        },
      ],
    },
    {
      year: "2012",
      title: "Abidjan rap tour",
      kind: "compilation",
      note: { fr: "Compilation Coro'sol productions", en: "Coro'sol productions compilation" },
      mediaLinks: [
        {
          platform: "reference",
          label: "Music In Africa",
          url: "https://musicinafrica.net/node/9251",
        },
        {
          platform: "youtube",
          label: "YouTube",
          url: "https://www.youtube.com/@nookawansh/videos",
        },
      ],
    },
  ],
  officialLinks: [
    {
      platform: "youtube",
      label: "YouTube — NOOKA LEDASHIBAH",
      url: "https://www.youtube.com/@nookawansh",
    },
    {
      platform: "spotify",
      label: "Spotify",
      url: "https://open.spotify.com/artist/2qtdNMrGdvad9V1ERBOpct",
    },
    {
      platform: "instagram",
      label: "Instagram (@nookzilla_)",
      url: "https://www.instagram.com/nookzilla_/",
    },
    {
      platform: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/nookawansh",
    },
    {
      platform: "x",
      label: "X (@nookawansh)",
      url: "https://x.com/nookawansh",
    },
  ],
  pressLinks: [
    {
      platform: "press",
      label: "BBC Afrique (2024)",
      url: "https://www.youtube.com/watch?v=BJGaftZk-Q4",
    },
    {
      platform: "reference",
      label: "Music In Africa",
      url: "https://musicinafrica.net/node/9251",
    },
  ],
};

export const FEATURED_ARTISTS: readonly FeaturedArtistProfile[] = [NOOKA_PROFILE];

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function getFeaturedArtistBySlug(slug: string | undefined): FeaturedArtistProfile | undefined {
  if (!slug) return undefined;
  const key = normalizeKey(slug);
  return FEATURED_ARTISTS.find((a) => a.slug === key);
}

export function getFeaturedArtistByName(name: string | undefined): FeaturedArtistProfile | undefined {
  if (!name) return undefined;
  const key = normalizeKey(name);
  return FEATURED_ARTISTS.find(
    (a) =>
      normalizeKey(a.stageName) === key ||
      a.aliases.some((alias) => normalizeKey(alias) === key),
  );
}

export function getTmuFaceArtist(): FeaturedArtistProfile {
  return FEATURED_ARTISTS.find((a) => a.featuredFaceOfTmu) ?? NOOKA_PROFILE;
}
