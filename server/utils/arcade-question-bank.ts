/**
 * Arcade question banks.
 *
 * HOW TO ADD A QUESTION
 *  1. Pick the bank for the game: TRIVIA_QUESTIONS (Trivia Duel), LYRICS_QUESTIONS
 *     (Lyrics), GUESS_QUESTIONS (Name That Track and Artist Showdown),
 *     DECADE_QUESTIONS (Decade Dash).
 *  2. Append an object to that array:
 *       {
 *         q: "Which country is Amapiano from?",
 *         options: ["Nigeria", "Ghana", "South Africa", "Kenya"],
 *         answer: 2,
 *         lang: "en",
 *       },
 *  3. Rules (server/utils/arcade-questions.test.ts checks them):
 *     - lang is the language the question text `q` is written in: "en", "fr" or "es".
 *       Tag what is written, not what the song is in.
 *     - Exactly 4 options, all different and non-empty; `answer` is the index (0-3) of the right one.
 *     - `q` is unique across the whole bank. Never reuse the same text.
 *     - To add a translation of an existing question, write it as a new entry with its own
 *       `lang` and give both entries the same `group` string (any id, e.g. "afrobeats-2020").
 *       A match serves one entry per group, in the visitor's language when it exists.
 *     - Do not edit the order or the text of live questions to "fix" them; replace them.
 *  4. Nothing else to change: selectQuestions (arcade-questions.ts) serves the visitor's language
 *     first, tops up from English, then from any other language, and never repeats a question.
 *
 * A bank needs at least as many questions as the game's round count (ARCADE_GAMES in the
 * Arcade page); a smaller bank runs fewer rounds instead of repeating questions.
 * Answers live only on the server (`answer`) and are never sent to the browser.
 *
 * Note: the four banks below are the original content. They are all written in French,
 * including the lyric questions whose lyric to complete is in English.
 */
import type { BankQuestion } from "./arcade-questions";

