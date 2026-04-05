/**
 * Sector-specific verification criteria for Verso Air Business Directory.
 *
 * Maps each of the 32 main sectors to their required verification documents.
 * Used by:
 * - Admin verification panel (checklist when reviewing a business)
 * - Business creation form ("To get verified, you'll need to provide:")
 * - Public business detail page ("Verified credentials: ✓ License, ✓ Insurance")
 */

export interface VerificationDocument {
  type: string; // unique key (e.g. "contractor_license")
  label: string; // display label
  description: string; // help text
  required: boolean; // true = must-have, false = nice-to-have
}

export interface SectorVerificationCriteria {
  sectorSlug: string;
  sectorName: string;
  documents: VerificationDocument[];
}

export const VERIFICATION_CRITERIA: SectorVerificationCriteria[] = [
  {
    sectorSlug: "health",
    sectorName: "Health (Santé)",
    documents: [
      {
        type: "medical_license",
        label: "Medical License Number",
        description: "RPPS/ADELI (France), GMC (UK), NPI (US) or equivalent",
        required: true,
      },
      {
        type: "health_authority_reg",
        label: "Health Authority Registration",
        description: "Registration with national health authority",
        required: true,
      },
      {
        type: "specialty_cert",
        label: "Specialty Board Certification",
        description: "Board certification for declared specialty",
        required: false,
      },
      {
        type: "hygiene_certificate",
        label: "Hygiene / Safety Inspection",
        description: "Latest health & safety inspection certificate",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "building-construction",
    sectorName: "Building & Construction (Bâtiment)",
    documents: [
      {
        type: "contractor_license",
        label: "Contractor License",
        description: "Licensed contractor number from local authority",
        required: true,
      },
      {
        type: "liability_insurance",
        label: "Liability Insurance",
        description: "General liability + workers compensation certificate",
        required: true,
      },
      {
        type: "decennale",
        label: "Décennale Guarantee",
        description: "10-year construction defect insurance (France/EU)",
        required: false,
      },
      {
        type: "trade_certification",
        label: "Trade Certification",
        description: "Electrician, plumber, HVAC, or equivalent trade cert",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "tourism-leisure",
    sectorName: "Tourism & Leisure (Hôtellerie)",
    documents: [
      {
        type: "star_rating_cert",
        label: "Star Rating Certificate",
        description: "Official tourism office star classification",
        required: true,
      },
      {
        type: "operating_license",
        label: "Operating License",
        description: "Hotel/accommodation operating permit",
        required: true,
      },
      {
        type: "fire_safety",
        label: "Fire Safety Certificate",
        description: "Fire safety inspection compliance",
        required: true,
      },
      {
        type: "health_inspection",
        label: "Health Inspection",
        description: "Latest health & hygiene inspection report",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "finance",
    sectorName: "Finance",
    documents: [
      {
        type: "banking_license",
        label: "Banking / Financial License",
        description: "Central bank license, ORIAS, FCA, SEC registration",
        required: true,
      },
      {
        type: "regulatory_id",
        label: "Regulatory Registration ID",
        description: "AMF, FCA, SEC or local financial authority ID",
        required: true,
      },
      {
        type: "insurance_bond",
        label: "Professional Indemnity Insurance",
        description: "E&O insurance / bonding certificate",
        required: false,
      },
      {
        type: "solvency_cert",
        label: "Solvency / Capital Certificate",
        description: "Capital adequacy proof (banks/insurance)",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "automotive-motorbike",
    sectorName: "Automotive & Motorbike",
    documents: [
      {
        type: "dealer_license",
        label: "Dealer License",
        description: "Motor vehicle dealer license from local authority",
        required: true,
      },
      {
        type: "mechanic_cert",
        label: "Mechanic Certification",
        description: "ASE certification or national equivalent",
        required: false,
      },
      {
        type: "environmental_permit",
        label: "Environmental Permit",
        description: "Waste oil / hazardous materials handling permit",
        required: false,
      },
      {
        type: "product_liability",
        label: "Product Liability Insurance",
        description: "Insurance for parts/accessories sold",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "entertainment-sports",
    sectorName: "Entertainment & Sports (Divertissement)",
    documents: [
      {
        type: "entertainment_license",
        label: "Entertainment License",
        description: "Venue/event entertainment operating license",
        required: true,
      },
      {
        type: "liquor_license",
        label: "Liquor License",
        description: "Alcohol serving permit (bars, nightclubs)",
        required: false,
      },
      {
        type: "capacity_permit",
        label: "Capacity Permit",
        description: "Maximum occupancy certification",
        required: false,
      },
      {
        type: "security_license",
        label: "Security Staff License",
        description: "Licensed security personnel certification",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "food-beverage",
    sectorName: "Food & Beverage",
    documents: [
      {
        type: "food_service_license",
        label: "Food Service License",
        description: "Restaurant / food handling operating permit",
        required: true,
      },
      {
        type: "health_inspection",
        label: "Health Inspection Certificate",
        description: "Latest food safety inspection report",
        required: true,
      },
      {
        type: "alcohol_license",
        label: "Alcohol License",
        description: "Liquor license (if applicable)",
        required: false,
      },
      {
        type: "fire_safety",
        label: "Fire Safety Certificate",
        description: "Fire safety compliance",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "real-estate",
    sectorName: "Real Estate (Immobilier)",
    documents: [
      {
        type: "agent_license",
        label: "Real Estate Agent License",
        description: "Licensed real estate professional ID",
        required: true,
      },
      {
        type: "trust_account",
        label: "Trust Account Certification",
        description: "Client trust/escrow account proof",
        required: true,
      },
      {
        type: "professional_insurance",
        label: "Professional Liability Insurance",
        description: "E&O insurance for real estate agents",
        required: false,
      },
      {
        type: "vefa_guarantee",
        label: "VEFA Financial Guarantee",
        description: "For developers: off-plan sale guarantee",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "education-training",
    sectorName: "Education & Training",
    documents: [
      {
        type: "school_accreditation",
        label: "School Accreditation",
        description: "Ministry of Education accreditation",
        required: true,
      },
      {
        type: "teaching_cert",
        label: "Teaching Certifications",
        description: "Staff teaching qualifications",
        required: false,
      },
      {
        type: "cpf_registration",
        label: "CPF / Training Provider Registration",
        description: "Registered training provider (France CPF, etc.)",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "accounting-legal-advisory",
    sectorName: "Accounting, Legal & Advisory",
    documents: [
      {
        type: "bar_registration",
        label: "Bar Registration (Lawyers)",
        description: "Bar association membership / registration",
        required: true,
      },
      {
        type: "cpa_license",
        label: "CPA / Accounting License",
        description: "Chartered accountant license",
        required: true,
      },
      {
        type: "professional_indemnity",
        label: "Professional Indemnity Insurance",
        description: "Malpractice / E&O insurance",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "beauty-personal-care",
    sectorName: "Beauty & Personal Care",
    documents: [
      {
        type: "esthetician_license",
        label: "Esthetician / Cosmetology License",
        description: "Licensed beauty professional certification",
        required: true,
      },
      {
        type: "salon_hygiene",
        label: "Salon Hygiene Certificate",
        description: "Health & hygiene inspection for salons/spas",
        required: true,
      },
      {
        type: "product_safety",
        label: "Product Safety Compliance",
        description: "Cosmetics/products safety certifications",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "it-internet",
    sectorName: "IT & Internet",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Company registration / trade license",
        required: true,
      },
      {
        type: "gdpr_compliance",
        label: "Data Protection Compliance",
        description: "GDPR, CCPA, or local data protection certification",
        required: false,
      },
      {
        type: "iso_certification",
        label: "ISO Certification",
        description: "ISO 27001 (security) or ISO 9001 (quality)",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "telecommunications",
    sectorName: "Telecommunications",
    documents: [
      {
        type: "telecom_license",
        label: "Telecom Operator License",
        description: "Telecommunications operating license",
        required: true,
      },
      {
        type: "consumer_protection",
        label: "Consumer Protection Registration",
        description: "Registered with consumer protection authority",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "artisans-trades",
    sectorName: "Artisans & Trades",
    documents: [
      {
        type: "trade_cert",
        label: "Trade Certification",
        description: "Chambre des Métiers registration or equivalent",
        required: true,
      },
      {
        type: "professional_insurance",
        label: "Professional Insurance",
        description: "Liability insurance for tradework",
        required: true,
      },
      {
        type: "qualification_cert",
        label: "Qualification Certificate",
        description: "CAP, BEP, or master artisan diploma",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "transportation-logistics",
    sectorName: "Transportation & Logistics",
    documents: [
      {
        type: "transport_license",
        label: "Transport License",
        description: "Freight/passenger transport operating license",
        required: true,
      },
      {
        type: "vehicle_inspection",
        label: "Vehicle Inspection Certificates",
        description: "Fleet safety inspection records",
        required: true,
      },
      {
        type: "driver_certs",
        label: "Driver Certifications",
        description: "Commercial driver licenses for staff",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "security-safety",
    sectorName: "Security & Safety",
    documents: [
      {
        type: "security_company_license",
        label: "Security Company License",
        description: "Licensed private security company",
        required: true,
      },
      {
        type: "guard_certs",
        label: "Guard Certifications",
        description: "Individual security guard licenses",
        required: true,
      },
      {
        type: "firearm_permit",
        label: "Firearm Permit",
        description: "Armed security permit (if armed)",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "agri-food-agriculture",
    sectorName: "Agri-Food & Agriculture",
    documents: [
      {
        type: "farm_registration",
        label: "Farm Registration",
        description: "Agricultural holding registration",
        required: true,
      },
      {
        type: "organic_cert",
        label: "Organic Certification",
        description: "Certified organic (if claiming organic)",
        required: false,
      },
      {
        type: "food_safety",
        label: "Food Safety Compliance",
        description: "HACCP or equivalent food safety certification",
        required: false,
      },
      {
        type: "pesticide_cert",
        label: "Pesticide Handling Certification",
        description: "Licensed pesticide applicator",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "animals-pets",
    sectorName: "Animals & Pets",
    documents: [
      {
        type: "vet_license",
        label: "Veterinary License",
        description: "Licensed veterinarian (for vet clinics)",
        required: true,
      },
      {
        type: "pet_store_license",
        label: "Pet Store License",
        description: "Animal retail operating license",
        required: false,
      },
      {
        type: "animal_welfare",
        label: "Animal Welfare Compliance",
        description: "Registered with animal welfare authority",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "manufacturing-industry",
    sectorName: "Manufacturing & Industry",
    documents: [
      {
        type: "factory_license",
        label: "Factory Operating License",
        description: "Manufacturing operating permit",
        required: true,
      },
      {
        type: "environmental_permit",
        label: "Environmental Permit",
        description: "Industrial environmental compliance",
        required: true,
      },
      {
        type: "iso_certification",
        label: "ISO Certification",
        description: "ISO 9001 (quality) or ISO 14001 (environmental)",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "wholesale-distribution",
    sectorName: "Wholesale & Distribution",
    documents: [
      {
        type: "distributor_license",
        label: "Distributor License",
        description: "Wholesale distribution license",
        required: true,
      },
      {
        type: "import_export_permit",
        label: "Import/Export Permits",
        description: "Trade permits for international goods",
        required: false,
      },
      {
        type: "product_liability",
        label: "Product Liability Insurance",
        description: "Insurance covering distributed goods",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "import-export",
    sectorName: "Import & Export",
    documents: [
      {
        type: "customs_broker",
        label: "Customs Broker License",
        description: "Licensed customs broker certification",
        required: true,
      },
      {
        type: "import_permit",
        label: "Import/Export Permits",
        description: "Trade-specific import/export licenses",
        required: true,
      },
      {
        type: "trade_compliance",
        label: "Trade Compliance",
        description: "Sanctions / export control compliance",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "waste-management",
    sectorName: "Waste Management",
    documents: [
      {
        type: "waste_carrier",
        label: "Waste Carrier License",
        description: "Licensed waste collection and transport",
        required: true,
      },
      {
        type: "environmental_permit",
        label: "Environmental Permit",
        description: "Waste disposal environmental compliance",
        required: true,
      },
      {
        type: "recycling_cert",
        label: "Recycling Certification",
        description: "Certified recycling facility",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "utilities-energy",
    sectorName: "Utilities & Energy",
    documents: [
      {
        type: "utility_license",
        label: "Utility Operator License",
        description: "Licensed utility service provider",
        required: true,
      },
      {
        type: "grid_permit",
        label: "Grid Connection Permit",
        description: "Electricity/gas grid connection authorization",
        required: false,
      },
      {
        type: "environmental_compliance",
        label: "Environmental Compliance",
        description: "Energy sector environmental certification",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "media-entertainment",
    sectorName: "Media & Entertainment",
    documents: [
      {
        type: "broadcasting_license",
        label: "Broadcasting License",
        description: "Radio/TV broadcasting license (if applicable)",
        required: false,
      },
      {
        type: "press_card",
        label: "Press Card",
        description: "Journalist press credentials",
        required: false,
      },
      {
        type: "event_permits",
        label: "Event Permits",
        description: "Large event / gathering permits",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "commerce",
    sectorName: "Commerce (Retail)",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Trade register / commercial license",
        required: true,
      },
      {
        type: "tax_id",
        label: "Tax Registration",
        description: "VAT / tax identification number",
        required: true,
      },
      {
        type: "consumer_protection",
        label: "Consumer Protection",
        description: "Registered with consumer protection body",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "communication-advertising",
    sectorName: "Communication & Advertising",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Advertising agency business license",
        required: true,
      },
      {
        type: "professional_insurance",
        label: "Professional Liability Insurance",
        description: "E&O insurance for media services",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "home-interior-design",
    sectorName: "Home & Interior Design",
    documents: [
      {
        type: "design_certification",
        label: "Interior Design Certification",
        description: "Professional interior design qualification",
        required: false,
      },
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Trade register / commercial license",
        required: true,
      },
    ],
  },
  {
    sectorSlug: "fashion-textiles",
    sectorName: "Fashion & Textiles",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Fashion brand / retail business license",
        required: true,
      },
      {
        type: "textile_compliance",
        label: "Textile Compliance",
        description: "Fabric safety / labeling compliance",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "sports-fitness",
    sectorName: "Sports & Fitness",
    documents: [
      {
        type: "trainer_cert",
        label: "Personal Trainer Certification",
        description: "ACE, NASM, or national equivalent",
        required: false,
      },
      {
        type: "facility_license",
        label: "Fitness Facility License",
        description: "Gym / sports facility operating license",
        required: true,
      },
      {
        type: "first_aid",
        label: "First Aid Certification",
        description: "Staff first aid / CPR training",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "professional-services",
    sectorName: "Professional Services",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "Professional services company registration",
        required: true,
      },
      {
        type: "professional_insurance",
        label: "Professional Liability Insurance",
        description: "E&O / malpractice insurance",
        required: false,
      },
    ],
  },
  {
    sectorSlug: "administration-government",
    sectorName: "Administration & Government",
    documents: [
      {
        type: "gov_entity_proof",
        label: "Government Entity Proof",
        description:
          "Official government institution verification — auto-verified",
        required: true,
      },
    ],
  },
  {
    sectorSlug: "miscellaneous-services",
    sectorName: "Miscellaneous Services",
    documents: [
      {
        type: "business_registration",
        label: "Business Registration",
        description: "General business license / trade registration",
        required: true,
      },
      {
        type: "professional_insurance",
        label: "Insurance",
        description: "Liability insurance (if client-facing)",
        required: false,
      },
    ],
  },
];

/**
 * Get verification criteria for a sector by slug.
 */
export function getCriteriaBySlug(
  slug: string,
): SectorVerificationCriteria | undefined {
  return VERIFICATION_CRITERIA.find((c) => c.sectorSlug === slug);
}

/**
 * Get verification criteria matching a category name (fuzzy match).
 */
export function getCriteriaByName(
  name: string,
): SectorVerificationCriteria | undefined {
  const lower = name.toLowerCase();
  return VERIFICATION_CRITERIA.find(
    (c) =>
      c.sectorName.toLowerCase().includes(lower) ||
      c.sectorSlug.includes(lower.replace(/\s+/g, "-")),
  );
}

/**
 * Get all required documents for a sector.
 */
export function getRequiredDocuments(slug: string): VerificationDocument[] {
  const criteria = getCriteriaBySlug(slug);
  return criteria?.documents.filter((d) => d.required) ?? [];
}
