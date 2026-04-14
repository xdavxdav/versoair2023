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

export type Sector =
  | "convenience_store"
  | "ad_agency"
  | "finance"
  | "restaurant"
  | "ecommerce"
  | "commerce"
  | "hotellerie"
  | "batiment"
  | "automobile"
  | "divertissement"
  | "other";

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
