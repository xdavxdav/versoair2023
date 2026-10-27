// Country labels follow the language the visitor reads. Intl already knows every
// locale the language picker offers, so no per-language list is maintained here.
const OVERRIDES: Record<string, Record<string, string>> = {
  CD: { en: "Congo (DRC)", fr: "Congo (RDC)", es: "Congo (RDC)" },
  CG: { en: "Congo (Brazzaville)", fr: "Congo (Brazzaville)", es: "Congo (Brazzaville)" },
};

const regionNames = new Map<string, Intl.DisplayNames | null>();
const collators = new Map<string, Intl.Collator>();

function regionNamesFor(language: string): Intl.DisplayNames | null {
  const cached = regionNames.get(language);
  if (cached !== undefined) return cached;
  let formatter: Intl.DisplayNames | null = null;
  try {
    formatter = new Intl.DisplayNames([language], {
      type: "region",
      fallback: "none",
    });
  } catch {
    formatter = null;
  }
  regionNames.set(language, formatter);
  return formatter;
}

export function localizedCountryName(
  code: string,
  language: string,
  fallback: string,
): string {
  const region = code.trim().toUpperCase();
  const override = OVERRIDES[region]?.[language.toLowerCase().split("-")[0]];
  if (override) return override;
  try {
    return regionNamesFor(language)?.of(region) || fallback;
  } catch {
    return fallback;
  }
}

function collatorFor(language: string): Intl.Collator {
  const cached = collators.get(language);
  if (cached) return cached;
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(language);
  } catch {
    collator = new Intl.Collator();
  }
  collators.set(language, collator);
  return collator;
}

export function compareCountryNames(language: string) {
  const collator = collatorFor(language);
  return (a: string, b: string) => collator.compare(a, b);
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase();
}