export const TRIVIA_QUESTIONS: BankQuestion[] = [
  {
    q: "Quel artiste a popularisé l'Afrobeats à l'international en 2020 ?",
    options: ["Burna Boy", "Davido", "Wizkid", "Tiwa Savage"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Dans quel pays est né le genre musical Amapiano ?",
    options: ["Nigeria", "Ghana", "Afrique du Sud", "Kenya"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Quel instrument est central dans la musique Highlife ?",
    options: ["Djembé", "Guitare", "Kora", "Balafon"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Qui est considéré comme le père du Reggae ?",
    options: ["Peter Tosh", "Bob Marley", "Jimmy Cliff", "Burning Spear"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Le Coupé-Décalé est originaire de quel pays ?",
    options: ["Sénégal", "Cameroun", "Côte d'Ivoire", "Mali"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Quel genre musical utilise le 'log drum' comme signature sonore ?",
    options: ["Amapiano", "Dancehall", "Afrobeats", "Zouk"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Fela Kuti est le créateur de quel genre musical ?",
    options: ["Jùjú", "Highlife", "Afrobeat", "Fuji"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Quel pays est le berceau du Dancehall ?",
    options: ["Trinidad", "Jamaïque", "Barbade", "Haïti"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Le Zouk est originaire de quelles îles ?",
    options: ["Martinique & Guadeloupe", "Haïti", "Réunion", "Maurice"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Quel artiste a rendu le Ndombolo populaire ?",
    options: ["Koffi Olomide", "Papa Wemba", "Awilo Longomba", "Fally Ipupa"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Le Mbalax est associé à quel pays ?",
    options: ["Mali", "Sénégal", "Guinée", "Gambie"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Quelle chanteuse béninoise est connue pour 'Désolé' ?",
    options: ["Angélique Kidjo", "Fatoumata Diawara", "Asa", "Yemi Alade"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Le Gqom vient de quelle ville ?",
    options: ["Johannesburg", "Lagos", "Durban", "Accra"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Combien de cordes possède une Kora traditionnelle ?",
    options: ["12", "15", "21", "25"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Quel producteur est derrière le hit 'One Dance' de Drake ?",
    options: ["Sarz", "Wizkid", "Masterkraft", "Tekno"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Quel est le tempo habituel d'un morceau d'Amapiano ?",
    options: ["110 - 116 BPM", "130 - 140 BPM", "85 - 95 BPM", "160 - 170 BPM"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Quel instrument traditionnel ouest-africain est un xylophone sur calebasses ?",
    options: ["Kora", "Balafon", "Djembe", "Ngoni"],
    answer: 1,
    lang: "fr",
  },
];

export const LYRICS_QUESTIONS: BankQuestion[] = [
  {
    q: "Complétez : 'Premier Gaou n'est pas gaou oh, c'est le...'",
    options: [
      "deuxième gaou qui est gnata",
      "dernier gaou qui pleure",
      "vrai gaou d'Abidjan",
      "gaou sans argent",
    ],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Dans 'Ye' de Burna Boy : 'I can't come and kill myself, I make money...'",
    options: ["everyday", "and flex", "for my life", "all the time"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans 'Essence' de Wizkid & Tems : 'You don't need no other body...'",
    options: [
      "only you can hold me",
      "you dey make me feel alright",
      "baby girl you shine so bright",
      "say my body is your body",
    ],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Complétez : 'Sapés comme jamais, loulou et...' ",
    options: ["gucci", "boutin", "prada", "versace"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans 'Jerusalema' de Master KG : 'Jerusalema ikhaya lami, zungangishiyi...'",
    options: ["la phantsi", "lana", "ebusuku", "kude"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans 'Calm Down' de Rema : 'Baby, calm down, calm down, girl this your body...'",
    options: [
      "dey put my heart for lockdown",
      "e dey give me fever",
      "is sweet like sugar",
      "dey make me crazy",
    ],
    answer: 0,
    lang: "fr",
  },
];

export const GUESS_QUESTIONS: BankQuestion[] = [
  {
    q: "Qui interprète le titre mondial 'Love Nwantiti' ?",
    options: ["CKay", "Omah Lay", "Ruger", "Joeboy"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Qui a composé la chanson mythique 'Soul Makossa' en 1972 ?",
    options: [
      "Manu Dibango",
      "Francis Bebey",
      "André-Marie Tala",
      "Eboa Lotin",
    ],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Qui chante 'Water' devenu viral sur TikTok et Grammy Winner ?",
    options: ["Tyla", "Ayra Starr", "Tems", "Amaarae"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Quel collectif ivoirien est célèbre pour le titre '1er Gaou' ?",
    options: ["Magic System", "Tour 2 Garde", "Kiff No Beat", "Espoir 2000"],
    answer: 0,
    lang: "fr",
  },
  {
    q: "Qui a sorti l'album acclamé 'Made in Lagos' en 2020 ?",
    options: ["Wizkid", "Davido", "Burna Boy", "Olamide"],
    answer: 0,
    lang: "fr",
  },
];

export const DECADE_QUESTIONS: BankQuestion[] = [
  {
    q: "Dans quelle décennie est sorti l'album 'Zombie' de Fela Kuti ?",
    options: ["Années 1960", "Années 1970", "Années 1980", "Années 1990"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans quelle décennie le Coupé-Décalé a-t-il explosé avec Douk Saga ?",
    options: ["Années 1990", "Années 2000", "Années 2010", "Années 2020"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans quelle décennie l'Amapiano est-il devenu un phénomène planétaire ?",
    options: ["Années 2000", "Années 2010", "Années 2020", "Années 1990"],
    answer: 2,
    lang: "fr",
  },
  {
    q: "Dans quelle décennie Bob Marley a-t-il sorti l'album 'Exodus' ?",
    options: ["Années 1960", "Années 1970", "Années 1980", "Années 1990"],
    answer: 1,
    lang: "fr",
  },
  {
    q: "Dans quelle décennie le titre 'Yéké Yéké' de Mory Kanté a-t-il dominé les charts européens ?",
    options: ["Années 1970", "Années 1980", "Années 1990", "Années 2000"],
    answer: 1,
    lang: "fr",
  },
];

/** Game types that are played with a question bank. Everything else is not playable yet. */
export const QUESTION_GAME_TYPES = [
  "music_trivia",
  "trivia",
  "lyrics",
  "guess",
  "decade",
  "artist",
] as const;
export type QuestionGameType = (typeof QUESTION_GAME_TYPES)[number];

export function isQuestionGameType(value: unknown): value is QuestionGameType {
  return (
    typeof value === "string" &&
    (QUESTION_GAME_TYPES as readonly string[]).includes(value)
  );
}

/** The bank a game type draws from, or null when the type has no question bank. */
export function questionBankFor(gameType: string): BankQuestion[] | null {
  switch (gameType) {
    case "music_trivia":
    case "trivia":
      return TRIVIA_QUESTIONS;
    case "lyrics":
      return LYRICS_QUESTIONS;
    case "guess":
    case "artist":
      return GUESS_QUESTIONS;
    case "decade":
      return DECADE_QUESTIONS;
    default:
      return null;
  }
}
