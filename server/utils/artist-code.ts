/**
 * Artist Code Generator
 *
 * Format: VA_[PREFIX]_[TIER]_[YYMMDD]_[CCC+HEX]
 *   - VA     = Verso Artist
 *   - PREFIX = 2-char consonant extract from stage name (e.g. Nooka → NK)
 *   - TIER   = System code (1 letter) + 3 profile letters (see below)
 *   - YYMMDD = Join date (2-digit year)
 *   - CCC+HEX = 3-digit ISO country code + 3-char random hex
 *
 * ═══ THREE SUPER-CATEGORY SYSTEMS ═══
 *
 * 1. ARC — Status-Based (artists/creators)
 *    Position 1: Division    : D=Discovery, I=Indie, P=Pro, E=Elite, S=Signed, L=Legend
 *    Position 2: Account Type: S=Solo, G=Group/Band, C=Composer/Producer
 *    Position 3: Verification: V=Verified, U=Unverified, P=Premium/Partner
 *    Position 4: Rights/Tier : F=Full Rights, L=Licensed, E=Emerging
 *    Example: VA_NK_ESVF_260215_225A1B  (Nooka, Elite Solo Verified Full, Côte d'Ivoire)
 *
 * 2. MOD — Tier-Based (performance-driven streaming)
 *    Position 1: Division    : D=Discovery, I=Indie, P=Pro, E=Elite, S=Signed, L=Legend
 *    Position 2: Genre/Class : M=Mainstream, I=Indie, O=Orchestral
 *    Position 3: Engagement  : A=Active, D=Dormant
 *    Position 4: Monetization: P=Paid, R=Royalty-Free
 *    Example: VA_NK_EIAP_260215_225A1B  (Nooka, Elite Indie Active Paid, Côte d'Ivoire)
 *
 * 3. TAG — Administrative (staff, labels, podcasters)
 *    Position 1: Type      : A=Artist, L=Label, P=Podcaster
 *    Position 2: Authority : I=Independent, S=Signed, M=Managed
 *    Position 3: Grade     : B=Bronze, S=Silver, G=Gold
 *    Example: VA_ADM_ASG_260215_225A1B  (Admin, Artist Signed Gold)
 *
 * Staff override: VA_[NAME]_SYS_[ROLE] (e.g. VA_JOE_SYS_MASTER)
 */

import crypto from "crypto";

// ═══════════════════════════════════════════════════════════
// Unicode → ASCII transliteration map
// Covers accented Latin, Cyrillic, Arabic, CJK phonetic approximations
// ═══════════════════════════════════════════════════════════
const TRANSLITERATION_MAP: Record<string, string> = {
  // Accented Latin
  à: "a",
  á: "a",
  â: "a",
  ã: "a",
  ä: "a",
  å: "a",
  æ: "ae",
  ç: "c",
  è: "e",
  é: "e",
  ê: "e",
  ë: "e",
  ì: "i",
  í: "i",
  î: "i",
  ï: "i",
  ð: "d",
  ñ: "n",
  ò: "o",
  ó: "o",
  ô: "o",
  õ: "o",
  ö: "o",
  ø: "o",
  ù: "u",
  ú: "u",
  û: "u",
  ü: "u",
  ý: "y",
  þ: "th",
  ÿ: "y",
  ß: "ss",
  // Turkish special
  ğ: "g",
  ı: "i",
  ş: "s",
  // Polish/Czech/Slovak
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ś: "s",
  ź: "z",
  ż: "z",
  č: "c",
  ď: "d",
  ě: "e",
  ň: "n",
  ř: "r",
  š: "s",
  ť: "t",
  ů: "u",
  ž: "z",
  // Cyrillic (Russian phonetic)
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  // Arabic (common names)
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  // Japanese Katakana (common phonemes)
  ア: "a",
  イ: "i",
  ウ: "u",
  エ: "e",
  オ: "o",
  カ: "ka",
  キ: "ki",
  ク: "ku",
  ケ: "ke",
  コ: "ko",
  サ: "sa",
  シ: "shi",
  ス: "su",
  セ: "se",
  ソ: "so",
  タ: "ta",
  チ: "chi",
  ツ: "tsu",
  テ: "te",
  ト: "to",
  ナ: "na",
  ニ: "ni",
  ヌ: "nu",
  ネ: "ne",
  ノ: "no",
  ハ: "ha",
  ヒ: "hi",
  フ: "fu",
  ヘ: "he",
  ホ: "ho",
  マ: "ma",
  ミ: "mi",
  ム: "mu",
  メ: "me",
  モ: "mo",
  ラ: "ra",
  リ: "ri",
  ル: "ru",
  レ: "re",
  ロ: "ro",
  ヤ: "ya",
  ユ: "yu",
  ヨ: "yo",
  ワ: "wa",
  ン: "n",
};

