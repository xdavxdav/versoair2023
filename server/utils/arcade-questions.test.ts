import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCADE_DEFAULT_ROUNDS,
  ARCADE_MAX_ROUNDS,
  ARCADE_MIN_ROUNDS,
  parseArcadeLanguage,
} from "../../shared/arcade-rules";
import {
  GUESS_QUESTIONS,
  DECADE_QUESTIONS,
  LYRICS_QUESTIONS,
  QUESTION_GAME_TYPES,
  TRIVIA_QUESTIONS,
  questionBankFor,
} from "./arcade-question-bank";
import {
  createSeededRng,
  resolveRoundCount,
  selectQuestions,
  type BankQuestion,
} from "./arcade-questions";

let nextId = 0;
function question(lang: "en" | "fr" | "es", extra: Partial<BankQuestion> = {}): BankQuestion {
  nextId += 1;
  return {
    q: `${lang} question ${nextId}`,
    options: ["a", "b", "c", "d"],
    answer: 0,
    lang,
    ...extra,
  };
}
const many = (lang: "en" | "fr" | "es", n: number) =>
  Array.from({ length: n }, () => question(lang));
const langs = (picked: BankQuestion[]) => picked.map((p) => p.lang);

test("parseArcadeLanguage accepts en|fr|es and defaults to en", () => {
  assert.equal(parseArcadeLanguage("fr"), "fr");
  assert.equal(parseArcadeLanguage(" ES "), "es");
  assert.equal(parseArcadeLanguage("fr-CA"), "fr");
  assert.equal(parseArcadeLanguage("en_US"), "en");
  for (const bad of ["de", "", "frfr", "xx", undefined, null, 5, {}, ["fr"]]) {
    assert.equal(parseArcadeLanguage(bad), "en", `${String(bad)} must default to en`);
  }
});

test("questions in the visitor's language come first and fill the match on their own", () => {
  const bank = [...many("fr", 6), ...many("en", 6), ...many("es", 6)];
  for (const language of ["en", "fr", "es"] as const) {
    const picked = selectQuestions(bank, { language, count: 5, rng: createSeededRng(1) });
    assert.equal(picked.length, 5);
    assert.deepEqual(new Set(langs(picked)), new Set([language]));
  }
});

test("a short language is topped up from English, then from any other language", () => {
  const bank = [...many("fr", 2), ...many("en", 2), ...many("es", 3)];
  const picked = selectQuestions(bank, { language: "fr", count: 6, rng: createSeededRng(7) });
  assert.deepEqual(langs(picked), ["fr", "fr", "en", "en", "es", "es"]);

  const spanish = selectQuestions(bank, { language: "es", count: 7, rng: createSeededRng(7) });
  assert.deepEqual(langs(spanish), ["es", "es", "es", "en", "en", "fr", "fr"]);
});

test("English visitors are topped up from the other languages when English runs out", () => {
  const bank = [...many("en", 1), ...many("fr", 3), ...many("es", 3)];
  const picked = selectQuestions(bank, { language: "en", count: 5, rng: createSeededRng(3) });
  assert.equal(picked.length, 5);
  assert.equal(picked[0].lang, "en");
  assert.equal(picked.slice(1).filter((p) => p.lang === "en").length, 0);
});

test("with only French questions every language is served French in full", () => {
  const bank = many("fr", 8);
  for (const language of ["en", "fr", "es"] as const) {
    const picked = selectQuestions(bank, { language, count: 6, rng: createSeededRng(11) });
    assert.equal(picked.length, 6);
    assert.deepEqual(new Set(langs(picked)), new Set(["fr"]));
  }
});

test("never fewer than the round count while enough distinct questions exist, never more than exist", () => {
  const bank = [...many("fr", 1), ...many("en", 1), ...many("es", 1), ...many("fr", 7)];
  for (const language of ["en", "fr", "es"] as const) {
    for (let count = 0; count <= 12; count++) {
      const picked = selectQuestions(bank, { language, count, rng: createSeededRng(count) });
      assert.equal(picked.length, Math.min(count, bank.length), `${language} x ${count}`);
    }
  }
});

test("a question is never repeated inside one match, translations included", () => {
  const dup = question("fr", { q: "same text" });
  const bank = [
    dup,
    { ...dup },
    question("fr", { group: "g1", q: "Quelle est la capitale ?" }),
    question("en", { group: "g1", q: "What is the capital?" }),
    question("es", { group: "g1", q: "¿Cuál es la capital?" }),
    ...many("en", 3),
  ];
  for (const language of ["en", "fr", "es"] as const) {
    const picked = selectQuestions(bank, { language, count: 20, rng: createSeededRng(5) });
    const keys = picked.map((p) => p.group ?? p.q);
    assert.equal(new Set(keys).size, keys.length, `${language}: ${keys.join(" | ")}`);
    assert.equal(picked.length, 5, "unique keys: the repeated text, group g1 and three English singles");
  }
});

test("a translated question is served in the visitor's language when it exists", () => {
  const bank = [
    question("fr", { group: "g1", q: "fr version" }),
    question("en", { group: "g1", q: "en version" }),
    question("es", { group: "g1", q: "es version" }),
  ];
  assert.equal(selectQuestions(bank, { language: "es", count: 1, rng: createSeededRng(1) })[0].q, "es version");
  assert.equal(selectQuestions(bank, { language: "fr", count: 1, rng: createSeededRng(1) })[0].q, "fr version");
  assert.equal(selectQuestions(bank, { language: "en", count: 3, rng: createSeededRng(1) }).length, 1);
});

