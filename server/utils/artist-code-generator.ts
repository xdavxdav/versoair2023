/**
 * Artist Code Generator — Unified Triple-System Code
 * Format: VA_[NAME]-[RANK]_[ARC]-[MOD]-[TAG]-[COUNTRY].[last]
 *
 * RANK (Career Tier):
 *   R = Rookie, P = Pro, E = Elite, L = Legend, X = Platinum
 *
 * ARC System (Status-Based):
 *   Pos 1: S=Solo, G=Group, C=Composer
 *   Pos 2: V=Verified, U=Unverified, P=Premium/Partner
 *   Pos 3: F=Full Rights, L=Licensed, E=Emerging
 *
 * MOD System (Tier-Based):
 *   Pos 1: M=Mainstream, I=Indie, O=Orchestral
 *   Pos 2: A=Active, D=Dormant
 *   Pos 3: P=Paid, R=Royalty-Free
 *
 * TAG System (Administrative):
 *   Pos 1: A=Artist, L=Label, P=Podcaster
 *   Pos 2: I=Independent, S=Signed, M=Managed
 *   Pos 3: B=Bronze, S=Silver, G=Gold
 *
 * Example: VA_NK-E_SVF-IAP-ASG-225.n
 */

export interface ArtistCodeInput {
  /** Artist stage name (e.g., "Nooka" → "NK") */
  stageName: string;
  /** Artist's real last name (e.g., "Nguyen" → "n") */
  lastName: string;
  /** Country phone code (e.g., "225" for Ivory Coast, "001" for Canada) */
  countryCode: string;

  // Rank
  /** Career tier: rookie | pro | elite | legend | platinum */
  rank?: "rookie" | "pro" | "elite" | "legend" | "platinum";

  // ARC System
  /** Account type: solo | group | composer */
  accountType?: "solo" | "group" | "composer";
  /** Verification: verified | unverified | premium */
  verification?: "verified" | "unverified" | "premium";
  /** Rights: full | licensed | emerging */
  rights?: "full" | "licensed" | "emerging";

  // MOD System
  /** Genre class: mainstream | indie | orchestral */
  genreClass?: "mainstream" | "indie" | "orchestral";
  /** Engagement: active | dormant */
  engagement?: "active" | "dormant";
  /** Monetization: paid | royalty_free */
  monetization?: "paid" | "royalty_free";

  // TAG System
  /** Type: artist | label | podcaster */
  entityType?: "artist" | "label" | "podcaster";
  /** Authority: independent | signed | managed */
  authority?: "independent" | "signed" | "managed";
  /** Grade: bronze | silver | gold */
  grade?: "bronze" | "silver" | "gold";
}

/** Generate 2-3 letter code from stage name */
function nameToCode(stageName: string): string {
  const clean = stageName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (clean.length <= 2) return clean || "XX";
  // Use consonants first, then fill with vowels
  const consonants = clean.replace(/[AEIOU]/g, "");
  if (consonants.length >= 2) return consonants.slice(0, 2);
  // Fallback: first and last letter
  return clean[0] + clean[clean.length - 1];
}

/** Map rank to single letter */
function rankToLetter(rank: string): string {
  const map: Record<string, string> = {
    rookie: "R",
    pro: "P",
    elite: "E",
    legend: "L",
    platinum: "X",
  };
  return map[rank] || "R";
}

/** Generate ARC block (3 chars) */
function generateARC(input: ArtistCodeInput): string {
  const type: Record<string, string> = { solo: "S", group: "G", composer: "C" };
  const verify: Record<string, string> = {
    verified: "V",
    unverified: "U",
    premium: "P",
  };
  const rights: Record<string, string> = {
    full: "F",
    licensed: "L",
    emerging: "E",
  };

  return (
    (type[input.accountType || "solo"] || "S") +
    (verify[input.verification || "unverified"] || "U") +
    (rights[input.rights || "emerging"] || "E")
  );
}

