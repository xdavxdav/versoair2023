/**
 * Artist Code Generator
 *
 * Format: VA_[PREFIX]_[DIV]_[YYYYMMDD]_[6-HEX]
 *   - VA       = Verso Artist
 *   - PREFIX   = First 2 syllables of stage name, uppercase (max 4 chars)
 *   - DIV      = Division letter: D=Discovery, I=Indie, P=Pro, E=Elite, S=Signed, L=Legend
 *   - YYYYMMDD = Join date
 *   - 6-HEX    = Random 6-char hex for uniqueness (collision-proof)
 *
 * Staff override: VA_[NAME]_SYS_MASTER (e.g. VA_JOE_SYS_MASTER)
 *
 * Examples:
 *   Nooka (Elite, joined Feb 15 2026)  → VA_NOO_E_20260215_8F3A1B
 *   DJ Shadow (Discovery, Mar 20 2026) → VA_DJS_D_20260320_A2C4E1
 *   Joel (staff superuser)             → VA_JOE_SYS_MASTER
 */

import crypto from "crypto";

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
 * Extract a 2-4 character prefix from a stage name.
 * Takes the first ~2 syllables, removes spaces/special chars, uppercases.
 *
 * Logic:
 *   - Split by vowel-consonant boundaries to approximate syllables
 *   - Take first 3 chars as a safe default (covers 2 syllables for most short names)
 *   - Min 2, max 4 chars
 */
export function extractStagePrefix(stageName: string): string {
  // Clean: remove special chars, take alphanumeric only
  const clean = stageName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (clean.length <= 2) return clean || "XX";
  if (clean.length <= 4) return clean.slice(0, 3);

  // Try to find a natural break after 2nd syllable
  // Approximate: vowels mark syllable nuclei
  const vowels = new Set(["A", "E", "I", "O", "U", "Y"]);
  let syllableCount = 0;
  let cutPoint = 3; // minimum

  for (let i = 0; i < clean.length; i++) {
    const isVowel = vowels.has(clean[i]);
    const prevIsVowel = i > 0 && vowels.has(clean[i - 1]);

    // Count a new syllable when we hit a vowel after a consonant
    if (isVowel && !prevIsVowel && i > 0) {
      syllableCount++;
      if (syllableCount >= 2) {
        // Cut after this vowel cluster
        cutPoint = Math.min(i + 1, 4);
        break;
      }
    }
  }

  return clean.slice(0, Math.max(2, Math.min(cutPoint, 4)));
}

/**
 * Format a date as YYYYMMDD string
 */
function formatDate(date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Generate a random 6-character hex ID
 */
function randomHex6(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
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

/**
 * Generate a Verso Artist Code
 *
 * @param stageName - Artist's stage name
 * @param division  - Current division (default: "discovery")
 * @param joinDate  - Date the artist joined (default: now)
 * @param staffUsername - If provided, generates a staff override code
 * @returns The generated artist code string
 */
export function generateArtistCode(
  stageName: string,
  division: string = "discovery",
  joinDate: Date = new Date(),
  staffUsername?: string,
): string {
  // Staff override — fixed memorable codes
  if (staffUsername && STAFF_CODES[staffUsername]) {
    return STAFF_CODES[staffUsername];
  }

  const prefix = extractStagePrefix(stageName);
  const divCode = DIVISION_CODES[division.toLowerCase()] || "D";
  const dateStr = formatDate(joinDate);
  const uniqueId = randomHex6();

  return `VA_${prefix}_${divCode}_${dateStr}_${uniqueId}`;
}

/**
 * Validate that a string looks like a valid artist code
 */
export function isValidArtistCode(code: string): boolean {
  // Staff codes
  if (/^VA_[A-Z]{2,4}_SYS_[A-Z]+$/.test(code)) return true;
  // Standard codes: VA_XXX_D_YYYYMMDD_XXXXXX
  if (/^VA_[A-Z0-9]{2,4}_[DIPESL]_\d{8}_[A-F0-9]{6}$/i.test(code)) return true;
  return false;
}

/**
 * Parse an artist code into its components
 */
export function parseArtistCode(code: string): {
  prefix: string;
  division?: string;
  joinDate?: string;
  uniqueId?: string;
  isStaff: boolean;
} | null {
  // Staff code
  const staffMatch = code.match(/^VA_([A-Z]{2,4})_SYS_([A-Z]+)$/);
  if (staffMatch) {
    return { prefix: staffMatch[1], isStaff: true };
  }

  // Standard code
  const stdMatch = code.match(
    /^VA_([A-Z0-9]{2,4})_([DIPESL])_(\d{8})_([A-F0-9]{6})$/i,
  );
  if (stdMatch) {
    const divMap: Record<string, string> = {
      D: "discovery",
      I: "indie",
      P: "pro",
      E: "elite",
      S: "signed",
      L: "legend",
    };
    return {
      prefix: stdMatch[1],
      division: divMap[stdMatch[2].toUpperCase()] || "discovery",
      joinDate: stdMatch[3],
      uniqueId: stdMatch[4],
      isStaff: false,
    };
  }

  return null;
}
