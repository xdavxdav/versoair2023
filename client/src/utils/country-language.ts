/**
 * Country → Language mapping for Google Translate auto-selection.
 * Maps ISO 3166-1 alpha-2 country codes to Google Translate language codes.
 *
 * The site's base language is French (fr), so French-speaking countries
 * won't trigger translation. Everyone else gets auto-translated.
 */

// Google Translate language code for each country
const COUNTRY_TO_LANG: Record<string, string> = {
  // ── French-speaking (no translation needed) ──
  FR: "fr",
  CI: "fr",
  SN: "fr",
  CM: "fr",
  ML: "fr",
  BF: "fr",
  NE: "fr",
  TD: "fr",
  GN: "fr",
  BJ: "fr",
  TG: "fr",
  CF: "fr",
  CG: "fr",
  CD: "fr",
  GA: "fr",
  DJ: "fr",
  KM: "fr",
  MG: "fr",
  MC: "fr",
  LU: "fr",
  BE: "fr",
  CH: "fr",
  HT: "fr",
  RE: "fr",
  GP: "fr",
  MQ: "fr",
  GF: "fr",
  NC: "fr",
  PF: "fr",

  // ── Spanish ──
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  PE: "es",
  VE: "es",
  CL: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  PR: "es",
  GQ: "es",

  // ── Portuguese ──
  BR: "pt",
  PT: "pt",
  AO: "pt",
  MZ: "pt",
  GW: "pt",
  CV: "pt",
  ST: "pt",
  TL: "pt",

  // ── German ──
  DE: "de",
  AT: "de",
  LI: "de",

  // ── English ──
  US: "en",
  GB: "en",
  CA: "en",
  AU: "en",
  NZ: "en",
  IE: "en",
  ZA: "en",
  NG: "en",
  GH: "en",
  KE: "en",
  TZ: "en",
  UG: "en",
  ZW: "en",
  BW: "en",
  RW: "en",
  SL: "en",
  LR: "en",
  GM: "en",
  JM: "en",
  TT: "en",
  BB: "en",
  IN: "en",
  PK: "en",
  PH: "en",
  SG: "en",
  MY: "en",
  HK: "en",

  // ── Arabic ──
  SA: "ar",
  AE: "ar",
  EG: "ar",
  IQ: "ar",
  MA: "ar",
  DZ: "ar",
  TN: "ar",
  LY: "ar",
  SD: "ar",
  JO: "ar",
  LB: "ar",
  KW: "ar",
  QA: "ar",
  BH: "ar",
  OM: "ar",
  YE: "ar",
  SO: "ar",
  MR: "ar",

  // ── Other major languages ──
  CN: "zh-CN",
  TW: "zh-TW",
  JP: "ja",
  KR: "ko",
  RU: "ru",
  BY: "ru",
  KZ: "ru",
  KG: "ru",
  TR: "tr",
  IT: "it",
  NL: "nl",
  PL: "pl",
  SE: "sv",
  NO: "no",
  DK: "da",
  FI: "fi",
  CZ: "cs",
  RO: "ro",
  HU: "hu",
  GR: "el",
  IL: "he",
  TH: "th",
  VN: "vi",
  ID: "id",
  UA: "uk",
  HR: "hr",
  RS: "sr",
  BG: "bg",
  SK: "sk",
  SI: "sl",
  EE: "et",
  LV: "lv",
  LT: "lt",
  BD: "bn",
  MM: "my",
  KH: "km",
  LA: "lo",
  ET: "am",
  IR: "fa",
  AF: "fa",
  GE: "ka",
  AM: "hy",
  AZ: "az",
  UZ: "uz",
  TM: "tk",
  MN: "mn",
  NP: "ne",
  LK: "si",
};

// Language names in their native form (for the switcher UI)
export const LANG_NAMES: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  ar: "العربية",
  "zh-CN": "中文(简)",
  "zh-TW": "中文(繁)",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
  tr: "Türkçe",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  sv: "Svenska",
  no: "Norsk",
  da: "Dansk",
  fi: "Suomi",
  cs: "Čeština",
  ro: "Română",
  hu: "Magyar",
  el: "Ελληνικά",
  he: "עברית",
  th: "ไทย",
  vi: "Tiếng Việt",
  id: "Bahasa",
  uk: "Українська",
  hi: "हिन्दी",
  bn: "বাংলা",
  fa: "فارسی",
  sw: "Kiswahili",
  am: "አማርኛ",
};

// Flag emoji for display
export const LANG_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  pt: "🇧🇷",
  de: "🇩🇪",
  ar: "🇸🇦",
  "zh-CN": "🇨🇳",
  "zh-TW": "🇹🇼",
  ja: "🇯🇵",
  ko: "🇰🇷",
  ru: "🇷🇺",
  tr: "🇹🇷",
  it: "🇮🇹",
  nl: "🇳🇱",
  pl: "🇵🇱",
  sv: "🇸🇪",
  no: "🇳🇴",
  da: "🇩🇰",
  fi: "🇫🇮",
  cs: "🇨🇿",
  ro: "🇷🇴",
  hu: "🇭🇺",
  el: "🇬🇷",
  he: "🇮🇱",
  th: "🇹🇭",
  vi: "🇻🇳",
  id: "🇮🇩",
  uk: "🇺🇦",
  hi: "🇮🇳",
  bn: "🇧🇩",
  fa: "🇮🇷",
  sw: "🇰🇪",
  am: "🇪🇹",
};

/**
 * Get the Google Translate language code for a country.
 * Returns "fr" (site base language) if country is French-speaking or unknown.
 */
export function getLanguageForCountry(countryCode: string): string {
  if (!countryCode) return "fr";
  return COUNTRY_TO_LANG[countryCode.toUpperCase()] || "fr";
}

/**
 * Quick-access languages shown at the top of the switcher.
 * These are the most common languages the user mentioned.
 */
export const PRIMARY_LANGUAGES = ["fr", "en", "es", "pt", "de", "ar"];

/**
 * Whether a language code is the site's base language (no translation needed)
 */
export function isBaseLang(lang: string): boolean {
  return lang === "fr";
}