function transliterateToAscii(input: string): string {
  let result = "";
  for (const char of input.toLowerCase()) {
    result += TRANSLITERATION_MAP[char] || char;
  }
  return result;
}

// Division code mapping
const DIVISION_CODES: Record<string, string> = {
  discovery: "D",
  indie: "I",
  pro: "P",
  elite: "E",
  signed: "S",
  legend: "L",
};

/**
 * Extract a 2-character consonant prefix from a stage name.
 * Strips vowels and takes the first two consonants for a compact, readable ID.
 * Supports Unicode via transliteration (accented Latin, Cyrillic, Arabic, CJK).
 *
 * Examples:
 *   Nooka     → NK    (N, K)
 *   DJ Shadow → DJ    (D, J)
 *   Élodie    → LD    (L, D)
 *   Al        → AL    (fallback — only 1 consonant)
 */
export function extractStagePrefix(stageName: string): string {
  // Step 1: Transliterate common Unicode characters to ASCII
  const transliterated = transliterateToAscii(stageName);

  // Step 2: Clean — keep alphanumeric only, uppercase
  const clean = transliterated.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (clean.length === 0) {
    // Last resort: use first 2 Unicode codepoints as hex prefix
    const codepoints = [...stageName]
      .slice(0, 2)
      .map((c) => c.codePointAt(0)!.toString(16).toUpperCase())
      .join("");
    return codepoints.slice(0, 2) || "XX";
  }

  // Extract consonants (letters only — skip vowels and digits)
  const vowels = new Set(["A", "E", "I", "O", "U"]);
  const consonants = clean
    .split("")
    .filter((c) => /[A-Z]/.test(c) && !vowels.has(c));

  if (consonants.length >= 2) return consonants[0] + consonants[1];

  // Fewer than 2 consonants — use first 2 characters of clean name
  return clean.slice(0, 2);
}

/**
 * Format a date as YYMMDD string (2-digit year)
 */
