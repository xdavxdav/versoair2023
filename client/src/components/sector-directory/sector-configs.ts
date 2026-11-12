export type SectorTone = "refined" | "playful";

export type SectorIconName =
  | "store"
  | "hotel"
  | "hardhat"
  | "heart"
  | "landmark"
  | "car"
  | "party";

export interface SectorValueCard {
  title: string;
  text: string;
}

export interface SectorConfig {
  /** Slug understood by GET /api/businesses?sectorSlug= */
  sectorSlug: string;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  categoryNoun: string;
  icon: SectorIconName;
  /** Sector accent colour (light theme). */
  accent: string;
  /** Lighter variant of the accent used on dark surfaces. */
  accentDark: string;
  tone: SectorTone;
  emptyTitle: string;
  emptyText: string;
  values: SectorValueCard[];
}

const commonValues = (noun: string): SectorValueCard[] => [
  {
    title: "Verified listings",
    text: `Every ${noun} marked verified has been checked by the Verso Air team.`,
  },
  {
    title: "Direct contact",
    text: "Phone and email come straight from the business, with no middleman.",
  },
  {
    title: "Made for Canada",
    text: "Search by city and region across the Verso Air network.",
  },
];

export const SECTOR_CONFIGS = {
  commerce: {
    sectorSlug: "commerce",
    label: "Commerce",
    eyebrow: "Commerce · Business database",
    title: "Business & Trade Database",
    subtitle:
      "Verified shops, retailers, wholesalers and trade services across the Verso Air network. Search by name or service, narrow by city, and compare listings side by side.",
    searchPlaceholder: "Search businesses, retailers, services…",
    categoryNoun: "commerce sub-sectors",
    icon: "store",
    accent: "#C1732C",
    accentDark: "#E29B54",
    tone: "refined",
    emptyTitle: "No businesses here yet",
    emptyText:
      "Commerce listings are added as businesses join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("retailer"),
  },
  hotellerie: {
    sectorSlug: "tourism-leisure",
    label: "Hôtellerie",
    eyebrow: "Hôtellerie · Stays & hospitality",
    title: "Hotels, Stays & Hospitality",
    subtitle:
      "Hotels, inns, hostels and travel services you can contact directly. Search by name, filter by city and find the right place to stay.",
    searchPlaceholder: "Search hotels, inns, travel services…",
    categoryNoun: "hospitality sub-sectors",
    icon: "hotel",
    accent: "#1F6FB5",
    accentDark: "#6AA8E6",
    tone: "refined",
    emptyTitle: "No stays listed yet",
    emptyText:
      "Hospitality listings are added as properties join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("hotel"),
  },
  batiment: {
    sectorSlug: "building-construction",
    label: "Bâtiment",
    eyebrow: "Bâtiment · Building & construction",
    title: "Building & Construction Directory",
    subtitle:
      "Contractors, builders, engineers and suppliers for every stage of a project. Search by trade or name and filter by city.",
    searchPlaceholder: "Search contractors, trades, suppliers…",
    categoryNoun: "construction trades",
    icon: "hardhat",
    accent: "#B88A00",
    accentDark: "#E8B923",
    tone: "refined",
    emptyTitle: "No contractors listed yet",
    emptyText:
      "Construction listings are added as companies join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("contractor"),
  },
  sante: {
    sectorSlug: "health",
    label: "Santé",
    eyebrow: "Santé · Health & care",
    title: "Health & Care Directory",
    subtitle:
      "Clinics, pharmacies, practitioners and care providers. Search by name or specialty and filter by city.",
    searchPlaceholder: "Search clinics, practitioners, pharmacies…",
    categoryNoun: "health specialties",
    icon: "heart",
    accent: "#0E8F6B",
    accentDark: "#4CCBA3",
    tone: "refined",
    emptyTitle: "No providers listed yet",
    emptyText:
      "Health listings are added as providers join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("provider"),
  },
  finances: {
    sectorSlug: "finance",
    label: "Finances",
    eyebrow: "Finances · Banking & insurance",
    title: "Finance & Insurance Directory",
    subtitle:
      "Banks, insurers, advisors and fintech services. Search by name or service and filter by city.",
    searchPlaceholder: "Search banks, insurers, advisors…",
    categoryNoun: "finance services",
    icon: "landmark",
    accent: "#6D4AC7",
    accentDark: "#AB8EF2",
    tone: "refined",
    emptyTitle: "No firms listed yet",
    emptyText:
      "Finance listings are added as firms join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("firm"),
  },
  automobile: {
    sectorSlug: "automotive-motorbike",
    label: "Automobile",
    eyebrow: "Automobile · Cars & motorbikes",
    title: "Automotive & Motorbike Directory",
    subtitle:
      "Dealers, garages, parts and motorbike specialists. Search by name or service and filter by city.",
    searchPlaceholder: "Search dealers, garages, parts…",
    categoryNoun: "automotive services",
    icon: "car",
    accent: "#C0262D",
    accentDark: "#F0777C",
    tone: "refined",
    emptyTitle: "No garages listed yet",
    emptyText:
      "Automotive listings are added as businesses join Verso Air. Try clearing your filters, or check back soon.",
    values: commonValues("dealer"),
  },
  divertissement: {
    sectorSlug: "entertainment-sports",
    label: "Divertissement",
    eyebrow: "Divertissement · Fun & leisure",
    title: "Let's go out! Fun, sports & entertainment",
    subtitle:
      "Venues, studios, clubs and activities to fill your weekend. Find something fun near you, one tap away.",
    searchPlaceholder: "Search venues, clubs, activities…",
    categoryNoun: "ways to have fun",
    icon: "party",
    accent: "#E0409A",
    accentDark: "#FF86C4",
    tone: "playful",
    emptyTitle: "Nothing on the bill yet",
    emptyText:
      "New venues and activities show up as they join Verso Air. Try clearing your filters, or check back soon.",
    values: [
      {
        title: "Real venues",
        text: "Every listing marked verified has been checked by the Verso Air team.",
      },
      {
        title: "Reach out fast",
        text: "Call or email the venue directly to book or ask a question.",
      },
      {
        title: "Close to you",
        text: "Search by city to see what's happening around you.",
      },
    ],
  },
} satisfies Record<string, SectorConfig>;

export type SectorKey = keyof typeof SECTOR_CONFIGS;
