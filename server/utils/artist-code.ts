/**
 * Artist & User ID Generator — Verso Air Platform
 *
 * ═══ NEW FORMAT (v2) ═══
 * VA_NK-E_260115_A2V2F5.b
 *
 *   VA       = Verso Air
 *   NK       = 2-char consonant extract from stage name (Nooka → NK)
 *   -E       = Division letter: D=Discovery, I=Indie, P=Pro, E=Elite, S=Signed, L=Legend
 *   260115   = DDMMYY join date
 *   A2V2F5   = Status flags interleaved with country calling code digits:
 *              A = Active       + 1st digit of country code
 *              V = Verified     + 2nd digit of country code
 *              F = Full access  + 3rd digit of country code
 *              So for country 225 (Côte d'Ivoire) → A2V2F5
 *              For country 001 (Canada/US)        → A0V0F1
 *              For country 033 (France)            → A0V3F3
 *   .b       = Initial from real name provided in contract signature (lowercase)
 *
 * Status flag values:
 *   Position 1: A=Active, I=Inactive, S=Suspended
 *   Position 2: V=Verified, U=Unverified, P=Pending
 *   Position 3: F=Full privilege, L=Limited, E=Emerging, R=Restricted
 *
 * Staff override: VA_[NAME]_SYS_[ROLE] (e.g. VA_JOE_SYS_MASTER)
 *
 * ═══ LEGACY FORMAT (v1) — still parsed, no longer generated ═══
 * VA_NK_ESVF_260215_225A1B
 */

import crypto from "crypto";

// ═══════════════════════════════════════════════════════════
// Unicode → ASCII transliteration map
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
 *
 * Examples:
 *   Nooka     → NK    (N, K)
 *   DJ Shadow → DJ    (D, J)
 *   Élodie    → LD    (L, D)
 *   Al        → AL    (fallback)
 */
export function extractStagePrefix(stageName: string): string {
  const transliterated = transliterateToAscii(stageName);
  const clean = transliterated.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (clean.length === 0) {
    const codepoints = [...stageName]
      .slice(0, 2)
      .map((c) => c.codePointAt(0)!.toString(16).toUpperCase())
      .join("");
    return codepoints.slice(0, 2) || "XX";
  }

  const vowels = new Set(["A", "E", "I", "O", "U"]);
  const consonants = clean
    .split("")
    .filter((c) => /[A-Z]/.test(c) && !vowels.has(c));

  if (consonants.length >= 2) return consonants[0] + consonants[1];
  return clean.slice(0, 2);
}

/**
 * Format a date as DDMMYY string (v2 format — day first, 2-digit year)
 */
function formatDateV2(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = (date.getFullYear() % 100).toString().padStart(2, "0");
  return `${d}${m}${y}`;
}

/**
 * Format a date as YYMMDD string (v1 legacy)
 */
