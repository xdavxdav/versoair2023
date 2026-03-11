/**
 * Verso Air Streaming Platform — Seed Data
 * Seeds 25 real artists with albums, tracks, and demo analytics
 */
import { pool } from "../db";

// ═══════════════════════════════════════════════════════════
// REAL ARTIST DATA — Verso Air Music Label Roster
// ═══════════════════════════════════════════════════════════
const ARTISTS = [
  {
    name: "DJ Arafat Legacy",
    genre: "Coupé-Décalé",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    labelStatus: "signed",
    biography:
      "Ange Didier Houon, known as DJ Arafat, was an Ivorian DJ and singer, dubbed the 'King of Coupé-Décalé'. His legacy continues through his music and cultural impact on African dance music. A pioneer of the Coupé-Décalé movement, he won multiple awards including Best Artist of the Year at the PRIMUD Awards.",
    spotifyUrl: "https://open.spotify.com/artist/6vhMVVjhPBfKMKVMzIkVfi",
    wikiUrl: "https://en.wikipedia.org/wiki/DJ_Arafat",
    verified: true,
    monthlyListeners: 2400000,
    totalStreams: 89000000,
    followers: 1850000,
    albums: [
      {
        title: "Commandant Zabra",
        type: "album",
        year: 2018,
        tracks: [
          {
            title: "Dosabado",
            duration: 234,
            bpm: 128,
            mood: "energetic",
            streams: 12500000,
          },
          {
            title: "Kpangor",
            duration: 198,
            bpm: 132,
            mood: "party",
            streams: 18200000,
          },
          {
            title: "Moto Moto",
            duration: 215,
            bpm: 126,
            mood: "dance",
            streams: 9800000,
          },
          {
            title: "Yorobo",
            duration: 247,
            bpm: 130,
            mood: "energetic",
            streams: 7600000,
          },
        ],
      },
      {
        title: "Reste Au Calme",
        type: "single",
        year: 2019,
        tracks: [
          {
            title: "Reste Au Calme",
            duration: 203,
            bpm: 125,
            mood: "chill",
            streams: 15300000,
          },
        ],
      },
    ],
  },
  {
    name: "Stromae",
    genre: "Electronic",
    country: "Belgium",
    countryCode: "BE",
    biography:
      "Paul Van Haver, known as Stromae, is a Belgian singer-songwriter and rapper. Known for his innovative blend of electronic music with African rhythms, he became an international sensation with 'Alors on danse'. His album 'Racine carrée' sold over 6 million copies worldwide.",
    spotifyUrl: "https://open.spotify.com/artist/3Isy6kedDrgPYoTS1dazA9",
    wikiUrl: "https://en.wikipedia.org/wiki/Stromae",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 8900000,
    totalStreams: 450000000,
    followers: 5200000,
    albums: [
      {
        title: "Racine carrée",
        type: "album",
        year: 2013,
        tracks: [
          {
            title: "Papaoutai",
            duration: 233,
            bpm: 120,
            mood: "emotional",
            streams: 95000000,
          },
          {
            title: "Formidable",
            duration: 215,
            bpm: 108,
            mood: "melancholy",
            streams: 67000000,
          },
          {
            title: "Tous les mêmes",
            duration: 205,
            bpm: 116,
            mood: "sardonic",
            streams: 42000000,
          },
          {
            title: "Ta fête",
            duration: 173,
            bpm: 128,
            mood: "energetic",
            streams: 31000000,
          },
          {
            title: "Ave Cesaria",
            duration: 238,
            bpm: 100,
            mood: "smooth",
            streams: 28000000,
          },
        ],
      },
      {
        title: "Multitude",
        type: "album",
        year: 2022,
        tracks: [
          {
            title: "Santé",
            duration: 197,
            bpm: 122,
            mood: "upbeat",
            streams: 52000000,
          },
          {
            title: "L'enfer",
            duration: 189,
            bpm: 90,
            mood: "dark",
            streams: 38000000,
          },
          {
            title: "Invaincu",
            duration: 210,
            bpm: 104,
            mood: "powerful",
            streams: 19000000,
          },
        ],
      },
    ],
  },
  {
    name: "Angélique Kidjo",
    genre: "World Music",
    country: "Benin",
    countryCode: "BJ",
    biography:
      "Angélique Kidjo is a Beninese singer-songwriter and actress, referred to as 'Africa's premier diva'. A five-time Grammy Award winner, she is noted for her diverse musical influences and her creative music videos. She was named the 'undisputed queen of African music' by The Guardian.",
    spotifyUrl: "https://open.spotify.com/artist/7vmCVOaEJoTbJsyFJjkVOV",
    wikiUrl: "https://en.wikipedia.org/wiki/Ang%C3%A9lique_Kidjo",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 1200000,
    totalStreams: 78000000,
    followers: 890000,
    albums: [
      {
        title: "Mother Nature",
        type: "album",
        year: 2021,
        tracks: [
          {
            title: "Africa, One of a Kind",
            duration: 240,
            bpm: 110,
            mood: "uplifting",
            streams: 8500000,
          },
          {
            title: "Dignity",
            duration: 218,
            bpm: 98,
            mood: "powerful",
            streams: 6200000,
          },
          {
            title: "Do Yourself",
            duration: 196,
            bpm: 116,
            mood: "groovy",
            streams: 5100000,
          },
        ],
      },
      {
        title: "Celia",
        type: "album",
        year: 2019,
        tracks: [
          {
            title: "Tumba",
            duration: 225,
            bpm: 108,
            mood: "festive",
            streams: 4800000,
          },
          {
            title: "Ominira",
            duration: 232,
            bpm: 102,
            mood: "soulful",
            streams: 3900000,
          },
        ],
      },
    ],
  },
  {
    name: "Fally Ipupa",
    genre: "Rumba",
    country: "Congo RDC",
    countryCode: "CD",
    biography:
      "Fally Ipupa N'simba, known as Fally Ipupa, is a Congolese singer-songwriter, dancer, philanthropist, and guitarist. Former member of Quartier Latin International, he went solo and became one of Africa's biggest stars. His music blends Congolese rumba with R&B and pop.",
    spotifyUrl: "https://open.spotify.com/artist/0kROdfzmC3JuDNH0oyBKgL",
    wikiUrl: "https://en.wikipedia.org/wiki/Fally_Ipupa",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 3800000,
    totalStreams: 195000000,
    followers: 2900000,
    albums: [
      {
        title: "Tokooos II",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Likolo",
            duration: 262,
            bpm: 105,
            mood: "romantic",
            streams: 28000000,
          },
          {
            title: "Amore",
            duration: 245,
            bpm: 98,
            mood: "love",
            streams: 22000000,
          },
          {
            title: "Bloqué",
            duration: 230,
            bpm: 112,
            mood: "dance",
            streams: 35000000,
          },
          {
            title: "Juste une danse",
            duration: 218,
            bpm: 108,
            mood: "groovy",
            streams: 19000000,
          },
        ],
      },
      {
        title: "Control",
        type: "album",
        year: 2018,
        tracks: [
          {
            title: "Eloko Oyo",
            duration: 280,
            bpm: 95,
            mood: "soulful",
            streams: 42000000,
          },
        ],
      },
    ],
  },
  {
    name: "Ferre Gola",
    genre: "Rumba",
    country: "Congo RDC",
    countryCode: "CD",
    biography:
      "Ferre Gola Bataringe is a Congolese musician and vocalist, known as one of the greatest voices in Congolese rumba. Former member of Wenge Musica Maison Mère, his powerful tenor voice and dynamic stage presence have earned him a massive following across Africa.",
    wikiUrl: "https://en.wikipedia.org/wiki/Ferre_Gola",
    verified: true,
    labelStatus: "independent",
    monthlyListeners: 1600000,
    totalStreams: 95000000,
    followers: 1200000,
    albums: [
      {
        title: "Ça va se savoir",
        type: "album",
        year: 2019,
        tracks: [
          {
            title: "Jugement",
            duration: 345,
            bpm: 90,
            mood: "emotional",
            streams: 12000000,
          },
          {
            title: "Vita Imana",
            duration: 310,
            bpm: 88,
            mood: "spiritual",
            streams: 8500000,
          },
          {
            title: "QQJD",
            duration: 275,
            bpm: 95,
            mood: "reflective",
            streams: 7200000,
          },
        ],
      },
    ],
  },
  {
    name: "Koffi Olomide",
    genre: "Soukous",
    country: "Congo RDC",
    countryCode: "CD",
    biography:
      "Antoine Christophe Agbepa Mumba, known as Koffi Olomidé, is a Congolese singer, dancer, producer, and composer. Often referred to as the 'Grand Mopao', he is one of the most successful African musicians of all time with over 30 albums spanning four decades.",
    wikiUrl: "https://en.wikipedia.org/wiki/Koffi_Olomid%C3%A9",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 2100000,
    totalStreams: 180000000,
    followers: 1800000,
    albums: [
      {
        title: "13ème Apôtre",
        type: "album",
        year: 2013,
        tracks: [
          {
            title: "Selfie",
            duration: 295,
            bpm: 98,
            mood: "dance",
            streams: 25000000,
          },
          {
            title: "Elegance",
            duration: 268,
            bpm: 92,
            mood: "smooth",
            streams: 18000000,
          },
          {
            title: "Loi",
            duration: 312,
            bpm: 85,
            mood: "romantic",
            streams: 22000000,
          },
        ],
      },
    ],
  },
  {
    name: "Alpha Blondy",
    genre: "Reggae",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Seydou Koné, known as Alpha Blondy, is an Ivorian reggae singer-songwriter. Singing in Dioula, French, English, Arabic, and Hebrew, he is one of the most internationally recognized African reggae artists. His socially conscious lyrics address peace, unity, and justice.",
    spotifyUrl: "https://open.spotify.com/artist/2c1ubG3GDNyiNpauTGafry",
    wikiUrl: "https://en.wikipedia.org/wiki/Alpha_Blondy",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 950000,
    totalStreams: 62000000,
    followers: 720000,
    albums: [
      {
        title: "Positive Energy",
        type: "album",
        year: 2015,
        tracks: [
          {
            title: "Whole Lotta Love",
            duration: 256,
            bpm: 80,
            mood: "uplifting",
            streams: 8200000,
          },
          {
            title: "Positive Energy",
            duration: 242,
            bpm: 78,
            mood: "peaceful",
            streams: 6100000,
          },
          {
            title: "Jérusalem",
            duration: 289,
            bpm: 76,
            mood: "spiritual",
            streams: 12000000,
          },
        ],
      },
    ],
  },
  {
    name: "Josey",
    genre: "Afropop",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Josée Priscille Gnakro, known as Josey, is an Ivorian singer-songwriter and dancer. The former backup singer of DJ Arafat, she rose to solo fame with her powerful voice and energetic performances, becoming one of the most popular female artists in Francophone Africa.",
    spotifyUrl: "https://open.spotify.com/artist/0eT3LJkGHZqXbCGJYuomNq",
    wikiUrl: "https://fr.wikipedia.org/wiki/Josey_(chanteuse)",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 680000,
    totalStreams: 35000000,
    followers: 520000,
    albums: [
      {
        title: "Vibration",
        type: "album",
        year: 2021,
        tracks: [
          {
            title: "Diplôme",
            duration: 215,
            bpm: 118,
            mood: "upbeat",
            streams: 9500000,
          },
          {
            title: "C'est Raté",
            duration: 198,
            bpm: 124,
            mood: "party",
            streams: 7200000,
          },
          {
            title: "Hurricane",
            duration: 224,
            bpm: 115,
            mood: "powerful",
            streams: 5800000,
          },
        ],
      },
    ],
  },
  {
    name: "Burna Boy",
    genre: "Afrobeats",
    country: "Nigeria",
    countryCode: "NG",
    biography:
      "Damini Ebunoluwa Ogulu, known as Burna Boy, is a Nigerian singer, songwriter, and record producer. Self-styled as the 'African Giant', he won the Grammy Award for Best Global Music Album. His music fuses Afrobeats, dancehall, reggae, and pop.",
    spotifyUrl: "https://open.spotify.com/artist/3wcj11K77LjEY1PkEazffa",
    wikiUrl: "https://en.wikipedia.org/wiki/Burna_Boy",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 15000000,
    totalStreams: 820000000,
    followers: 8500000,
    albums: [
      {
        title: "Love, Damini",
        type: "album",
        year: 2022,
        tracks: [
          {
            title: "Last Last",
            duration: 217,
            bpm: 108,
            mood: "emotional",
            streams: 185000000,
          },
          {
            title: "It's Plenty",
            duration: 195,
            bpm: 120,
            mood: "upbeat",
            streams: 95000000,
          },
          {
            title: "Common Person",
            duration: 208,
            bpm: 98,
            mood: "reflective",
            streams: 45000000,
          },
        ],
      },
      {
        title: "Twice as Tall",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Wonderful",
            duration: 232,
            bpm: 110,
            mood: "groovy",
            streams: 72000000,
          },
          {
            title: "Way Too Big",
            duration: 199,
            bpm: 115,
            mood: "confident",
            streams: 48000000,
          },
        ],
      },
    ],
  },
  {
    name: "Salif Keïta",
    genre: "Afro-Manding",
    country: "Mali",
    countryCode: "ML",
    biography:
      "Salif Keïta is a Malian singer, songwriter, and multi-instrumentalist. Known as the 'Golden Voice of Africa', he was born into a royal Mandinka family. Despite facing discrimination as an albino, he became one of the most influential artists in African music history.",
    spotifyUrl: "https://open.spotify.com/artist/72s2kOqFbCWOzHDFEPqjYw",
    wikiUrl: "https://en.wikipedia.org/wiki/Salif_Keita",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 420000,
    totalStreams: 42000000,
    followers: 380000,
    albums: [
      {
        title: "Un Autre Blanc",
        type: "album",
        year: 2018,
        tracks: [
          {
            title: "Africa",
            duration: 298,
            bpm: 92,
            mood: "powerful",
            streams: 6500000,
          },
          {
            title: "Itadi",
            duration: 265,
            bpm: 88,
            mood: "soulful",
            streams: 4200000,
          },
          {
            title: "Sambe",
            duration: 278,
            bpm: 95,
            mood: "spiritual",
            streams: 3800000,
          },
        ],
      },
    ],
  },
  {
    name: "Youssou N'Dour",
    genre: "Mbalax",
    country: "Senegal",
    countryCode: "SN",
    biography:
      "Youssou N'Dour is a Senegalese singer-songwriter, musician, composer, and politician. He is one of the most famous singers in Africa, and his music spans mbalax, pop, Cuban rumba, and hip hop. His Grammy-winning album 'Egypt' marked a milestone in world music.",
    spotifyUrl: "https://open.spotify.com/artist/5n5HvsMvtsTzVTfBPkz0yi",
    wikiUrl: "https://en.wikipedia.org/wiki/Youssou_N%27Dour",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 850000,
    totalStreams: 55000000,
    followers: 650000,
    albums: [
      {
        title: "History",
        type: "album",
        year: 2019,
        tracks: [
          {
            title: "7 Seconds (feat. Neneh Cherry)",
            duration: 262,
            bpm: 96,
            mood: "emotional",
            streams: 18000000,
          },
          {
            title: "Birima",
            duration: 285,
            bpm: 105,
            mood: "festive",
            streams: 8500000,
          },
          {
            title: "Shaking the Tree",
            duration: 248,
            bpm: 100,
            mood: "uplifting",
            streams: 5200000,
          },
        ],
      },
    ],
  },
  {
    name: "Tiken Jah Fakoly",
    genre: "Reggae",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Doumbia Moussa Fakoly, known as Tiken Jah Fakoly, is an Ivorian reggae singer and activist. Known for his politically charged lyrics addressing African political issues, corruption, and neocolonialism, he is one of the most prominent reggae artists in Africa.",
    spotifyUrl: "https://open.spotify.com/artist/7BdhHqNZ5cEPnVYBgIPdOP",
    wikiUrl: "https://en.wikipedia.org/wiki/Tiken_Jah_Fakoly",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 520000,
    totalStreams: 38000000,
    followers: 420000,
    albums: [
      {
        title: "Le Monde est chaud",
        type: "album",
        year: 2019,
        tracks: [
          {
            title: "Le Monde est chaud",
            duration: 248,
            bpm: 82,
            mood: "conscious",
            streams: 5500000,
          },
          {
            title: "Is It Because I'm Black",
            duration: 272,
            bpm: 78,
            mood: "powerful",
            streams: 4200000,
          },
          {
            title: "Braquage de pouvoir",
            duration: 258,
            bpm: 80,
            mood: "rebel",
            streams: 3800000,
          },
        ],
      },
    ],
  },
  {
    name: "Magic System",
    genre: "Zouglou",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Magic System is an Ivorian music group formed in 1996 in Abidjan. Pioneers of the Zouglou genre, they achieved international fame with their hit '1er Gaou'. The group has sold over 10 million records worldwide and is one of Africa's most commercially successful groups.",
    spotifyUrl: "https://open.spotify.com/artist/0d7kCn0CUDDwYTIvNSaxkx",
    wikiUrl: "https://en.wikipedia.org/wiki/Magic_System",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 1100000,
    totalStreams: 92000000,
    followers: 780000,
    albums: [
      {
        title: "Radio Afrika",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Magic in the Air",
            duration: 218,
            bpm: 122,
            mood: "party",
            streams: 32000000,
          },
          {
            title: "Ambiance à l'Africaine",
            duration: 205,
            bpm: 118,
            mood: "festive",
            streams: 15000000,
          },
          {
            title: "1er Gaou",
            duration: 242,
            bpm: 115,
            mood: "fun",
            streams: 28000000,
          },
        ],
      },
    ],
  },
  {
    name: "Wizkid",
    genre: "Afrobeats",
    country: "Nigeria",
    countryCode: "NG",
    biography:
      "Ayodeji Ibrahim Balogun, known as Wizkid, is a Nigerian singer and songwriter. He is one of Africa's biggest and most decorated artists. His collaboration with Drake on 'One Dance' reached number one in 15 countries. His album 'Made in Lagos' was a global phenomenon.",
    spotifyUrl: "https://open.spotify.com/artist/3tVQdUvClmAT7URs9V3rsp",
    wikiUrl: "https://en.wikipedia.org/wiki/Wizkid",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 12000000,
    totalStreams: 750000000,
    followers: 7200000,
    albums: [
      {
        title: "Made in Lagos",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Essence (feat. Tems)",
            duration: 254,
            bpm: 107,
            mood: "romantic",
            streams: 210000000,
          },
          {
            title: "Joro",
            duration: 185,
            bpm: 112,
            mood: "dance",
            streams: 85000000,
          },
          {
            title: "Ginger (feat. Burna Boy)",
            duration: 215,
            bpm: 105,
            mood: "groovy",
            streams: 62000000,
          },
          {
            title: "True Love",
            duration: 198,
            bpm: 100,
            mood: "love",
            streams: 48000000,
          },
        ],
      },
    ],
  },
  {
    name: "Davido",
    genre: "Afropop",
    country: "Nigeria",
    countryCode: "NG",
    biography:
      "David Adedeji Adeleke, known as Davido, is a Nigerian-American singer-songwriter and record producer. One of the most influential artists in Afrobeats, he was the first Afrobeats artist to reach 1 million, 2 million, and 3 million YouTube subscribers.",
    spotifyUrl: "https://open.spotify.com/artist/0Y3agQaa6g2r0YmHPOO9rh",
    wikiUrl: "https://en.wikipedia.org/wiki/Davido",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 9500000,
    totalStreams: 580000000,
    followers: 6100000,
    albums: [
      {
        title: "Timeless",
        type: "album",
        year: 2023,
        tracks: [
          {
            title: "Feel",
            duration: 218,
            bpm: 108,
            mood: "upbeat",
            streams: 78000000,
          },
          {
            title: "Unavailable (feat. Musa Keys)",
            duration: 195,
            bpm: 116,
            mood: "dance",
            streams: 120000000,
          },
          {
            title: "Over Dem",
            duration: 202,
            bpm: 112,
            mood: "confident",
            streams: 42000000,
          },
        ],
      },
      {
        title: "A Better Time",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "FEM",
            duration: 167,
            bpm: 120,
            mood: "assertive",
            streams: 95000000,
          },
          {
            title: "Holy Ground (feat. Nicki Minaj)",
            duration: 210,
            bpm: 105,
            mood: "soulful",
            streams: 55000000,
          },
        ],
      },
    ],
  },
  {
    name: "Diamond Platnumz",
    genre: "Bongo Flava",
    country: "Tanzania",
    countryCode: "TZ",
    biography:
      "Nasibu Abdul Juma Issack, known as Diamond Platnumz, is a Tanzanian bongo flava recording artist, dancer, and businessman. He is the first Sub-Saharan African artist to reach 1 billion YouTube views. His WCB Wasafi record label is one of the biggest in East Africa.",
    spotifyUrl: "https://open.spotify.com/artist/5y9xEAGjk7TjFfkv4BFYSR",
    wikiUrl: "https://en.wikipedia.org/wiki/Diamond_Platnumz",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 4200000,
    totalStreams: 250000000,
    followers: 3400000,
    albums: [
      {
        title: "First of All",
        type: "album",
        year: 2023,
        tracks: [
          {
            title: "Komasava",
            duration: 188,
            bpm: 115,
            mood: "dance",
            streams: 32000000,
          },
          {
            title: "Mtasubiri",
            duration: 212,
            bpm: 100,
            mood: "romantic",
            streams: 24000000,
          },
          {
            title: "Nawaza",
            duration: 195,
            bpm: 108,
            mood: "smooth",
            streams: 18000000,
          },
        ],
      },
    ],
  },
  {
    name: "Sauti Sol",
    genre: "Afro-Pop",
    country: "Kenya",
    countryCode: "KE",
    biography:
      "Sauti Sol is a Kenyan afro-pop band formed in Nairobi. The group consists of Bien-Aimé Baraza, Willis Chimano, Savara Mudigi, and Polycarp Otieno. They have won multiple awards including MTV Europe Music Awards and are one of East Africa's biggest musical exports.",
    spotifyUrl: "https://open.spotify.com/artist/2MkwUS63fOiVSHvpfsKw4V",
    wikiUrl: "https://en.wikipedia.org/wiki/Sauti_Sol",
    verified: true,
    labelStatus: "independent",
    monthlyListeners: 1800000,
    totalStreams: 120000000,
    followers: 1500000,
    albums: [
      {
        title: "Midnight Train",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Suzanna",
            duration: 225,
            bpm: 108,
            mood: "upbeat",
            streams: 18000000,
          },
          {
            title: "Midnight Train",
            duration: 235,
            bpm: 95,
            mood: "soulful",
            streams: 12000000,
          },
          {
            title: "Brighter Days (feat. Soweto Gospel Choir)",
            duration: 248,
            bpm: 100,
            mood: "uplifting",
            streams: 8500000,
          },
        ],
      },
    ],
  },
  {
    name: "Aya Nakamura",
    genre: "Pop/R&B",
    country: "France",
    countryCode: "FR",
    biography:
      "Aya Danioko, known as Aya Nakamura, is a French singer of Malian origin. She is the most-streamed French-speaking artist in the world on Spotify. Her hit 'Djadja' became an international phenomenon, reaching the top 10 in multiple European countries.",
    spotifyUrl: "https://open.spotify.com/artist/7bGJo4mZlJJnmMVpFnEoSP",
    wikiUrl: "https://en.wikipedia.org/wiki/Aya_Nakamura",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 16000000,
    totalStreams: 920000000,
    followers: 9800000,
    albums: [
      {
        title: "AYA",
        type: "album",
        year: 2023,
        tracks: [
          {
            title: "Djadja",
            duration: 202,
            bpm: 105,
            mood: "confident",
            streams: 280000000,
          },
          {
            title: "Copines",
            duration: 195,
            bpm: 110,
            mood: "catchy",
            streams: 150000000,
          },
          {
            title: "Pookie",
            duration: 189,
            bpm: 108,
            mood: "fun",
            streams: 120000000,
          },
          {
            title: "Bobo",
            duration: 198,
            bpm: 102,
            mood: "groovy",
            streams: 55000000,
          },
        ],
      },
    ],
  },
  {
    name: "MHD",
    genre: "Afro Trap",
    country: "France",
    countryCode: "FR",
    biography:
      "Mohamed Sylla, known as MHD, is a French rapper and singer of Guinean and Senegalese descent. He is credited with creating the 'Afro Trap' subgenre, blending African musical elements with trap beats. His self-titled debut album was certified diamond in France.",
    spotifyUrl: "https://open.spotify.com/artist/1FpJL2VLXV9IHfOt1giXnb",
    wikiUrl: "https://en.wikipedia.org/wiki/MHD_(rapper)",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 3200000,
    totalStreams: 180000000,
    followers: 2100000,
    albums: [
      {
        title: "19",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Afro Trap Part. 7 (La Puissance)",
            duration: 210,
            bpm: 125,
            mood: "energetic",
            streams: 45000000,
          },
          {
            title: "Bodyguard",
            duration: 198,
            bpm: 120,
            mood: "powerful",
            streams: 32000000,
          },
          {
            title: "Bébé (feat. Dadju)",
            duration: 215,
            bpm: 100,
            mood: "romantic",
            streams: 28000000,
          },
        ],
      },
    ],
  },
  {
    name: "Amadou & Mariam",
    genre: "Afro-Blues",
    country: "Mali",
    countryCode: "ML",
    biography:
      "Amadou Bagayoko and Mariam Doumbia, known as Amadou & Mariam, are a Malian musical duo. Both blind since youth, they met at Mali's Institute for the Young Blind and married in 1980. Their album 'Dimanche à Bamako' was a worldwide hit.",
    spotifyUrl: "https://open.spotify.com/artist/1FTSo1JARIDsnrF0pZv3kP",
    wikiUrl: "https://en.wikipedia.org/wiki/Amadou_%26_Mariam",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 380000,
    totalStreams: 35000000,
    followers: 290000,
    albums: [
      {
        title: "La Confusion",
        type: "album",
        year: 2017,
        tracks: [
          {
            title: "La Confusion",
            duration: 245,
            bpm: 105,
            mood: "groovy",
            streams: 4500000,
          },
          {
            title: "Bofou Safou",
            duration: 218,
            bpm: 110,
            mood: "upbeat",
            streams: 6200000,
          },
          {
            title: "Mon Amour, Ma Chérie",
            duration: 232,
            bpm: 95,
            mood: "love",
            streams: 3800000,
          },
        ],
      },
    ],
  },
  {
    name: "Serge Beynaud",
    genre: "Coupé-Décalé",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Serge Landry Beynaud is an Ivorian singer-songwriter. Known as the 'Ballon d'Or of Coupé-Décalé', he is famous for his catchy dance tracks and energetic performances. He has won multiple PRIMUD Awards and is one of the most popular artists in Côte d'Ivoire.",
    spotifyUrl: "https://open.spotify.com/artist/43FYYxaR4rM8kCElJptP0e",
    wikiUrl: "https://fr.wikipedia.org/wiki/Serge_Beynaud",
    verified: true,
    labelStatus: "independent",
    monthlyListeners: 580000,
    totalStreams: 28000000,
    followers: 450000,
    albums: [
      {
        title: "Best Of Beynaud",
        type: "album",
        year: 2020,
        tracks: [
          {
            title: "Karidjatou",
            duration: 218,
            bpm: 128,
            mood: "party",
            streams: 8500000,
          },
          {
            title: "Fouinta Fouinté",
            duration: 195,
            bpm: 130,
            mood: "dance",
            streams: 6200000,
          },
          {
            title: "Okeninkpin",
            duration: 208,
            bpm: 126,
            mood: "energetic",
            streams: 5100000,
          },
        ],
      },
    ],
  },
  {
    name: "Baaba Maal",
    genre: "World Music",
    country: "Senegal",
    countryCode: "SN",
    biography:
      "Baaba Maal is a Senegalese singer and guitarist born in Podor, on the Senegal River. He sings in Pulaar, the language of the Fula people. Known for blending traditional Senegalese music with rock, pop, and electronic sounds, he has been a UNDP Youth Emissary.",
    wikiUrl: "https://en.wikipedia.org/wiki/Baaba_Maal",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 320000,
    totalStreams: 28000000,
    followers: 250000,
    albums: [
      {
        title: "The Traveller",
        type: "album",
        year: 2016,
        tracks: [
          {
            title: "Gilli Men",
            duration: 285,
            bpm: 90,
            mood: "spiritual",
            streams: 3500000,
          },
          {
            title: "International Road",
            duration: 262,
            bpm: 100,
            mood: "uplifting",
            streams: 2800000,
          },
          {
            title: "Fulani Rock",
            duration: 248,
            bpm: 115,
            mood: "energetic",
            streams: 4200000,
          },
        ],
      },
    ],
  },
  {
    name: "Roseline Layo",
    genre: "Gospel",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Roseline Layo is an Ivorian gospel artist known for her powerful voice and inspirational music. She is one of the leading gospel singers in Francophone Africa, blending traditional gospel with African rhythmic elements to create a unique spiritual sound.",
    verified: false,
    labelStatus: "independent",
    monthlyListeners: 180000,
    totalStreams: 12000000,
    followers: 95000,
    albums: [
      {
        title: "Grâce Infinie",
        type: "album",
        year: 2021,
        tracks: [
          {
            title: "Grâce Infinie",
            duration: 295,
            bpm: 85,
            mood: "spiritual",
            streams: 3200000,
          },
          {
            title: "Mon Dieu est Grand",
            duration: 268,
            bpm: 88,
            mood: "uplifting",
            streams: 2500000,
          },
          {
            title: "Victoire",
            duration: 245,
            bpm: 92,
            mood: "powerful",
            streams: 1800000,
          },
        ],
      },
    ],
  },
  {
    name: "Sidiki Diabaté",
    genre: "Mandingue",
    country: "Mali",
    countryCode: "ML",
    biography:
      "Sidiki Diabaté is a Malian singer-songwriter and kora player. Son of legendary kora master Toumani Diabaté, he has modernized traditional Manding music by blending it with contemporary pop and R&B elements, becoming one of West Africa's most popular young artists.",
    wikiUrl: "https://en.wikipedia.org/wiki/Sidiki_Diabat%C3%A9",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 750000,
    totalStreams: 48000000,
    followers: 620000,
    albums: [
      {
        title: "Béna",
        type: "album",
        year: 2021,
        tracks: [
          {
            title: "Béna",
            duration: 225,
            bpm: 95,
            mood: "romantic",
            streams: 12000000,
          },
          {
            title: "I love you",
            duration: 198,
            bpm: 100,
            mood: "love",
            streams: 8500000,
          },
          {
            title: "Diabatéba Music",
            duration: 215,
            bpm: 105,
            mood: "festive",
            streams: 6200000,
          },
        ],
      },
    ],
  },
  {
    name: "Meiway",
    genre: "Zoblazo",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    biography:
      "Frédéric Désiré Ehui, known as Meiway, is an Ivorian musician and the creator of the Zoblazo genre. Often called the 'King of Zoblazo', his music is characterized by driving rhythms and energetic performances. He has been a pioneer of Ivorian popular music since the 1990s.",
    wikiUrl: "https://fr.wikipedia.org/wiki/Meiway",
    verified: true,
    labelStatus: "signed",
    monthlyListeners: 220000,
    totalStreams: 18000000,
    followers: 180000,
    albums: [
      {
        title: "Zoblazo Nation",
        type: "album",
        year: 2018,
        tracks: [
          {
            title: "300% Zoblazo",
            duration: 252,
            bpm: 132,
            mood: "party",
            streams: 5200000,
          },
          {
            title: "Mi Gnaoua",
            duration: 228,
            bpm: 128,
            mood: "dance",
            streams: 3800000,
          },
          {
            title: "Golé Golé",
            duration: 215,
            bpm: 130,
            mood: "energetic",
            streams: 2900000,
          },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════
export async function seedStreamingPlatform(): Promise<void> {
  const client = await pool.connect();
  try {
    // Check if already seeded
    const existing = await client.query(
      `SELECT COUNT(*) as cnt FROM music_artists`,
    );
    if (parseInt(existing.rows[0].cnt) > 5) {
      console.log(
        "[Streaming Seed] Music artists already seeded, checking for updates...",
      );
      // Update existing artists with new fields if they're missing
      await client.query(`
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS country VARCHAR(100);
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS label_status VARCHAR(20) DEFAULT 'signed';
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS wiki_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS instagram_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS twitter_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS website_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS total_tracks INTEGER DEFAULT 0;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS total_albums INTEGER DEFAULT 0;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
        ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS featured_track_id INTEGER;
      `);
      // Backfill missing data
      for (const artist of ARTISTS) {
        await client.query(
          `
          UPDATE music_artists SET
            biography = COALESCE(biography, $2),
            country = COALESCE(country, $3),
            country_code = COALESCE(country_code, $4),
            label_status = COALESCE(label_status, $5),
            spotify_url = COALESCE(spotify_url, $6),
            wiki_url = COALESCE(wiki_url, $7),
            verified = COALESCE(verified, $8),
            monthly_listeners = GREATEST(COALESCE(monthly_listeners, 0), $9),
            total_streams = GREATEST(COALESCE(total_streams, 0), $10),
            followers = GREATEST(COALESCE(followers, 0), $11)
          WHERE name = $1
        `,
          [
            artist.name,
            artist.biography,
            artist.country,
            artist.countryCode,
            artist.labelStatus,
            artist.spotifyUrl || null,
            artist.wikiUrl || null,
            artist.verified,
            artist.monthlyListeners,
            artist.totalStreams,
            artist.followers,
          ],
        );
      }
      console.log("[Streaming Seed] Artist data updated.");
      // Ensure tracks exist for all artists
      await seedTracksForArtists(client);
      return;
    }

    // Ensure tables exist with new columns
    await client.query(`
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS country VARCHAR(100);
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS label_status VARCHAR(20) DEFAULT 'signed';
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS wiki_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS instagram_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS twitter_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS website_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS total_tracks INTEGER DEFAULT 0;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS total_albums INTEGER DEFAULT 0;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
      ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS featured_track_id INTEGER;
    `);

    // Ensure music_tracks has new columns
    await client.query(`
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS album_id INTEGER;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS track_number INTEGER;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS audio_url TEXT;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS wiki_url TEXT;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN DEFAULT false;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS lyrics TEXT;
      ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
    `);

    // Create new tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS albums (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE,
        cover_art TEXT,
        release_date TIMESTAMP,
        genre TEXT,
        description TEXT,
        album_type VARCHAR(20) DEFAULT 'album',
        total_tracks INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS albums_artist_idx ON albums(artist_id);

      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        cover_art TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        total_tracks INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        plays INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS playlists_user_idx ON playlists(user_id);

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
        track_id INTEGER REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(playlist_id, track_id)
      );

      CREATE TABLE IF NOT EXISTS stream_plays (
        id SERIAL PRIMARY KEY,
        track_id INTEGER REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        artist_id INTEGER REFERENCES music_artists(id),
        duration INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        session_id VARCHAR(64),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS stream_plays_track_idx ON stream_plays(track_id);
      CREATE INDEX IF NOT EXISTS stream_plays_date_idx ON stream_plays(created_at);

      CREATE TABLE IF NOT EXISTS track_likes (
        id SERIAL PRIMARY KEY,
        track_id INTEGER REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(track_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS track_comments (
        id SERIAL PRIMARY KEY,
        track_id INTEGER REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS artist_follows (
        id SERIAL PRIMARY KEY,
        artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(artist_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS streaming_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
        tier VARCHAR(20) DEFAULT 'free' NOT NULL,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        monthly_price DECIMAL(8,2) DEFAULT 0.00,
        max_downloads_per_month INTEGER DEFAULT 0,
        downloads_used INTEGER DEFAULT 0,
        no_ads BOOLEAN DEFAULT false,
        high_quality BOOLEAN DEFAULT false,
        offline_access BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS listening_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        track_id INTEGER REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
        played_at TIMESTAMP DEFAULT NOW(),
        duration INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS listening_history_user_idx ON listening_history(user_id);
      CREATE INDEX IF NOT EXISTS listening_history_date_idx ON listening_history(played_at);
    `);

    // Insert artists
    for (const artist of ARTISTS) {
      const result = await client.query(
        `
        INSERT INTO music_artists (name, genre, biography, country, country_code, label_status, 
          spotify_url, wiki_url, verified, monthly_listeners, total_streams, followers)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
        [
          artist.name,
          artist.genre,
          artist.biography,
          artist.country,
          artist.countryCode,
          artist.labelStatus,
          artist.spotifyUrl || null,
          artist.wikiUrl || null,
          artist.verified,
          artist.monthlyListeners,
          artist.totalStreams,
          artist.followers,
        ],
      );
      if (result.rows.length === 0) continue;
      const artistId = result.rows[0].id;

      let trackCount = 0;
      let albumCount = 0;

      for (const album of artist.albums) {
        const albumResult = await client.query(
          `
          INSERT INTO albums (title, artist_id, genre, album_type, release_date, total_tracks)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
          [
            album.title,
            artistId,
            artist.genre,
            album.type,
            new Date(album.year, 0, 1),
            album.tracks.length,
          ],
        );
        const albumId = albumResult.rows[0].id;
        albumCount++;

        let albumDuration = 0;
        for (let i = 0; i < album.tracks.length; i++) {
          const track = album.tracks[i];
          await client.query(
            `
            INSERT INTO music_tracks (title, artist_id, album_id, track_number, duration, genre,
              streams, play_count, bpm, mood, status, release_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'published', $10)
          `,
            [
              track.title,
              artistId,
              albumId,
              i + 1,
              track.duration,
              artist.genre,
              track.streams,
              track.bpm,
              track.mood,
              new Date(album.year, 0, 1),
            ],
          );
          albumDuration += track.duration;
          trackCount++;
        }

        await client.query(
          `UPDATE albums SET total_duration = $1 WHERE id = $2`,
          [albumDuration, albumId],
        );
      }

      // Update artist track/album counts
      await client.query(
        `
        UPDATE music_artists SET total_tracks = $1, total_albums = $2 WHERE id = $3
      `,
        [trackCount, albumCount, artistId],
      );
    }

    // Generate demo stream play history (last 90 days)
    await seedDemoAnalytics(client);

    console.log(
      `[Streaming Seed] ✅ Seeded ${ARTISTS.length} artists with tracks, albums, and analytics`,
    );
  } catch (err: any) {
    console.error("[Streaming Seed] Error:", err.message);
  } finally {
    client.release();
  }
}

async function seedTracksForArtists(client: any) {
  for (const artist of ARTISTS) {
    const artistRow = await client.query(
      `SELECT id FROM music_artists WHERE name = $1`,
      [artist.name],
    );
    if (artistRow.rows.length === 0) continue;
    const artistId = artistRow.rows[0].id;

    // Check if artist already has tracks
    const trackCount = await client.query(
      `SELECT COUNT(*) as cnt FROM music_tracks WHERE artist_id = $1`,
      [artistId],
    );
    if (parseInt(trackCount.rows[0].cnt) > 0) continue;

    for (const album of artist.albums) {
      const albumResult = await client.query(
        `
        INSERT INTO albums (title, artist_id, genre, album_type, release_date, total_tracks)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING RETURNING id
      `,
        [
          album.title,
          artistId,
          artist.genre,
          album.type,
          new Date(album.year, 0, 1),
          album.tracks.length,
        ],
      );

      if (albumResult.rows.length === 0) continue;
      const albumId = albumResult.rows[0].id;

      for (let i = 0; i < album.tracks.length; i++) {
        const track = album.tracks[i];
        await client.query(
          `
          INSERT INTO music_tracks (title, artist_id, album_id, track_number, duration, genre,
            streams, play_count, bpm, mood, status, release_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'published', $10)
          ON CONFLICT DO NOTHING
        `,
          [
            track.title,
            artistId,
            albumId,
            i + 1,
            track.duration,
            artist.genre,
            track.streams,
            track.bpm,
            track.mood,
            new Date(album.year, 0, 1),
          ],
        );
      }
    }
  }
}

async function seedDemoAnalytics(client: any) {
  // Get all tracks with their artist IDs
  const tracks = await client.query(
    `SELECT id, artist_id, streams FROM music_tracks WHERE artist_id IS NOT NULL`,
  );
  if (tracks.rows.length === 0) return;

  // Generate 500 random stream plays over last 90 days for demo analytics
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  const values: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  for (let i = 0; i < 500; i++) {
    const track = tracks.rows[Math.floor(Math.random() * tracks.rows.length)];
    const playedAt = new Date(now - Math.random() * ninetyDays);
    const duration = Math.floor(Math.random() * 240) + 30;
    const completed = duration >= 30;

    values.push(
      `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`,
    );
    params.push(track.id, track.artist_id, duration, completed, playedAt);
    paramIdx += 5;
  }

  if (values.length > 0) {
    await client.query(
      `
      INSERT INTO stream_plays (track_id, artist_id, duration, completed, created_at)
      VALUES ${values.join(", ")}
      ON CONFLICT DO NOTHING
    `,
      params,
    );
  }
}

// Audio placeholder URLs using royalty-free samples from web
// These are tone.js generated tones or can be replaced with real audio later
export function getAudioPlaceholderUrl(trackTitle: string): string {
  // We'll use HTML5 audio with Web Audio API to generate tones in-browser
  // For production: replace with Vercel Blob URLs or S3
  return `/api/streaming/audio/generate?title=${encodeURIComponent(trackTitle)}`;
}
