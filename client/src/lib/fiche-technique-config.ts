import { FICHE_SECTORS, type FicheSector } from "@shared/fiche-technique";

export type Tier = "free" | "premium" | "enterprise";

export type FicheSectionId =
  | "basic"
  | "services"
  | "team"
  | "kpis"
  | "legal"
  | "social"
  | "strategy"
  | "techStack"
  | "caseStudies"
  | "analytics";

export type Sector = FicheSector;

export const TIER_SECTIONS: Record<Tier, FicheSectionId[]> = {
  free: ["basic"],
  premium: ["basic", "services", "team", "kpis", "legal", "social"],
  enterprise: [
    "basic",
    "services",
    "team",
    "kpis",
    "legal",
    "social",
    "strategy",
    "techStack",
    "caseStudies",
    "analytics",
  ],
};

export const SECTOR_SECTIONS: Record<Sector, FicheSectionId[]> = {
  convenience_store: ["basic", "services", "legal", "social", "team"],
  ad_agency: [
    "basic",
    "services",
    "team",
    "kpis",
    "legal",
    "social",
    "strategy",
    "techStack",
    "caseStudies",
    "analytics",
  ],
  finance: [
    "basic",
    "services",
    "team",
    "kpis",
    "legal",
    "social",
    "strategy",
    "analytics",
  ],
  restaurant: ["basic", "services", "team", "legal", "social"],
  ecommerce: ["basic", "services", "team", "kpis", "social", "analytics"],
  commerce: ["basic", "services", "team", "kpis", "legal", "social"],
  hotellerie: ["basic", "services", "team", "kpis", "legal", "social"],
  batiment: ["basic", "services", "team", "legal", "social"],
  automobile: ["basic", "services", "team", "kpis", "legal", "social"],
  divertissement: [
    "basic",
    "services",
    "team",
    "kpis",
    "social",
    "strategy",
    "analytics",
  ],
  other: ["basic", "services", "team", "legal", "social"],
};

export const SECTION_LABELS: Record<
  FicheSectionId,
  { en: string; fr: string }
> = {
  basic: { en: "Basic Information", fr: "Informations de base" },
  services: { en: "Products & Services", fr: "Produits & services" },
  team: { en: "Team", fr: "Équipe" },
  kpis: { en: "KPIs", fr: "Indicateurs clés" },
  legal: { en: "Legal", fr: "Aspects légaux" },
  social: { en: "Web & Social", fr: "Web & réseaux" },
  strategy: { en: "Strategy", fr: "Stratégie" },
  techStack: { en: "Tech Stack", fr: "Technologies" },
  caseStudies: { en: "Case Studies", fr: "Études de cas" },
  analytics: { en: "Analytics", fr: "Analytique" },
};

export function getVisibleSections(
  tier: Tier,
  sector: Sector,
): FicheSectionId[] {
  const tierSections = TIER_SECTIONS[tier] ?? TIER_SECTIONS.free;
  const sectorSections = SECTOR_SECTIONS[sector] ?? SECTOR_SECTIONS.other;
  return tierSections.filter((section) => sectorSections.includes(section));
}

// Sections this sector offers that the current plan does not unlock yet.
export function getLockedSections(
  tier: Tier,
  sector: Sector,
): FicheSectionId[] {
  const visible = getVisibleSections(tier, sector);
  return (SECTOR_SECTIONS[sector] ?? SECTOR_SECTIONS.other).filter(
    (section) => !visible.includes(section),
  );
}

export function normalizeTier(value: string | null | undefined): Tier {
  const t = (value || "").toLowerCase();
  if (t === "enterprise" || t === "max") return "enterprise";
  if (t === "premium" || t === "verified" || t === "essential") {
    return "premium";
  }
  return "free";
}

export function inferSector(
  categoryName: string,
  explicitSector?: string | null,
): Sector {
  const explicit = (explicitSector || "").toLowerCase();
  if ((FICHE_SECTORS as readonly string[]).includes(explicit)) {
    return explicit as Sector;
  }

  const c = categoryName.toLowerCase();
  if (c.includes("finance")) return "finance";
  if (c.includes("hôtel") || c.includes("hotel") || c.includes("hotellerie")) {
    return "hotellerie";
  }
  if (c.includes("batiment") || c.includes("construction")) return "batiment";
  if (c.includes("auto")) return "automobile";
  if (c.includes("divert") || c.includes("entertain")) return "divertissement";
  if (
    c.includes("commerce") ||
    c.includes("retail") ||
    c.includes("boutique")
  ) {
    return "commerce";
  }
  return "other";
}

export const SECTOR_LABELS: Record<Sector, { en: string; fr: string }> = {
  convenience_store: { en: "Convenience store", fr: "Dépanneur" },
  ad_agency: { en: "Advertising agency", fr: "Agence de publicité" },
  finance: { en: "Finance", fr: "Finance" },
  restaurant: { en: "Restaurant", fr: "Restaurant" },
  ecommerce: { en: "E-commerce", fr: "Commerce en ligne" },
  commerce: { en: "Retail", fr: "Commerce" },
  hotellerie: { en: "Hospitality", fr: "Hôtellerie" },
  batiment: { en: "Construction", fr: "Bâtiment" },
  automobile: { en: "Automotive", fr: "Automobile" },
  divertissement: { en: "Entertainment", fr: "Divertissement" },
  other: { en: "Other", fr: "Autre" },
};