/** Generate MOD block (3 chars) */
function generateMOD(input: ArtistCodeInput): string {
  const genre: Record<string, string> = {
    mainstream: "M",
    indie: "I",
    orchestral: "O",
  };
  const engage: Record<string, string> = { active: "A", dormant: "D" };
  const money: Record<string, string> = { paid: "P", royalty_free: "R" };

  return (
    (genre[input.genreClass || "indie"] || "I") +
    (engage[input.engagement || "active"] || "A") +
    (money[input.monetization || "royalty_free"] || "R")
  );
}

/** Generate TAG block (3 chars) */
function generateTAG(input: ArtistCodeInput): string {
  const etype: Record<string, string> = {
    artist: "A",
    label: "L",
    podcaster: "P",
  };
  const auth: Record<string, string> = {
    independent: "I",
    signed: "S",
    managed: "M",
  };
  const grade: Record<string, string> = { bronze: "B", silver: "S", gold: "G" };

  return (
    (etype[input.entityType || "artist"] || "A") +
    (auth[input.authority || "independent"] || "I") +
    (grade[input.grade || "bronze"] || "B")
  );
}

/**
 * Generate a complete artist code
 * @returns e.g., "VA_NK-E_SVF-IAP-ASG-225.n"
 */
export function generateArtistCode(input: ArtistCodeInput): string {
  const name = nameToCode(input.stageName);
  const rank = rankToLetter(input.rank || "rookie");
  const arc = generateARC(input);
  const mod = generateMOD(input);
  const tag = generateTAG(input);
  const country = input.countryCode || "000";
  const last = (input.lastName?.[0] || "x").toLowerCase();

  return `VA_${name}-${rank}_${arc}-${mod}-${tag}-${country}.${last}`;
}

/**
 * Determine rank from evaluation score
 */
export function scoreToRank(score: number): ArtistCodeInput["rank"] {
  if (score >= 9.5) return "platinum";
  if (score >= 8.5) return "legend";
  if (score >= 7.0) return "elite";
  if (score >= 5.0) return "pro";
  return "rookie";
}

/**
 * Determine grade from stream count
 */
export function streamsToGrade(streams: number): ArtistCodeInput["grade"] {
  if (streams >= 1_000_000) return "gold";
  if (streams >= 10_000) return "silver";
  return "bronze";
}

/**
 * Map ISO country code to phone country code
 */
export function isoToPhoneCode(isoCode: string): string {
  const map: Record<string, string> = {
    CI: "225", // Ivory Coast
    FR: "33", // France
    US: "001", // USA
    CA: "001", // Canada
    GB: "44", // UK
    NG: "234", // Nigeria
    GH: "233", // Ghana
    SN: "221", // Senegal
    CM: "237", // Cameroon
    CD: "243", // DR Congo
    JM: "876", // Jamaica
    BR: "55", // Brazil
    DE: "49", // Germany
    JP: "81", // Japan
    KR: "82", // South Korea
    MA: "212", // Morocco
    TN: "216", // Tunisia
    DZ: "213", // Algeria
    ZA: "27", // South Africa
    KE: "254", // Kenya
    TZ: "255", // Tanzania
    ET: "251", // Ethiopia
    MX: "52", // Mexico
    CO: "57", // Colombia
    AR: "54", // Argentina
    AU: "61", // Australia
    IN: "91", // India
    HT: "509", // Haiti
    ML: "223", // Mali
    BF: "226", // Burkina Faso
    GA: "241", // Gabon
    CG: "242", // Congo
    BJ: "229", // Benin
    TG: "228", // Togo
    NE: "227", // Niger
    GN: "224", // Guinea
  };
  return map[isoCode?.toUpperCase()] || "000";
}

/**
 * Validate an artist code format
 * @returns true if the code matches the expected pattern
 */
export function isValidArtistCode(code: string): boolean {
  // VA_XX-X_XXX-XXX-XXX-NNN.x
  const pattern =
    /^VA_[A-Z]{2,3}-[RPELX]_[SGCVUPFLE]{3}-[MIOADPR]{3}-[ALPISMBSG]{3}-\d{2,3}\.[a-z]$/;
  return pattern.test(code);
}