function formatDate(date: Date): string {
  const y = (date.getFullYear() % 100).toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Staff artist code overrides
 * Map of staff gate usernames to their custom codes
 */
const STAFF_CODES: Record<string, string> = {
  joel_007: "VA_JOE_SYS_MASTER",
  admin_025: "VA_ADM_SYS_OPS",
  mod_010: "VA_MOD_SYS_WATCH",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER-CATEGORY SYSTEMS — ARC (Status) / MOD (Tier) / TAG (Administrative)
// ═══════════════════════════════════════════════════════════════════════════════

/** System identifier for the 3 super-categories */
export type ArtistSystem = "ARC" | "MOD" | "TAG";

// ── ARC System — Status-Based ──────────────────────────────────────────────
const ARC_ACCOUNT: Record<string, string> = {
  solo: "S",
  group: "G",
  composer: "C",
};
const ARC_VERIFICATION: Record<string, string> = {
  verified: "V",
  unverified: "U",
  premium: "P",
};
const ARC_RIGHTS: Record<string, string> = {
  full: "F",
  licensed: "L",
  emerging: "E",
};

// ── MOD System — Tier-Based ────────────────────────────────────────────────
const MOD_GENRE: Record<string, string> = {
  mainstream: "M",
  indie: "I",
  orchestral: "O",
};
const MOD_ENGAGEMENT: Record<string, string> = {
  active: "A",
  dormant: "D",
};
const MOD_MONETIZATION: Record<string, string> = {
  paid: "P",
  "royalty-free": "R",
};

// ── TAG System — Administrative ────────────────────────────────────────────
const TAG_TYPE: Record<string, string> = {
  artist: "A",
  label: "L",
  podcaster: "P",
};
const TAG_AUTHORITY: Record<string, string> = {
  independent: "I",
  signed: "S",
  managed: "M",
};
const TAG_GRADE: Record<string, string> = {
  bronze: "B",
  silver: "S",
  gold: "G",
};

// ── Shared: Country-encoded hex suffix ─────────────────────────────────────
/**
 * Build the 6-char suffix: first 3 = zero-padded country code, last 3 = random hex.
 * E.g. country 225 (Côte d'Ivoire) → "225A1B"
 * If no country provided, falls back to 6 random hex chars.
 */
function buildSuffix(countryCode?: number | string): string {
  const hex3 = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
  if (countryCode !== undefined && countryCode !== null) {
    const cc = String(countryCode).padStart(3, "0").slice(0, 3);
    return `${cc}${hex3}`;
  }
  // No country — full random 6 hex
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/** Helper: resolve a code letter from a map, with fallback to first char uppercase */
function resolveCode(map: Record<string, string>, value?: string): string {
  if (!value) return "";
  return map[value.toLowerCase()] || value[0].toUpperCase();
}

// ── Profile options per system ─────────────────────────────────────────────
export interface ArcProfile {
  account?: string; // S=Solo, G=Group, C=Composer
  verification?: string; // V=Verified, U=Unverified, P=Premium
  rights?: string; // F=Full, L=Licensed, E=Emerging
}

export interface ModProfile {
  genre?: string; // M=Mainstream, I=Indie, O=Orchestral
  engagement?: string; // A=Active, D=Dormant
  monetization?: string; // P=Paid, R=Royalty-Free
}

export interface TagProfile {
  type?: string; // A=Artist, L=Label, P=Podcaster
  authority?: string; // I=Independent, S=Signed, M=Managed
  grade?: string; // B=Bronze, S=Silver, G=Gold
}

/**
 * Generate a Verso Artist Code
 *
 * @param stageName    - Artist's stage name
 * @param division     - Division: discovery|indie|pro|elite|signed|legend (ARC/MOD only)
 * @param joinDate     - Join date (default: now)
 * @param staffUsername - Staff gate username for fixed override codes
 * @param system       - Super-category: "ARC" | "MOD" | "TAG" (default: MOD)
 * @param profile      - System-specific profile (ArcProfile | ModProfile | TagProfile)
 * @param countryCode  - ISO numeric country code (e.g. 225 for Côte d'Ivoire)
 * @returns The generated artist code string
 */
export function generateArtistCode(
  stageName: string,
  division: string = "discovery",
  joinDate: Date = new Date(),
  staffUsername?: string,
  profile?: ArcProfile | ModProfile | TagProfile,
  countryCode?: number | string,
  system: ArtistSystem = "MOD",
): string {
  // Staff override — fixed memorable codes
  if (staffUsername && STAFF_CODES[staffUsername]) {
    return STAFF_CODES[staffUsername];
  }

  const prefix = extractStagePrefix(stageName);
  const dateStr = formatDate(joinDate);
  const suffix = buildSuffix(countryCode);

  let tier: string;

  switch (system) {
    case "ARC": {
      const p = (profile as ArcProfile) || {};
      const divCode = DIVISION_CODES[division.toLowerCase()] || "D";
      tier =
        divCode +
        resolveCode(ARC_ACCOUNT, p.account) +
        resolveCode(ARC_VERIFICATION, p.verification) +
        resolveCode(ARC_RIGHTS, p.rights);
      break;
    }
    case "TAG": {
      const p = (profile as TagProfile) || {};
      // TAG has no division — 3 letters only
      tier =
        resolveCode(TAG_TYPE, p.type) +
        resolveCode(TAG_AUTHORITY, p.authority) +
        resolveCode(TAG_GRADE, p.grade);
      break;
    }
    case "MOD":
    default: {
      const p = (profile as ModProfile) || {};
      const divCode = DIVISION_CODES[division.toLowerCase()] || "D";
      tier =
        divCode +
        resolveCode(MOD_GENRE, p.genre) +
        resolveCode(MOD_ENGAGEMENT, p.engagement) +
        resolveCode(MOD_MONETIZATION, p.monetization);
      break;
    }
  }

  // Strip empty positions (if no profile values given, tier may be just the division letter)
  tier = tier || "D";

  return `VA_${prefix}_${tier}_${dateStr}_${suffix}`;
}

/**
 * Validate that a string looks like a valid artist code
 */
export function isValidArtistCode(code: string): boolean {
  // Staff codes: VA_XXX_SYS_ROLE
  if (/^VA_[A-Z]{2,4}_SYS_[A-Z]+$/.test(code)) return true;
  // Current format: VA_XX_TIER_YYMMDD_SUFFIX (tier = 1-4 letters, suffix = 6 alphanum)
  if (/^VA_[A-Z0-9]{2}_[A-Z]{1,4}_\d{6}_[A-Z0-9]{6}$/i.test(code)) return true;
  // Legacy 8-digit date codes (pre-update)
  if (/^VA_[A-Z0-9]{2,4}_[DIPESL]_\d{8}_[A-F0-9]{6}$/i.test(code)) return true;
  return false;
}

/**
 * Parse an artist code into its components (supports ARC/MOD/TAG + legacy)
 */
export function parseArtistCode(code: string): {
  prefix: string;
  system?: ArtistSystem;
  division?: string;
  // ARC fields
  account?: string;
  verification?: string;
  rights?: string;
  // MOD fields
  genre?: string;
  engagement?: string;
  monetization?: string;
  // TAG fields
  type?: string;
  authority?: string;
  grade?: string;
  // Common fields
  joinDate?: string;
  countryCode?: string;
  uniqueHex?: string;
  isStaff: boolean;
} | null {
  // Staff code
  const staffMatch = code.match(/^VA_([A-Z]{2,4})_SYS_([A-Z]+)$/);
  if (staffMatch) {
    return { prefix: staffMatch[1], system: "TAG", isStaff: true };
  }

  // Current format: VA_XX_TIER_YYMMDD_SUFFIX
  const stdMatch = code.match(
    /^VA_([A-Z0-9]{2})_([A-Z]{1,4})_(\d{6})_([A-Z0-9]{6})$/i,
  );
  // Legacy 8-digit date fallback
  const legacyMatch = !stdMatch
    ? code.match(/^VA_([A-Z0-9]{2,4})_([A-Z]{1,4})_(\d{8})_([A-Z0-9]{6})$/i)
    : null;

  const match = stdMatch || legacyMatch;
  if (!match) return null;

  const tierBlock = match[2].toUpperCase();
  const suffix = match[4].toUpperCase();

  // Parse suffix: first 3 chars may be country code if all digits
  let countryCode: string | undefined;
  let uniqueHex: string;
  if (/^\d{3}/.test(suffix)) {
    countryCode = suffix.slice(0, 3);
    uniqueHex = suffix.slice(3);
  } else {
    uniqueHex = suffix;
  }

  const divMap: Record<string, string> = {
    D: "discovery",
    I: "indie",
    P: "pro",
    E: "elite",
    S: "signed",
    L: "legend",
  };

  // Detect system based on tier block pattern
  const firstLetter = tierBlock[0];

  // TAG system: first letter is A/L/P (type), no division letter
  if (tierBlock.length === 3 && /^[ALP]/.test(firstLetter)) {
    const tagTypeMap: Record<string, string> = {
      A: "artist",
      L: "label",
      P: "podcaster",
    };
    const tagAuthMap: Record<string, string> = {
      I: "independent",
      S: "signed",
      M: "managed",
    };
    const tagGradeMap: Record<string, string> = {
      B: "bronze",
      S: "silver",
      G: "gold",
    };
    return {
      prefix: match[1],
      system: "TAG",
      type: tagTypeMap[tierBlock[0]] || tierBlock[0],
      authority: tagAuthMap[tierBlock[1]] || tierBlock[1],
      grade: tagGradeMap[tierBlock[2]] || tierBlock[2],
      joinDate: match[3],
      countryCode,
      uniqueHex,
      isStaff: false,
    };
  }

  // ARC or MOD: first letter is a division letter
  const division = divMap[firstLetter] || "discovery";

  if (tierBlock.length === 4) {
    // Check if position 2 is an ARC account type (S/G/C)
    const arcAccountSet = new Set(["S", "G", "C"]);
    if (arcAccountSet.has(tierBlock[1])) {
      // ARC system
      const arcAccMap: Record<string, string> = {
        S: "solo",
        G: "group",
        C: "composer",
      };
      const arcVerMap: Record<string, string> = {
        V: "verified",
        U: "unverified",
        P: "premium",
      };
      const arcRtsMap: Record<string, string> = {
        F: "full",
        L: "licensed",
        E: "emerging",
      };
      return {
        prefix: match[1],
        system: "ARC",
        division,
        account: arcAccMap[tierBlock[1]] || tierBlock[1],
        verification: arcVerMap[tierBlock[2]] || tierBlock[2],
        rights: arcRtsMap[tierBlock[3]] || tierBlock[3],
        joinDate: match[3],
        countryCode,
        uniqueHex,
        isStaff: false,
      };
    }

    // MOD system (4 letters: div + genre + engagement + monetization)
    const modGenMap: Record<string, string> = {
      M: "mainstream",
      I: "indie",
      O: "orchestral",
    };
    const modEngMap: Record<string, string> = { A: "active", D: "dormant" };
    const modMonMap: Record<string, string> = { P: "paid", R: "royalty-free" };
    return {
      prefix: match[1],
      system: "MOD",
      division,
      genre: modGenMap[tierBlock[1]] || tierBlock[1],
      engagement: modEngMap[tierBlock[2]] || tierBlock[2],
      monetization: modMonMap[tierBlock[3]] || tierBlock[3],
      joinDate: match[3],
      countryCode,
      uniqueHex,
      isStaff: false,
    };
  }

  // Short tier (just division letter or partial)
  return {
    prefix: match[1],
    system: "MOD",
    division,
    joinDate: match[3],
    countryCode,
    uniqueHex,
    isStaff: false,
  };
}