test("the same seed gives the same questions in the same order, other seeds differ", () => {
  const bank = [...many("fr", 12), ...many("en", 12)];
  const run = (seed: number) =>
    selectQuestions(bank, { language: "fr", count: 8, rng: createSeededRng(seed) }).map((p) => p.q);
  assert.deepEqual(run(42), run(42));
  const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => run(seed).join("|")));
  assert.ok(orders.size > 1, "different seeds should reorder the picks");
});

test("selection does not mutate the bank and is not biased toward the head of the bank", () => {
  const bank = many("fr", 10);
  const snapshot = bank.map((b) => b.q);
  selectQuestions(bank, { language: "fr", count: 4, rng: createSeededRng(9) });
  assert.deepEqual(bank.map((b) => b.q), snapshot);

  const firstSeen = new Map<string, number>();
  for (let seed = 0; seed < 400; seed++) {
    const first = selectQuestions(bank, { language: "fr", count: 1, rng: createSeededRng(seed) })[0].q;
    firstSeen.set(first, (firstSeen.get(first) ?? 0) + 1);
  }
  assert.equal(firstSeen.size, 10, "every question can come first");
  for (const count of firstSeen.values()) assert.ok(count > 10 && count < 90, `skewed shuffle: ${count}`);
});

test("createSeededRng returns numbers in [0, 1)", () => {
  const rng = createSeededRng(123);
  for (let i = 0; i < 1000; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1);
  }
});

test("resolveRoundCount clamps to the allowed range and to what the bank can serve", () => {
  assert.equal(resolveRoundCount(undefined, 17), ARCADE_DEFAULT_ROUNDS);
  assert.equal(resolveRoundCount("abc", 17), ARCADE_DEFAULT_ROUNDS);
  assert.equal(resolveRoundCount(1, 17), ARCADE_MIN_ROUNDS);
  assert.equal(resolveRoundCount(99, 17), ARCADE_MAX_ROUNDS);
  assert.equal(resolveRoundCount("6", 17), 6);
  assert.equal(resolveRoundCount(10, 5), 5, "a 5-question bank cannot run 10 rounds");
  assert.equal(resolveRoundCount(4, 2), 2);
  assert.equal(resolveRoundCount(4, 0), 0);
});

test("the question bank is tagged, well formed and has no duplicate questions", () => {
  const banks = { TRIVIA_QUESTIONS, LYRICS_QUESTIONS, GUESS_QUESTIONS, DECADE_QUESTIONS };
  const seen = new Set<string>();
  for (const [name, bank] of Object.entries(banks)) {
    assert.ok(bank.length > 0, `${name} is empty`);
    for (const item of bank) {
      assert.ok(["en", "fr", "es"].includes(item.lang), `${name}: "${item.q}" has no valid lang tag`);
      assert.equal(item.options.length, 4, `${name}: "${item.q}" needs exactly 4 options`);
      assert.equal(new Set(item.options).size, 4, `${name}: "${item.q}" has repeated options`);
      assert.ok(item.options.every((o) => o.trim().length > 0), `${name}: "${item.q}" has an empty option`);
      assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4, `${name}: "${item.q}" has a bad answer index`);
      assert.ok(item.q.trim().length > 0);
      assert.ok(!seen.has(item.q.trim()), `duplicate question text: ${item.q}`);
      seen.add(item.q.trim());
    }
  }
});

test("translations of one question share a group and never share a language", () => {
  const all = [...TRIVIA_QUESTIONS, ...LYRICS_QUESTIONS, ...GUESS_QUESTIONS, ...DECADE_QUESTIONS];
  const groups = new Map<string, string[]>();
  for (const item of all) {
    if (!item.group) continue;
    groups.set(item.group, [...(groups.get(item.group) ?? []), item.lang]);
  }
  for (const [group, groupLangs] of groups) {
    assert.equal(new Set(groupLangs).size, groupLangs.length, `group ${group} repeats a language`);
  }
});

test("every game type maps to a bank and the real banks serve a full match in every language", () => {
  assert.deepEqual([...QUESTION_GAME_TYPES].sort(), ["artist", "decade", "guess", "lyrics", "music_trivia", "trivia"]);
  assert.equal(questionBankFor("trivia"), TRIVIA_QUESTIONS);
  assert.equal(questionBankFor("music_trivia"), TRIVIA_QUESTIONS);
  assert.equal(questionBankFor("lyrics"), LYRICS_QUESTIONS);
  assert.equal(questionBankFor("guess"), GUESS_QUESTIONS);
  assert.equal(questionBankFor("artist"), GUESS_QUESTIONS);
  assert.equal(questionBankFor("decade"), DECADE_QUESTIONS);
  assert.equal(questionBankFor("prediction_market"), null);

  for (const gameType of QUESTION_GAME_TYPES) {
    const bank = questionBankFor(gameType)!;
    for (const language of ["en", "fr", "es"] as const) {
      const rounds = resolveRoundCount(ARCADE_MAX_ROUNDS, bank.length);
      const picked = selectQuestions(bank, { language, count: rounds, rng: createSeededRng(2) });
      assert.equal(picked.length, rounds, `${gameType}/${language}`);
      assert.equal(new Set(picked.map((p) => p.q)).size, rounds);
    }
  }
});
