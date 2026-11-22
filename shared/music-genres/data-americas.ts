import type { GenreSeed } from "./types";

export const AMERICAS_GENRES: readonly GenreSeed[] = [
  {
    slug: "acid-rock",
    name: "Acid rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q236932",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Acid_rock",
        evidence: "Acid rock is a loosely defined type of rock music that evolved out of the mid-1960s garage punk movement and helped launch the psychedelic subculture.",
      },
    ],
  },
  {
    slug: "alternative-rock",
    name: "Alternative rock",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q11366",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Alternative_rock",
        evidence: "Alternative rock (also known as alternative music, alt-rock or simply alternative) is a category of rock music that evolved from the independent music underground of the 1970s.",
      },
    ],
  },
  {
    slug: "americana-music",
    name: "Americana music",
    kind: "style",
    parent: null,
    countries: ["US"],
    aliases: ["Americana"],
    wikidata: "Q2407862",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Americana_music",
        evidence: "Americana is a general term for roots or traditional music formed by the confluence of the shared and varied traditions that make up the musical ethos of the United States, with particular emphasis on music historically developed in the American…",
      },
    ],
  },
  {
    slug: "anti-folk",
    name: "Anti-folk",
    kind: "style",
    parent: "folk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q574651",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Anti-folk",
        evidence: "Anti-folk (sometimes spelled antifolk) is a genre of folk music that emerged in the 1980s in New York City.",
      },
    ],
  },
  {
    slug: "arrocha",
    name: "Arrocha",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q2863648",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Arrocha",
        evidence: "Arrocha is a music/dance style that originated in the interior of Bahia, one of Brazil's states, most notably in the city of Candeias.",
      },
    ],
  },
  {
    slug: "avanzada-regia",
    name: "Avanzada Regia",
    kind: "style",
    parent: "rock",
    countries: ["MX"],
    aliases: [],
    wikidata: "Q8210150",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Avanzada_Regia",
        evidence: "Avanzada Regia was the name given to a successful Mexican musical movement originating in Monterrey, the capital city of the state of Nuevo León.",
      },
    ],
  },
  {
    slug: "axe",
    name: "Axé",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1435485",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Ax%C3%A9",
        evidence: "Axé is a key concept in the regional Candomblé religion, as \"the imagined spiritual power and energy bestowed upon practitioners by the pantheon of orixás\".",
      },
    ],
  },
  {
    slug: "banda-music",
    name: "Banda music",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q2812726",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Banda_music",
        evidence: "Banda is a subgenre of regional Mexican music and type of ensemble in which wind (mostly brass) and percussion instruments are performed.",
      },
    ],
  },
  {
    slug: "baroque-pop",
    name: "Baroque pop",
    kind: "style",
    parent: "pop",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q46046",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Baroque_pop",
        evidence: "Baroque pop (sometimes called baroque rock) is a fusion genre that combines rock music with particular elements of classical music.",
      },
    ],
  },
  {
    slug: "beach-music",
    name: "Beach music",
    kind: "style",
    parent: "r-and-b",
    countries: ["US"],
    aliases: [],
    wikidata: "Q4875789",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Beach_music",
        evidence: "Beach music, also known as Carolina beach music and beach pop, is a regional genre of music in the United States which developed from rock/R&B and pop music of the 1950s and 1960s.",
      },
    ],
  },
  {
    slug: "beatdown-hardcore",
    name: "Beatdown hardcore",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q5724040",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Beatdown_hardcore",
        evidence: "Beatdown hardcore (also known as heavy hardcore, brutal hardcore, moshcore, or simply beatdown) is a subgenre of hardcore punk which incorporates elements of thrash metal and hip hop.",
      },
    ],
  },
  {
    slug: "biker-metal",
    name: "Biker metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q60462608",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Biker_metal",
        evidence: "Biker metal (also known as biker punk) is a fusion genre that combines elements of punk rock, heavy metal, rock and roll and blues, that was pioneered in the late-1970s to early-1980s in England and the United States, by Motörhead, Plasmatics,…",
      },
    ],
  },
  {
    slug: "bluegrass-music",
    name: "Bluegrass music",
    kind: "style",
    parent: "country",
    countries: ["US"],
    aliases: [],
    wikidata: "Q213714",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Bluegrass_music",
        evidence: "Bluegrass music is a genre of American roots music that developed in the 1940s in the Appalachian region of the United States.",
      },
    ],
  },
  {
    slug: "blues-rock",
    name: "Blues rock",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q193355",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Blues_rock",
        evidence: "Blues rock is a fusion genre and form of rock and blues music that relies on the chords/scales and instrumental improvisation of blues.",
      },
    ],
  },
  {
    slug: "boogie",
    name: "Boogie",
    kind: "style",
    parent: "funk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q4942839",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Boogie_(genre)",
        evidence: "Boogie (sometimes called post-disco and electro-funk) is a rhythm and blues genre of electronic dance music with close ties to the post-disco style, that first emerged in the United States during the late 1970s to mid-1980s.",
      },
    ],
  },
  {
    slug: "boogie-woogie",
    name: "Boogie-woogie",
    kind: "style",
    parent: "blues",
    countries: ["US"],
    aliases: [],
    wikidata: "Q212952",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Boogie-woogie",
        evidence: "Boogie-woogie, also known as boogie, is a genre of blues music that became popular during the late 1920s, but had already developed in African-American communities since the 1870s.",
      },
    ],
  },
  {
    slug: "bossa-nova",
    name: "Bossa nova",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q486263",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Bossa_nova",
        evidence: "Bossa nova is a relaxed style of samba developed in the late 1950s and early 1960s in Rio de Janeiro, Brazil.",
      },
    ],
  },
  {
    slug: "brega-pop",
    name: "Brega pop",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q8251828",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Brega_pop",
        evidence: "Calypso, Brega Calypso or just Brega-pop is a musical genre that emerged in the Brazilian city of Belém (state of Pará), by mixing elements of Pará's regional genres such as lambada, carimbó, guitarrada, siriá, with international music from…",
      },
    ],
  },
  {
    slug: "caipira-pagode",
    name: "Caipira pagode",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q7124405",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Caipira_pagode",
        evidence: "Caipira pagode (in Portuguese: pagode caipira; also known as pagode de viola and pagode sertanejo), is a variant of Caipira music originating in the state of Paraná.",
      },
    ],
  },
  {
    slug: "cape-breton-fiddling",
    name: "Cape Breton Fiddling",
    kind: "style",
    parent: "folk",
    countries: ["CA"],
    aliases: [],
    wikidata: "Q2447797",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Cape_Breton_fiddling",
        evidence: "Cape Breton fiddling is a regional violin style which falls within the Celtic music idiom.",
      },
    ],
  },
  {
    slug: "chanson-quebecoise",
    name: "Chanson québécoise",
    kind: "style",
    parent: "folk",
    countries: ["CA"],
    aliases: ["Quebec chanson"],
    wikidata: "Q2956164",
    sources: [
      {
        url: "https://fr.wikipedia.org/wiki/Chanson_qu%C3%A9b%C3%A9coise",
        evidence: "La chanson québécoise est un ensemble d'œuvres musicales chantées en majeure partie en langue française, mais aussi en langue anglaise et en diverses langues autochtones parlées sur le territoire du Québec actuel.",
      },
    ],
  },
  {
    slug: "chillwave",
    name: "Chillwave",
    kind: "style",
    parent: "electronic",
    countries: ["US"],
    aliases: [],
    wikidata: "Q2626684",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Chillwave",
        evidence: "Chillwave is a music microgenre that emerged in the late 2000s.",
      },
    ],
  },
  {
    slug: "choro",
    name: "Choro",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1076539",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Choro",
        evidence: "Choro, also popularly called chorinho (\"little cry\" or \"little lament\"), is an instrumental Brazilian popular music genre which originated in 19th century Rio de Janeiro.",
      },
    ],
  },
  {
    slug: "cloud-rap",
    name: "Cloud rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q16829781",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Cloud_rap",
        evidence: "Cloud rap (also known as trillwave) is a subgenre of hip-hop that emerged from the Southern hip-hop scene in the late 2000s to early 2010s.",
      },
    ],
  },
  {
    slug: "coco",
    name: "Coco",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q502448",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Coco_(music)",
        evidence: "Coco is an African-influenced musical rhythm that originated in northern Brazil.",
      },
    ],
  },
  {
    slug: "cumbia-rebajada",
    name: "Cumbia rebajada",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q85867089",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Cumbia_rebajada",
        evidence: "Cumbia rebajada is a musical subgenre derived from Colombian cumbia and Mexican cumbia that emerged in Monterrey, Nuevo León (Mexico).",
      },
    ],
  },
  {
    slug: "dance-punk",
    name: "Dance-punk",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1643549",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Dance-punk",
        evidence: "Dance-punk is a subgenre of post-punk that emerged in the late 1970s, and is closely associated with the disco, post-disco and new wave movements.",
      },
    ],
  },
  {
    slug: "deathcore",
    name: "Deathcore",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q475221",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Deathcore",
        evidence: "Deathcore is a fusion genre that combines metalcore with elements of death metal.",
      },
    ],
  },
  {
    slug: "deathrock",
    name: "Deathrock",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1164252",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Deathrock",
        evidence: "Deathrock (or death rock) is a subgenre of rock music that merges punk rock with gothic and glam rock visuals, alongside elements of horror film scores.",
      },
    ],
  },
  {
    slug: "disco",
    name: "Disco",
    kind: "style",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q58339",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Disco",
        evidence: "Disco is a genre of dance music and a subculture that emerged in the late 1960s from the United States' urban nightlife scene.",
      },
    ],
  },
  {
    slug: "doo-wop",
    name: "Doo-wop",
    kind: "style",
    parent: "r-and-b",
    countries: ["US"],
    aliases: [],
    wikidata: "Q546359",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Doo-wop",
        evidence: "Doo-wop (also spelled doowop and doo wop) is a subgenre of rhythm and blues music that originated in African-American communities during the late 1940s, mainly in the large cities of the United States.",
      },
    ],
  },
  {
    slug: "duranguense",
    name: "Duranguense",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q907799",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Duranguense",
        evidence: "Duranguense is a subgenre of regional Mexican music.",
      },
    ],
  },
  {
    slug: "emo",
    name: "Emo",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q10926",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Emo",
        evidence: "Emo ( EE-moh) is a genre of rock music that combines musical characteristics of hardcore punk with emotional, often confessional lyrics.",
      },
    ],
  },
  {
    slug: "emo-pop",
    name: "Emo pop",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q3724735",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Emo_pop",
        evidence: "Emo pop (alternatively typeset with a hyphen, also known as emo pop-punk and pop-emo) is a fusion genre combining emo with pop-punk, pop music, or both.",
      },
    ],
  },
  {
    slug: "emo-rap",
    name: "Emo rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q12362064",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Emo_rap",
        evidence: "Emo rap (also known as emo hip hop or sad rap) is a subgenre of hip hop influenced by emo.",
      },
    ],
  },
  {
    slug: "fife-and-drum-blues",
    name: "Fife and drum blues",
    kind: "style",
    parent: "blues",
    countries: ["US"],
    aliases: [],
    wikidata: "Q5447390",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Fife_and_drum_blues",
        evidence: "Fife and drum blues is an American folk music form derived from country blues, martial music tradition, and African rhythms.",
      },
    ],
  },
  {
    slug: "footwork",
    name: "Footwork",
    kind: "style",
    parent: "house",
    countries: ["US"],
    aliases: [],
    wikidata: "Q5466607",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Footwork_(genre)",
        evidence: "Footwork, also called juke, or Chicago juke, is a genre of electronic dance music derived from ghetto house with elements of hip-hop, first appearing in Chicago in the late 1990s.",
      },
    ],
  },
  {
    slug: "forro",
    name: "Forró",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q586110",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Forr%C3%B3",
        evidence: "The term forró refers to a musical genre, a rhythm, a dance and the event itself where forró music is played and danced.",
      },
    ],
  },
  {
    slug: "frat-rap",
    name: "Frat rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q19708376",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Frat_rap",
        evidence: "Frat rap is a subgenre of hip hop music that emerged in the late 2000s.",
      },
    ],
  },
  {
    slug: "freak-folk",
    name: "Freak folk",
    kind: "style",
    parent: "folk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q2404568",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Freak_folk",
        evidence: "Freak folk is a subgenre of psychedelic folk associated with the 2000s New Weird America movement and used to describe the work of artists such as Joanna Newsom, Devendra Banhart, Animal Collective, and Adem.",
      },
    ],
  },
  {
    slug: "frevo",
    name: "Frevo",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1455932",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Frevo",
        evidence: "Frevo is a dance and musical style originating from Recife, Pernambuco, Brazil, traditionally associated with Brazilian Carnival.",
      },
    ],
  },
  {
    slug: "funk-carioca",
    name: "Funk carioca",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1931130",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funk_carioca",
        evidence: "Funk carioca kɐɾiˈɔkɐ, - kaɾ-]), also known as baile funk, Brazilian funk, or simply funk, is a Brazilian hip hop-influenced music genre from Rio de Janeiro, taking influences from musical styles such as Miami bass and freestyle.",
      },
    ],
  },
  {
    slug: "funk-melody",
    name: "Funk melody",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10286515",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funk_melody",
        evidence: "Funk melody ˈmɛlodʒi]) is a fusion genre of funk carioca and Latin freestyle.",
      },
    ],
  },
  {
    slug: "funk-ostentacao",
    name: "Funk ostentação",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q15893013",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funk_ostenta%C3%A7%C3%A3o",
        evidence: "Funk ostentação ostẽtaˈsɐ̃w]; Portuguese for 'ostentation funk') is a Brazilian music style created in São Paulo in 2008.",
      },
    ],
  },
  {
    slug: "funk-ousadia",
    name: "Funk ousadia",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q19708604",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funk_ousadia",
        evidence: "Funk ousadia, also referred to as funk picante, is a subgenre of the wider Brazilian funk scene, originating around 2013 in the city of São Paulo as an offshoot of the funk ostentação movement.",
      },
    ],
  },
  {
    slug: "funknejo",
    name: "Funknejo",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q108297247",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Funknejo",
        evidence: "Funknejo is a fusion genre of Brazilian popular music combining elements of funk carioca and sertanejo music.",
      },
    ],
  },
  {
    slug: "garage-house",
    name: "Garage house",
    kind: "style",
    parent: "house",
    countries: ["US"],
    aliases: [],
    wikidata: "Q928825",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Garage_house",
        evidence: "Garage house (originally known as \"garage\"; local terms include \"New York house\" and New Jersey sound) is an electronic dance music style that was developed alongside Chicago house music.",
      },
    ],
  },
  {
    slug: "garage-rock",
    name: "Garage rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q211573",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Garage_rock",
        evidence: "Garage rock (sometimes called garage punk or '60s punk) is a raw and energetic style of rock and roll that flourished in the mid-1960s, most commonly in the United States and Canada, and has experienced a series of subsequent revivals.",
      },
    ],
  },
  {
    slug: "go-go",
    name: "Go-go",
    kind: "style",
    parent: "funk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q2697917",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Go-go",
        evidence: "Go-go is a subgenre of funk music with an emphasis on specific rhythmic patterns, and live audience call and response.",
      },
    ],
  },
  {
    slug: "gothic-country",
    name: "Gothic country",
    kind: "style",
    parent: "country",
    countries: ["US"],
    aliases: [],
    wikidata: "Q65052052",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Gothic_country",
        evidence: "Gothic country (sometimes referred to as gothic Americana, Southern Gothic, the Denver sound, or dark country) is a genre of country music rooted in early jazz, gospel, Americana, gothic rock, and post-punk.",
      },
    ],
  },
  {
    slug: "groove-metal",
    name: "Groove metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q241662",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Groove_metal",
        evidence: "Groove metal (also known as neo-thrash or post-thrash) is a subgenre of heavy metal music that began in the early 1990s.",
      },
    ],
  },
  {
    slug: "grunge",
    name: "Grunge",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q11365",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Grunge",
        evidence: "Grunge (originally known as the Seattle Sound) is an alternative rock genre and subculture that emerged during the mid-1980s in the U.S. state of Washington, particularly in Seattle and Olympia, and other nearby cities.",
      },
    ],
  },
  {
    slug: "guitarrada",
    name: "Guitarrada",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10292943",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Guitarrada",
        evidence: "Guitarrada, also called lambada instrumental (\"instrumental lambada\"), is an instrumental musical genre that emerged in the state of Pará, Brazil, originating from the fusion of choro with carimbó, merengue, cumbia, mambo, bolero, Jovem Guarda,…",
      },
    ],
  },
  {
    slug: "hapa-haole-music",
    name: "Hapa haole music",
    kind: "style",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q130306615",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Hapa_haole_music",
        evidence: "Hapa haole music (lit. 'half foreign' in Hawaiian) is a genre of Hawaiian music which utilizes primarily English lyrics with themes and instruments attributed to Hawaii, such as the ukulele and steel guitar.",
      },
    ],
  },
  {
    slug: "heartland-rock",
    name: "Heartland rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q747717",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Heartland_rock",
        evidence: "Heartland rock is a genre of rock music characterized by a straightforward, often roots musical style, often with a focus on blue-collar workers, and a conviction that rock music has a social or communal purpose beyond just entertainment.",
      },
    ],
  },
  {
    slug: "hip-house",
    name: "Hip house",
    kind: "style",
    parent: "house",
    countries: ["US"],
    aliases: [],
    wikidata: "Q601235",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Hip_house",
        evidence: "Hip house, also known as rap house or house rap, is a musical genre that mixes elements of house music and hip-hop, which originated in both London and Chicago in the mid-to-late 1980s.",
      },
    ],
  },
  {
    slug: "indie-folk",
    name: "Indie folk",
    kind: "style",
    parent: "folk",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q1317816",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Indie_folk",
        evidence: "Indie folk (also called alternative folk) is an alternative genre of music that emerged in the 1990s among musicians from indie rock scenes who were influenced by folk music.",
      },
    ],
  },
  {
    slug: "inuit-throat-singing",
    name: "Inuit Throat Singing",
    kind: "style",
    parent: "folk",
    countries: ["CA"],
    aliases: ["Katajjaq"],
    wikidata: "Q2956224",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Indigenous_music_of_Canada",
        evidence: "The Inuit are well known for Inuit throat singing or katajjaq, an unusual method of vocalizing found only in a few cultures worldwide.",
      },
    ],
  },
  {
    slug: "jarocho",
    name: "Jarocho",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q6160456",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Jarocho",
        evidence: "Jarocho was, historically, the horseman of the Veracruz countryside, who worked on the haciendas of the state, specifically those dedicated to the job of vaquero (cowherd) and everything related to cattle ranching.",
      },
    ],
  },
  {
    slug: "jongo",
    name: "Jongo",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q505343",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Jongo",
        evidence: "Jongo, also known as caxambu or tabu, is a dance and musical genre of black communities from southeast Brazil.",
      },
    ],
  },
  {
    slug: "jovem-guarda",
    name: "Jovem Guarda",
    kind: "style",
    parent: "rock",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q6296743",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Jovem_Guarda",
        evidence: "Jovem Guarda was primarily a Brazilian musical television show first aired by Rede Record in 1965, although the term soon expanded to designate the entire movement and style surrounding it.",
      },
    ],
  },
  {
    slug: "lambadao-cuiabano",
    name: "Lambadão cuiabano",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10316114",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Lambad%C3%A3o_cuiabano",
        evidence: "Lambadão cuiabano or simply lambadão, is a style of music and dance characteristic of the Mato Grosso region of Baixada Cuiabana, especially in the municipalities of Cuiabá and Várzea Grande, in Brazil.",
      },
    ],
  },
  {
    slug: "latin-trap",
    name: "Latin trap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q54329757",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Latin_trap",
        evidence: "Latin trap is a subgenre of Latin hip hop music that originated in Puerto Rico.",
      },
    ],
  },
  {
    slug: "mangue-bit",
    name: "Mangue bit",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1759189",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Mangue_bit",
        evidence: "Manguebeat, alternatively known as mangue beat or mangue bit, is a social and artistic movement with origins in northeastern Brazilian city Recife, Pernambuco in the early 1900s, in reaction to the economic and cultural stagnation of the capital.",
      },
    ],
  },
  {
    slug: "maracatu",
    name: "Maracatu",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1753071",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Maracatu",
        evidence: "The term maracatu denotes any of several performance genres found in Pernambuco, Northeastern Brazil.",
      },
    ],
  },
  {
    slug: "marchinha",
    name: "Marchinha",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q3889661",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Marchinha",
        evidence: "Marchinha is one of several genres of music typical of Brazilian Carnival in Rio de Janeiro and Southeast Region of Brazil.",
      },
    ],
  },
  {
    slug: "mariachi",
    name: "Mariachi",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q464129",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Mariachi",
        evidence: "Mariachi is a genre of regional Mexican music dating back to at least the 18th century, evolving over time in the countryside of various regions of western Mexico.",
      },
    ],
  },
  {
    slug: "math-rock",
    name: "Math rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1132152",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Math_rock",
        evidence: "Math rock is a style of alternative and indie rock with roots in bands such as King Crimson, Yes, and Rush.",
      },
    ],
  },
  {
    slug: "metis-fiddle",
    name: "Métis Fiddle",
    kind: "style",
    parent: "folk",
    countries: ["CA","US"],
    aliases: ["Metis fiddling"],
    wikidata: "Q6950147",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/M%C3%A9tis_fiddle",
        evidence: "Métis fiddle is the style that the Métis of Canada and Métis in the northern United States have developed to play the violin, solo and in folk ensembles.",
      },
    ],
  },
  {
    slug: "mumble-rap",
    name: "Mumble rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q30638997",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Mumble_rap",
        evidence: "Mumble rap (also known as non-lyrical rap) is a loosely defined style and era of hip-hop that emerged and proliferated via the online audio distribution platform SoundCloud during the mid-to-late 2010s.",
      },
    ],
  },
  {
    slug: "narcocorrido",
    name: "Narcocorrido",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q221934",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Narcocorrido",
        evidence: "A narcocorrido is a subgenre of the regional Mexican corrido (narrative ballad) genre, from which several other genres have evolved.",
      },
    ],
  },
  {
    slug: "neo-soul",
    name: "Neo soul",
    kind: "style",
    parent: "soul",
    countries: ["US"],
    aliases: [],
    wikidata: "Q268253",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Neo_soul",
        evidence: "Neo soul (sometimes called progressive soul) is a genre of popular music.",
      },
    ],
  },
  {
    slug: "neo-psychedelia",
    name: "Neo-psychedelia",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q703778",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Neo-psychedelia",
        evidence: "Neo-psychedelia (or simply neo-psych) is a genre of psychedelic music that draws inspiration from the music production approaches and songwriting of 1960s psychedelia, either exploring emulations of the sounds of the era or applying its ethos to…",
      },
    ],
  },
  {
    slug: "neo-trad",
    name: "Néo-trad",
    kind: "style",
    parent: "folk",
    countries: ["CA"],
    aliases: [],
    wikidata: "Q3347093",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/N%C3%A9o-trad",
        evidence: "Néo-trad is a musical style from Quebec that arose around the turn of the 21st century.",
      },
    ],
  },
  {
    slug: "new-mexico-music",
    name: "New Mexico music",
    kind: "style",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q18217098",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/New_Mexico_music",
        evidence: "The New Mexico music genre (Spanish: música nuevo mexicana / neomexicana) is a genre of music that originated in the US state of New Mexico.",
      },
    ],
  },
  {
    slug: "new-wave-music",
    name: "New wave music",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q187760",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/New_wave_music",
        evidence: "New wave is a music genre encompassing pop-oriented styles that emerged in the United States and United Kingdom in the mid-to late 1970s.",
      },
    ],
  },
  {
    slug: "noise-pop",
    name: "Noise pop",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q2545135",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Noise_pop",
        evidence: "Noise pop is a subgenre of alternative and indie rock that emerged in the mid-1980s in the United Kingdom, originally pioneered by the Jesus and Mary Chain on their debut album Psychocandy.",
      },
    ],
  },
  {
    slug: "noise-rock",
    name: "Noise rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q181861",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Noise_rock",
        evidence: "Noise rock is a subgenre of rock music that originally emerged in the late 1970s and early 1980s.",
      },
    ],
  },
  {
    slug: "nortec",
    name: "Nortec",
    kind: "style",
    parent: "electronic",
    countries: ["MX"],
    aliases: [],
    wikidata: "Q382343",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Nortec",
        evidence: "Nortec or nor-tec (from the combination of \"norteño\" and \"techno\") is a genre of electronic dance music developed in Tijuana (a border city in Baja California, Mexico) that first gained popularity in 2001.",
      },
    ],
  },
  {
    slug: "norteno",
    name: "Norteño",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q1780056",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Norte%C3%B1o_(music)",
        evidence: "Norteño or norteña, also música norteña, is a subgenre of regional Mexican music.",
      },
    ],
  },
  {
    slug: "nu-metal",
    name: "Nu metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q263734",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Nu_metal",
        evidence: "Nu metal (sometimes stylized as nü-metal, with a metal umlaut) is a subgenre of alternative metal that combines elements of heavy metal music with elements of other music genres such as hip-hop, funk, industrial, and grunge.",
      },
    ],
  },
  {
    slug: "pagode",
    name: "Pagode",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q3360459",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pagode",
        evidence: "Pagode]) is a Brazilian style of music that originated in Rio de Janeiro, Brazil, as a subgenre of samba.",
      },
    ],
  },
  {
    slug: "pagode-baiano",
    name: "Pagode baiano",
    kind: "style",
    parent: "pagode",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q25448883",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pagode_baiano",
        evidence: "Pagode baiano (also called pagodão, swingueira and quebradeira) is a Brazilian musical genre created in Salvador, Bahia, originating from the mixture of samba-reggae and pagode, with the main difference being the inclusion of percussion, a faster…",
      },
    ],
  },
  {
    slug: "pisadinha",
    name: "Pisadinha",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q106547262",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pisadinha",
        evidence: "Pisadinha is a musical genre that emerged in the state of Bahia.",
      },
    ],
  },
  {
    slug: "pop-rock",
    name: "Pop rock",
    kind: "style",
    parent: "pop",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q484641",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pop_rock",
        evidence: "Pop rock (also typeset as pop/rock) is rock music with greater emphasis on professional songwriting and recording craft, and less emphasis on attitude than standard rock music.",
      },
    ],
  },
  {
    slug: "pop-punk",
    name: "Pop-punk",
    kind: "style",
    parent: "punk",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q487914",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Pop-punk",
        evidence: "Pop-punk (also punk pop, and alternatively spelled without the hyphen) is a rock music genre that combines elements of punk rock and pop.",
      },
    ],
  },
  {
    slug: "post-disco",
    name: "Post-disco",
    kind: "style",
    parent: null,
    countries: ["US"],
    aliases: [],
    wikidata: "Q1190485",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Post-disco",
        evidence: "Post-disco is a term and genre to describe an aftermath in popular music history c. 1979–1987, imprecisely beginning with the backlash against disco music in the United States, leading to civil unrest and a riot in Chicago known as the Disco…",
      },
    ],
  },
  {
    slug: "post-hardcore",
    name: "Post-hardcore",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q377910",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Post-hardcore",
        evidence: "Post-hardcore is a punk rock music genre that maintains the aggression and intensity of hardcore punk but emphasizes a greater degree of creative expression.",
      },
    ],
  },
  {
    slug: "post-metal",
    name: "Post-metal",
    kind: "style",
    parent: "metal",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q41343",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Post-metal",
        evidence: "Post-metal is a music genre rooted in heavy metal but exploring approaches beyond metal conventions.",
      },
    ],
  },
  {
    slug: "power-pop",
    name: "Power pop",
    kind: "style",
    parent: "pop",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q837837",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Power_pop",
        evidence: "Power pop is a subgenre of rock music and a form of pop rock based on the early music of bands such as the Beach Boys, the Beatles, the Byrds, and the Who.",
      },
    ],
  },
  {
    slug: "progressive-metal",
    name: "Progressive metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q484344",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Progressive_metal",
        evidence: "Progressive metal (often shortened to prog metal) is a broad fusion music genre melding heavy metal and progressive rock, combining the loud aggression and amplified distorted guitar-driven sound of the former with the more experimental, cerebral…",
      },
    ],
  },
  {
    slug: "proibidao",
    name: "Proibidão",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10354439",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Proibid%C3%A3o",
        evidence: "Funk proibidão pɾo.ibiˈdɐ̃w]), or simply Proibidão, which literally translates to \"strongly prohibited\" or \"highly forbidden\", is a subgenre of funk carioca music originating from the favelas of Rio de Janeiro where it began in the early 1990s as a…",
      },
    ],
  },
  {
    slug: "proto-punk",
    name: "Proto-punk",
    kind: "style",
    parent: "punk",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q27190",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Proto-punk",
        evidence: "Proto-punk (or protopunk) is music that foreshadowed the punk rock genre, particularly rock music artists during the 1960s and early-to mid 1970s.",
      },
    ],
  },
  {
    slug: "psychedelic-pop",
    name: "Psychedelic pop",
    kind: "style",
    parent: "pop",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q383982",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Psychedelic_pop",
        evidence: "Psychedelic pop (or acid pop) is a genre of pop music that contains musical characteristics associated with psychedelic music.",
      },
    ],
  },
  {
    slug: "psychobilly",
    name: "Psychobilly",
    kind: "style",
    parent: "rock",
    countries: ["US","GB"],
    aliases: [],
    wikidata: "Q13627677",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Psychobilly",
        evidence: "Psychobilly (also known as punkabilly) is a rock music fusion genre that fuses elements of rockabilly and punk rock.",
      },
    ],
  },
  {
    slug: "punk-rap",
    name: "Punk rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q65089257",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Punk_rap",
        evidence: "Punk rap is a fusion genre that merges punk rock and hip-hop.",
      },
    ],
  },
  {
    slug: "rage",
    name: "Rage",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q111133884",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rage_(music_genre)",
        evidence: "Rage (also known as rage music, rage beats or rage rap) is a subgenre of trap music that originated in the United States in the late 2010s.",
      },
    ],
  },
  {
    slug: "ragtime",
    name: "Ragtime",
    kind: "style",
    parent: "jazz",
    countries: ["US"],
    aliases: [],
    wikidata: "Q185652",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Ragtime",
        evidence: "Ragtime, also spelled rag-time or rag time, is a musical style noted for its syncopated or \"ragged\" rhythm.",
      },
    ],
  },
  {
    slug: "ranchera",
    name: "Ranchera",
    kind: "style",
    parent: null,
    countries: ["MX"],
    aliases: [],
    wikidata: "Q727634",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Ranchera",
        evidence: "Ranchera or canción ranchera is a genre of traditional music of Mexico.",
      },
    ],
  },
  {
    slug: "rap-metal",
    name: "Rap metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q856872",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rap_metal",
        evidence: "Rap metal is a fusion genre that combines hip-hop with heavy metal.",
      },
    ],
  },
  {
    slug: "rasteirinha",
    name: "Rasteirinha",
    kind: "style",
    parent: "funk-carioca",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q20716146",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rasteirinha",
        evidence: "Rasteirinha or Ragga funk is a subgenre of funk carioca that takes large influence from samba and axé, and adopts Caribbean grooves derived from reggaeton and dancehall.",
      },
    ],
  },
  {
    slug: "riot-grrrl",
    name: "Riot grrrl",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q677542",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Riot_grrrl",
        evidence: "Riot grrrl is an underground feminist punk movement that began during the early 1990s within the United States in Olympia, Washington, and the greater Pacific Northwest, and has expanded to at least 26 other countries.",
      },
    ],
  },
  {
    slug: "rock-and-roll",
    name: "Rock and roll",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q7749",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rock_and_roll",
        evidence: "Rock and roll is a genre of popular music that evolved in the United States during the late 1940s and early 1950s.",
      },
    ],
  },
  {
    slug: "rock-doido",
    name: "Rock doido",
    kind: "style",
    parent: "rock",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q140799760",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rock_doido",
        evidence: "Rock doido (lit. 'crazy rock') is a Brazilian musical genre that emerged in the outskirts of Belém, Pará, as a sped-up offshoot of tecnobrega in the late 2000s.",
      },
    ],
  },
  {
    slug: "rockabilly",
    name: "Rockabilly",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q203720",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Rockabilly",
        evidence: "Rockabilly is one of the earliest styles of rock and roll music.",
      },
    ],
  },
  {
    slug: "roots-rock",
    name: "Roots rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1929352",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Roots_rock",
        evidence: "Roots rock is a genre of rock music that looks back to rock's origins in folk, blues, and country music.",
      },
    ],
  },
  {
    slug: "samba",
    name: "Samba",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q11403",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba",
        evidence: "Samba is a broad term for many of the rhythms that compose the better known Brazilian music genres that originated in the Afro-Brazilian communities of Bahia in the late 19th century and early 20th century.",
      },
    ],
  },
  {
    slug: "samba-de-breque",
    name: "Samba de breque",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10367246",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba_de_breque",
        evidence: "Samba de breque is a subgenre of samba that emerged in Rio de Janeiro between the late 1930s and early 1940s.",
      },
    ],
  },
  {
    slug: "samba-funk",
    name: "Samba funk",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10367221",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba_funk",
        evidence: "Samba funk is a musical subgenre that fuses Brazilian samba and American funk.",
      },
    ],
  },
  {
    slug: "samba-reggae",
    name: "Samba reggae",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q455686",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba_reggae",
        evidence: "Samba-reggae is a music genre from Bahia, Brazil.",
      },
    ],
  },
  {
    slug: "samba-rock",
    name: "Samba rock",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q834959",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba_rock",
        evidence: "Samba rock (also known as samba soul or confused with samba funk and sambalanço) is a Brazilian dance culture and music genre that fuses samba with rock, soul, and funk.",
      },
    ],
  },
  {
    slug: "samba-cancao",
    name: "Samba-canção",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q4215151",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba-can%C3%A7%C3%A3o",
        evidence: "Samba-canção is, in its most common interpretation, a kind of Brazilian popular song with a slow-paced samba rhythm.",
      },
    ],
  },
  {
    slug: "samba-choro",
    name: "Samba-choro",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10367217",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba-choro",
        evidence: "Samba-choro is a subgenre of samba that emerged in Rio de Janeiro in early 1930s in Brazil.",
      },
    ],
  },
  {
    slug: "samba-enredo",
    name: "Samba-enredo",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q3470692",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba-enredo",
        evidence: "Samba-enredo, also known as samba de enredo, is a sub-genre of modern samba made specifically by a samba school for the festivities of Brazilian Carnival.",
      },
    ],
  },
  {
    slug: "samba-jazz",
    name: "Samba-jazz",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q13634037",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba-jazz",
        evidence: "Samba-jazz or jazz samba is an instrumental subgenre of samba that emerged in the bossa nova ambit in the late 1950s and early 1960s in Brazil.",
      },
    ],
  },
  {
    slug: "samba-sincopado",
    name: "Samba-sincopado",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10367226",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Samba-sincopado",
        evidence: "Samba-sincopado (lit. 'syncopated samba') is a subgenre of samba that emphasises the syncopation of the musical genre.",
      },
    ],
  },
  {
    slug: "sambalanco",
    name: "Sambalanço",
    kind: "style",
    parent: "samba",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10367259",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Sambalan%C3%A7o",
        evidence: "Sambalanço (a portmanteau of samba and balanço, meaning swing or beat in Portuguese) is a musical genre derived from samba that developed from the early 1950s to the mid-1960s in Brazil, especially in its two largest centers, São Paulo and Rio de…",
      },
    ],
  },
  {
    slug: "sambass",
    name: "Sambass",
    kind: "style",
    parent: "drum-and-bass",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q3179786",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Sambass",
        evidence: "Sambass, drum 'n' bossa or drum 'n' sambass (a portmanteau of \"samba\" and \"bass\") is a regional subgenre of drum and bass music mostly native to Brazil, which combines drum and bass rhythms with influences from Latin American music.",
      },
    ],
  },
  {
    slug: "scam-rap",
    name: "Scam rap",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q122143484",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Scam_rap",
        evidence: "Scam rap is a subgenre of hip-hop music that emerged in Detroit during the mid to late 2010s.",
      },
    ],
  },
  {
    slug: "screamo",
    name: "Screamo",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q11363",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Screamo",
        evidence: "Screamo (also referred to as skramz) is a subgenre of emo that emerged in the early 1990s and emphasizes \"willfully experimental dissonance and dynamics\".",
      },
    ],
  },
  {
    slug: "sertanejo-music",
    name: "Sertanejo music",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1958273",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Sertanejo_music",
        evidence: "Sertanejo music is a term used to refer to a musical style of Brazil.",
      },
    ],
  },
  {
    slug: "skate-punk",
    name: "Skate punk",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q828305",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Skate_punk",
        evidence: "Skate punk (also known as skatecore and skate rock) is a skater subculture and punk rock subgenre that developed in the 1980s.",
      },
    ],
  },
  {
    slug: "slowcore",
    name: "Slowcore",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1490170",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Slowcore",
        evidence: "Slowcore, also known as sadcore, is a subgenre of indie rock characterised by subdued tempos, minimalist instrumentation, and calm, sombre vocal performances.",
      },
    ],
  },
  {
    slug: "soft-rock",
    name: "Soft rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q217191",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Soft_rock",
        evidence: "Soft rock (also known as light rock, mellow rock or adult-oriented rock) is a form of rock music that originated in the late 1960s in the United States and the United Kingdom which smoothed over the edges of singer-songwriter and pop rock, relying…",
      },
    ],
  },
  {
    slug: "space-age-pop",
    name: "Space age pop",
    kind: "style",
    parent: "pop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1779294",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Space_age_pop",
        evidence: "Space age pop or bachelor pad music is a subgenre of easy listening or lounge music associated with American and Mexican composers, songwriters, and bandleaders in the Space Age of the 1950s and 1960s.",
      },
    ],
  },
  {
    slug: "stronda",
    name: "Stronda",
    kind: "style",
    parent: "hip-hop",
    countries: ["BR"],
    aliases: [],
    wikidata: "Q7624424",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Stronda",
        evidence: "Stronda is a subgenre of Brazilian hip hop music and a cross-genre that has elements of hip hop, funk, pop, surf music and rock that started in 2004 in Rio de Janeiro with the group Prexeca Bangers The press noted the \"politically incorrect\" and…",
      },
    ],
  },
  {
    slug: "sunshine-pop",
    name: "Sunshine pop",
    kind: "style",
    parent: "pop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q2461933",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Sunshine_pop",
        evidence: "Sunshine pop (originally called soft pop and soft rock) is a loosely defined form of pop music that was first associated with early soft rock producers and songwriters based in Los Angeles, California, during the mid- to late 1960s.",
      },
    ],
  },
  {
    slug: "surf-music",
    name: "Surf music",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q220830",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Surf_music",
        evidence: "Surf rock (also known as surf pop, surf music, or surf guitar) is a genre of rock and roll associated with surf culture, particularly as found in Southern California.",
      },
    ],
  },
  {
    slug: "swamp-pop",
    name: "Swamp pop",
    kind: "style",
    parent: "r-and-b",
    countries: ["US"],
    aliases: [],
    wikidata: "Q106522115",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Swamp_pop",
        evidence: "Swamp pop is a music genre indigenous to the Acadiana region of south Louisiana and an adjoining section of southeast Texas.",
      },
    ],
  },
  {
    slug: "swamp-rock",
    name: "Swamp rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q675553",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Swamp_rock",
        evidence: "Swamp rock is a genre of rock music that originated in the mid-1960s as a fusion of rockabilly and soul music with swamp blues, country music and funk.",
      },
    ],
  },
  {
    slug: "swing-music",
    name: "Swing music",
    kind: "style",
    parent: "jazz",
    countries: ["US"],
    aliases: [],
    wikidata: "Q203775",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Swing_music",
        evidence: "Swing music is a style of jazz that developed in the United States during the late 1920s and early 1930s before gaining widespread popularity in the mid-1930s.",
      },
    ],
  },
  {
    slug: "tche-music",
    name: "Tche music",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q7690640",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tche_music",
        evidence: "Tchê music or chê music is a variation of the traditional music style from the most southern state of Brazil, Rio Grande do Sul.",
      },
    ],
  },
  {
    slug: "tejano-music",
    name: "Tejano music",
    kind: "style",
    parent: "latin",
    countries: ["US"],
    aliases: [],
    wikidata: "Q431415",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tejano_music",
        evidence: "Tejano music (Spanish: música tejana), also known as Tex-Mex music, is a popular music style fusing American and Mexican influences.",
      },
    ],
  },
  {
    slug: "thrash-metal",
    name: "Thrash metal",
    kind: "style",
    parent: "metal",
    countries: ["US"],
    aliases: [],
    wikidata: "Q483352",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Thrash_metal",
        evidence: "Thrash metal (or simply thrash) is an extreme subgenre of heavy metal music characterized by its overall aggression and fast tempo.",
      },
    ],
  },
  {
    slug: "thrashcore",
    name: "Thrashcore",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1995569",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Thrashcore",
        evidence: "Thrashcore (also known as fastcore) is a fast-tempo subgenre of hardcore punk that emerged in the early 1980s.",
      },
    ],
  },
  {
    slug: "toronto-sound-1960s-r-and-b",
    name: "Toronto Sound (1960s R&B)",
    kind: "style",
    parent: "r-and-b",
    countries: ["CA"],
    aliases: [],
    wikidata: "Q7826509",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Toronto_sound",
        evidence: "The Toronto sound was a characteristic R&B sound in the 1960s, heavily influenced by American R&B.",
      },
    ],
  },
  {
    slug: "toronto-sound-hip-hop-and-r-and-b",
    name: "Toronto Sound (Hip-Hop and R&B)",
    kind: "style",
    parent: "hip-hop",
    countries: ["CA"],
    aliases: ["6 Sound","New Toronto sound"],
    wikidata: "Q129312602",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Toronto_sound_(hip-hop)",
        evidence: "The Toronto sound (sometimes referred to as the 6 Sound or new Toronto sound) refers to a style of hip hop and R&B that emerged from Toronto in the late 2000s and early 2010s.",
      },
    ],
  },
  {
    slug: "tough-guy-hardcore",
    name: "Tough guy hardcore",
    kind: "style",
    parent: "punk",
    countries: ["US"],
    aliases: [],
    wikidata: "Q131286017",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tough_guy_hardcore",
        evidence: "Tough guy hardcore (also known as New York–style hardcore) is a subgenre of hardcore punk with prominent influences from thrash metal.",
      },
    ],
  },
  {
    slug: "trap-music",
    name: "Trap music",
    kind: "style",
    parent: "hip-hop",
    countries: ["US"],
    aliases: [],
    wikidata: "Q2913982",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Trap_music",
        evidence: "Trap music, also known simply as trap, is a subgenre of hip-hop music that originated in the Southern United States.",
      },
    ],
  },
  {
    slug: "tribal-guarachero",
    name: "Tribal guarachero",
    kind: "style",
    parent: "electronic",
    countries: ["MX"],
    aliases: [],
    wikidata: "Q7844612",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tribal_guarachero",
        evidence: "Tribal guarachero, also known as tribal, is a music genre that fuses electronic dance music with cumbia or certain rhythms from regional Mexican music genres.",
      },
    ],
  },
  {
    slug: "tropicalia",
    name: "Tropicália",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q1413061",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tropic%C3%A1lia",
        evidence: "Tropicália, also known as tropicalismo ([tɾopikaˈlizmu, tɾɔ-]), was a Brazilian art movement that arose in the late 1960s.",
      },
    ],
  },
  {
    slug: "tulsa-sound",
    name: "Tulsa sound",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q642760",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Tulsa_sound",
        evidence: "The Tulsa sound is a popular musical style that originated in Tulsa, Oklahoma, during the second half of the twentieth century.",
      },
    ],
  },
  {
    slug: "turlutte",
    name: "Turlutte",
    kind: "style",
    parent: "folk",
    countries: ["CA"],
    aliases: [],
    wikidata: "Q3542334",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Turlutte_(music)",
        evidence: "In Quebec, the turlutte is a form of traditional popular song, which is associated with specific melody ornaments.",
      },
    ],
  },
  {
    slug: "vanguarda-paulista",
    name: "Vanguarda Paulista",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q10389097",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Vanguarda_Paulista",
        evidence: "Vanguarda Paulista, also named Vanguarda Paulistana (São Paulo Avant-garde), was the name given to a Brazilian cultural movement which happened in São Paulo between 1979 and 1985, at the final years of the Brazilian military dictatorship.",
      },
    ],
  },
  {
    slug: "vaporwave",
    name: "Vaporwave",
    kind: "style",
    parent: "electronic",
    countries: ["US"],
    aliases: [],
    wikidata: "Q15733887",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Vaporwave",
        evidence: "Vaporwave is an internet music microgenre, aesthetic, and meme that emerged in the early 2010s.",
      },
    ],
  },
  {
    slug: "western-music",
    name: "Western music",
    kind: "style",
    parent: "country",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1425111",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Western_music_(North_America)",
        evidence: "Western music, also known as Cowboy music or simply western, is a form of music composed by and about the people who settled and worked throughout the Western United States and Western Canada.",
      },
    ],
  },
  {
    slug: "western-swing",
    name: "Western swing",
    kind: "style",
    parent: "country",
    countries: ["US"],
    aliases: [],
    wikidata: "Q1730388",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Western_swing",
        evidence: "Western swing, also known as country jazz, is a subgenre of traditional country music.",
      },
    ],
  },
  {
    slug: "wizard-rock",
    name: "Wizard rock",
    kind: "style",
    parent: "rock",
    countries: ["US"],
    aliases: [],
    wikidata: "Q3296134",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Wizard_rock",
        evidence: "Wizard rock (or Wrock) is a type of novelty rock music and filk music themed around the Harry Potter franchise.",
      },
    ],
  },
  {
    slug: "xote",
    name: "Xote",
    kind: "style",
    parent: null,
    countries: ["BR"],
    aliases: [],
    wikidata: "Q502808",
    sources: [
      {
        url: "https://en.wikipedia.org/wiki/Xote",
        evidence: "Xote is a Brazilian music genre and dance with a binary or quaternary rhythm.",
      },
    ],
  },
];