function formatDateV1(date: Date): string {
  const y = (date.getFullYear() % 100).toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Staff artist code overrides
 */
const STAFF_CODES: Record<string, string> = {
  joel_007: "VA_JOE_SYS_MASTER",
  admin_025: "VA_ADM_SYS_OPS",
  mod_010: "VA_MOD_SYS_WATCH",
};

// ═══════════════════════════════════════════════════════════════════
// STATUS FLAGS — Interleaved with country code digits
// ═══════════════════════════════════════════════════════════════════

/** Activity status: A=Active, I=Inactive, S=Suspended */
export type ActivityStatus = "A" | "I" | "S";

/** Verification status: V=Verified, U=Unverified, P=Pending */
export type VerificationStatus = "V" | "U" | "P";

/** Privilege level: F=Full, L=Limited, E=Emerging, R=Restricted */
export type PrivilegeLevel = "F" | "L" | "E" | "R";

/**
 * Build the status+country block: interleave status flags with country code digits.
 *
 * Country code 225 (Côte d'Ivoire):  A2V2F5
 * Country code 001 (Canada/US):      A0V0F1
 * Country code 033 (France):         A0V3F3
 * Country code 234 (Nigeria):        A2V3F4
 *
 * @param countryCode  - International dialing code (number or string, e.g. 225, "001")
 * @param activity     - A=Active, I=Inactive, S=Suspended (default: A)
 * @param verification - V=Verified, U=Unverified, P=Pending (default: U)
 * @param privilege    - F=Full, L=Limited, E=Emerging, R=Restricted (default: E)
 */
function buildStatusBlock(
  countryCode: number | string = 0,
  activity: ActivityStatus = "A",
  verification: VerificationStatus = "U",
  privilege: PrivilegeLevel = "E",
): string {
  const cc = String(countryCode).padStart(3, "0").slice(-3);
  return `${activity}${cc[0]}${verification}${cc[1]}${privilege}${cc[2]}`;
}

/**
 * Parse a status block back to its components.
 * E.g. "A2V2F5" → { activity: "A", verification: "V", privilege: "F", countryCode: "225" }
 */
export function parseStatusBlock(block: string): {
  activity: string;
  verification: string;
  privilege: string;
  countryCode: string;
} | null {
  if (block.length !== 6) return null;
  return {
    activity: block[0],
    countryCode: `${block[1]}${block[3]}${block[5]}`,
    verification: block[2],
    privilege: block[4],
  };
}

// ═══════════════════════════════════════════════════════════════════
// SUPER-CATEGORY SYSTEMS (preserved for legacy parsing)
// ═══════════════════════════════════════════════════════════════════
export type ArtistSystem = "ARC" | "MOD" | "TAG";

export interface ArcProfile {
  account?: string;
  verification?: string;
  rights?: string;
}
export interface ModProfile {
  genre?: string;
  engagement?: string;
  monetization?: string;
}
export interface TagProfile {
  type?: string;
  authority?: string;
  grade?: string;
}

// ═══════════════════════════════════════════════════════════════════
// v2 GENERATOR — New Format: VA_NK-E_260115_A2V2F5.b
// ═══════════════════════════════════════════════════════════════════

export interface GenerateCodeOptions {
  stageName: string;
  division?: string; // discovery|indie|pro|elite|signed|legend
  joinDate?: Date;
  staffUsername?: string;
  countryCode?: number | string; // International dialing code (225, "001", etc.)
  contractInitial?: string; // First letter of real name from contract signature
  activity?: ActivityStatus; // A=Active, I=Inactive, S=Suspended
  verification?: VerificationStatus; // V=Verified, U=Unverified, P=Pending
  privilege?: PrivilegeLevel; // F=Full, L=Limited, E=Emerging, R=Restricted
}

/**
 * Generate a Verso Air Platform ID (v2 format)
 *
 * Output: VA_NK-E_260115_A2V2F5.b
 *
 * @param opts - Generation options (see GenerateCodeOptions)
 * @returns The generated ID string
 */
export function generatePlatformId(opts: GenerateCodeOptions): string {
  // Staff override
  if (opts.staffUsername && STAFF_CODES[opts.staffUsername]) {
    return STAFF_CODES[opts.staffUsername];
  }

  const prefix = extractStagePrefix(opts.stageName);
  const div =
    DIVISION_CODES[(opts.division || "discovery").toLowerCase()] || "D";
  const dateStr = formatDateV2(opts.joinDate || new Date());
  const statusBlock = buildStatusBlock(
    opts.countryCode || 0,
    opts.activity || "A",
    opts.verification || "U",
    opts.privilege || "E",
  );
  const initial = (opts.contractInitial || "x")[0].toLowerCase();

  return `VA_${prefix}-${div}_${dateStr}_${statusBlock}.${initial}`;
}

/**
 * Generate an artist code — backwards-compatible wrapper.
 *
 * This now produces v2 format (VA_NK-E_260115_A2V2F5.b) by default.
 * Pass contractInitial for the .x suffix; defaults to "x" if not provided.
 */
export function generateArtistCode(
  stageName: string,
  division: string = "discovery",
  joinDate: Date = new Date(),
  staffUsername?: string,
  profile?: ArcProfile | ModProfile | TagProfile,
  countryCode?: number | string,
  system: ArtistSystem = "MOD",
  contractInitial?: string,
): string {
  // Staff override
  if (staffUsername && STAFF_CODES[staffUsername]) {
    return STAFF_CODES[staffUsername];
  }

  // Determine verification/privilege from legacy profile if provided
  let verification: VerificationStatus = "U";
  let privilege: PrivilegeLevel = "E";

  if (profile && system === "ARC") {
    const p = profile as ArcProfile;
    if (p.verification === "verified" || p.verification === "premium")
      verification = "V";
    if (p.rights === "full") privilege = "F";
    else if (p.rights === "licensed") privilege = "L";
  } else if (profile && system === "MOD") {
    const p = profile as ModProfile;
    if (p.monetization === "paid") privilege = "F";
  }

  return generatePlatformId({
    stageName,
    division,
    joinDate,
    staffUsername,
    countryCode,
    contractInitial: contractInitial || "x",
    activity: "A",
    verification,
    privilege,
  });
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATORS — Support both v1 and v2 formats
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate that a string looks like a valid platform ID (v1 or v2)
 */
export function isValidArtistCode(code: string): boolean {
  // Staff codes: VA_XXX_SYS_ROLE
  if (/^VA_[A-Z]{2,4}_SYS_[A-Z]+$/.test(code)) return true;
  // v2 format: VA_XX-D_DDMMYY_AXVXFX.x (with dot initial)
  if (
    /^VA_[A-Z0-9]{2}-[DIPELS]_\d{6}_[AISPVU][0-9][VUP][0-9][FLER][0-9]\.[a-z]$/i.test(
      code,
    )
  )
    return true;
  // v1 format: VA_XX_TIER_YYMMDD_SUFFIX (legacy — still accepted)
  if (/^VA_[A-Z0-9]{2}_[A-Z]{1,4}_\d{6}_[A-Z0-9]{6}$/i.test(code)) return true;
  // Legacy 8-digit date codes
  if (/^VA_[A-Z0-9]{2,4}_[DIPESL]_\d{8}_[A-F0-9]{6}$/i.test(code)) return true;
  return false;
}

/**
 * Parse a platform ID / artist code into its components
 * Supports v2 (new) and v1 (legacy) formats.
 */
export function parseArtistCode(code: string): {
  format: "v2" | "v1" | "staff";
  prefix: string;
  division?: string;
  // v2 fields
  activity?: string;
  verification?: string;
  privilege?: string;
  countryCode?: string;
  contractInitial?: string;
  // v1 legacy fields
  system?: ArtistSystem;
  account?: string;
  rights?: string;
  genre?: string;
  engagement?: string;
  monetization?: string;
  type?: string;
  authority?: string;
  grade?: string;
  uniqueHex?: string;
  // Common
  joinDate?: string;
  isStaff: boolean;
} | null {
  // Staff code
  const staffMatch = code.match(/^VA_([A-Z]{2,4})_SYS_([A-Z]+)$/);
  if (staffMatch) {
    return { format: "staff", prefix: staffMatch[1], isStaff: true };
  }

  // v2 format: VA_XX-D_DDMMYY_AXVXFX.x
  const v2Match = code.match(
    /^VA_([A-Z0-9]{2})-([DIPELS])_(\d{6})_([A-Z0-9]{6})\.([a-z])$/i,
  );
  if (v2Match) {
    const divMap: Record<string, string> = {
      D: "discovery",
      I: "indie",
      P: "pro",
      E: "elite",
      S: "signed",
      L: "legend",
    };
    const statusBlock = v2Match[4].toUpperCase();
    const parsed = parseStatusBlock(statusBlock);
    return {
      format: "v2",
      prefix: v2Match[1].toUpperCase(),
      division: divMap[v2Match[2].toUpperCase()] || v2Match[2],
      joinDate: v2Match[3],
      activity: parsed?.activity,
      verification: parsed?.verification,
      privilege: parsed?.privilege,
      countryCode: parsed?.countryCode,
      contractInitial: v2Match[5],
      isStaff: false,
    };
  }

  // v1 format: VA_XX_TIER_YYMMDD_SUFFIX
  const v1Match = code.match(
    /^VA_([A-Z0-9]{2})_([A-Z]{1,4})_(\d{6,8})_([A-Z0-9]{6})$/i,
  );
  if (!v1Match) return null;

  const tierBlock = v1Match[2].toUpperCase();
  const suffix = v1Match[4].toUpperCase();
  const divMap: Record<string, string> = {
    D: "discovery",
    I: "indie",
    P: "pro",
    E: "elite",
    S: "signed",
    L: "legend",
  };

  let countryCode: string | undefined;
  let uniqueHex: string;
  if (/^\d{3}/.test(suffix)) {
    countryCode = suffix.slice(0, 3);
    uniqueHex = suffix.slice(3);
  } else {
    uniqueHex = suffix;
  }

  const division = divMap[tierBlock[0]] || "discovery";

  return {
    format: "v1",
    prefix: v1Match[1],
    system: "MOD",
    division,
    joinDate: v1Match[3],
    countryCode,
    uniqueHex,
    isStaff: false,
  };
}
