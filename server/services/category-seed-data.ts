/**
 * Comprehensive Category Seed Data (271+ categories)
 * Structured with main categories and subcategories
 */

export interface CategorySeedData {
  name: string;
  slug: string;
  description: string;
  parentSlug?: string; // Reference to parent category slug
  mainCategory?: boolean;
}

export const CATEGORY_SEED_DATA: CategorySeedData[] = [
  // ============================================================
  // MAIN CATEGORIES (9 Big Sectors)
  // ============================================================

  // 1. COMMERCE
  {
    name: "Commerce",
    slug: "commerce",
    description: "Retail shops, stores and commercial services.",
    mainCategory: true,
  },
  {
    name: "Supermarkets & Hypermarkets",
    slug: "supermarkets-hypermarkets",
    description: "Large retail stores offering multiple product categories",
    parentSlug: "commerce",
  },
  {
    name: "Department Stores",
    slug: "department-stores",
    description: "Multi-department retail establishments",
    parentSlug: "commerce",
  },
  {
    name: "Shopping Centers & Malls",
    slug: "shopping-centers-malls",
    description: "Shopping complexes and retail malls",
    parentSlug: "commerce",
  },
  {
    name: "Convenience Stores",
    slug: "convenience-stores",
    description: "Small neighborhood convenience shops",
    parentSlug: "commerce",
  },
  {
    name: "Wholesale & Distribution",
    slug: "wholesale-distribution",
    description: "Wholesale suppliers and distributors",
    parentSlug: "commerce",
  },

  // 2. HOTELLERIE (Tourism & Leisure)
  {
    name: "Tourism & Leisure",
    slug: "tourism-leisure",
    description:
      "Tours, hospitality, transport, events and leisure activities.",
    mainCategory: true,
  },
  {
    name: "Hotels",
    slug: "hotels",
    description: "Hotel accommodations and lodging",
    parentSlug: "tourism-leisure",
  },
  {
    name: "Hostels & Guesthouses",
    slug: "hostels-guesthouses",
    description: "Budget accommodations and guesthouses",
    parentSlug: "tourism-leisure",
  },
  {
    name: "Travel Agencies",
    slug: "travel-agencies",
    description: "Travel booking and tour agencies",
    parentSlug: "tourism-leisure",
  },
  {
    name: "Tour Operators",
    slug: "tour-operators",
    description: "Tour operations and excursions",
    parentSlug: "tourism-leisure",
  },
  {
    name: "Event & Leisure Activities",
    slug: "event-leisure-activities",
    description: "Entertainment and leisure activities",
    parentSlug: "tourism-leisure",
  },

  // 3. BATIMENT (Building & Construction)
  {
    name: "Building & Construction",
    slug: "building-construction",
    description:
      "Building companies, civil engineering, public works, construction materials and equipment.",
    mainCategory: true,
  },
  {
    name: "Construction Companies",
    slug: "construction-companies",
    description: "General construction and building contractors",
    parentSlug: "building-construction",
  },
  {
    name: "Civil Engineering",
    slug: "civil-engineering",
    description: "Civil engineering and infrastructure projects",
    parentSlug: "building-construction",
  },
  {
    name: "Construction Materials",
    slug: "construction-materials",
    description: "Building materials and supplies",
    parentSlug: "building-construction",
  },
  {
    name: "Heavy Equipment & Machinery",
    slug: "heavy-equipment-machinery",
    description: "Heavy machinery and construction equipment",
    parentSlug: "building-construction",
  },
  {
    name: "Electrical Installation",
    slug: "electrical-installation",
    description: "Electrical services and installation",
    parentSlug: "building-construction",
  },
  {
    name: "Plumbing Services",
    slug: "plumbing-services",
    description: "Plumbing and water services",
    parentSlug: "building-construction",
  },
  {
    name: "HVAC & Climate Control",
    slug: "hvac-climate-control",
    description: "Heating, ventilation and air conditioning services",
    parentSlug: "building-construction",
  },

  // 4. AUTOMOBILE
  {
    name: "Automotive & Motorbike",
    slug: "automotive-motorbike",
    description: "Automobile and motorcycle services and dealers.",
    mainCategory: true,
  },
  {
    name: "Car Dealerships",
    slug: "car-dealerships",
    description: "New and used car sales",
    parentSlug: "automotive-motorbike",
  },
  {
    name: "Car Repair & Maintenance",
    slug: "car-repair-maintenance",
    description: "Auto repair and maintenance services",
    parentSlug: "automotive-motorbike",
  },
  {
    name: "Tire & Wheel Services",
    slug: "tire-wheel-services",
    description: "Tire sales and wheel services",
    parentSlug: "automotive-motorbike",
  },
  {
    name: "Auto Parts & Accessories",
    slug: "auto-parts-accessories",
    description: "Automotive parts and accessories",
    parentSlug: "automotive-motorbike",
  },
  {
    name: "Motorcycle Dealers & Services",
    slug: "motorcycle-dealers-services",
    description: "Motorcycle sales and services",
    parentSlug: "automotive-motorbike",
  },

  // 5. FINANCE
  {
    name: "Finance",
    slug: "finance",
    description: "Banking, insurance and financial services.",
    mainCategory: true,
  },
  {
    name: "Banks & Financial Institutions",
    slug: "banks-financial-institutions",
    description: "Commercial and investment banks",
    parentSlug: "finance",
  },
  {
    name: "Insurance Providers",
    slug: "insurance-providers",
    description: "Insurance companies and providers",
    parentSlug: "finance",
  },
  {
    name: "Insurance Brokers",
    slug: "insurance-brokers",
    description: "Insurance brokerage services",
    parentSlug: "finance",
  },
  {
    name: "Microfinance Institutions",
    slug: "microfinance-institutions",
    description: "Microfinance and small loan providers",
    parentSlug: "finance",
  },
  {
    name: "Investment & Asset Management",
    slug: "investment-asset-management",
    description: "Investment and asset management services",
    parentSlug: "finance",
  },
  {
    name: "Money Transfers & Remittances",
    slug: "money-transfers-remittances",
    description: "Money transfer and remittance services",
    parentSlug: "finance",
  },

  // 6. DIVERTISSEMENT (Entertainment)
  {
    name: "Entertainment & Sports",
    slug: "entertainment-sports",
    description: "Entertainment, sports, music and recreation.",
    mainCategory: true,
  },
  {
    name: "Restaurants & Cafes",
    slug: "restaurants-cafes",
    description: "Restaurants and cafe establishments",
    parentSlug: "entertainment-sports",
  },
  {
    name: "Bars & Nightclubs",
    slug: "bars-nightclubs",
    description: "Bars, clubs and entertainment venues",
    parentSlug: "entertainment-sports",
  },
  {
    name: "Cinemas & Theaters",
    slug: "cinemas-theaters",
    description: "Movie theaters and performing arts venues",
    parentSlug: "entertainment-sports",
  },
  {
    name: "Sports & Recreation",
    slug: "sports-recreation",
    description: "Sports clubs and recreation facilities",
    parentSlug: "entertainment-sports",
  },
  {
    name: "Music & Live Entertainment",
    slug: "music-live-entertainment",
    description: "Live music venues and entertainment",
    parentSlug: "entertainment-sports",
  },

  // 7. SANTE (Health)
  {
    name: "Health",
    slug: "health",
    description: "Medical services: doctors, clinics, hospitals, labs.",
    mainCategory: true,
  },
  {
    name: "Hospitals & Clinics",
    slug: "hospitals-clinics",
    description: "Hospital and clinical facilities",
    parentSlug: "health",
  },
  {
    name: "Doctors & Specialists",
    slug: "doctors-specialists",
    description: "Medical doctors and specialists",
    parentSlug: "health",
  },
  {
    name: "Dentists",
    slug: "dentists",
    description: "Dental services and orthodontists",
    parentSlug: "health",
  },
  {
    name: "Pharmacies",
    slug: "pharmacies",
    description: "Pharmacies and drug stores",
    parentSlug: "health",
  },
  {
    name: "Medical Laboratories",
    slug: "medical-laboratories",
    description: "Laboratory testing and analysis",
    parentSlug: "health",
  },
  {
    name: "Fitness & Wellness",
    slug: "fitness-wellness",
    description: "Gyms, fitness centers and wellness",
    parentSlug: "health",
  },
  {
    name: "Mental Health Services",
    slug: "mental-health-services",
    description: "Psychological and mental health services",
    parentSlug: "health",
  },

  // 8. LOGEMENT (Real Estate)
  {
    name: "Real Estate",
    slug: "real-estate",
    description: "Real estate listings, agencies and developers.",
    mainCategory: true,
  },
  {
    name: "Real Estate Agencies",
    slug: "real-estate-agencies",
    description: "Real estate sale and rental agencies",
    parentSlug: "real-estate",
  },
  {
    name: "Real Estate Developers",
    slug: "real-estate-developers",
    description: "Property developers and construction companies",
    parentSlug: "real-estate",
  },
  {
    name: "Property Management",
    slug: "property-management",
    description: "Property management services",
    parentSlug: "real-estate",
  },
  {
    name: "Landlord & Tenant Services",
    slug: "landlord-tenant-services",
    description: "Services for landlords and tenants",
    parentSlug: "real-estate",
  },
  {
    name: "Appraisers & Valuers",
    slug: "appraisers-valuers",
    description: "Property appraisal and valuation services",
    parentSlug: "real-estate",
  },

  // 9. ADDITIONAL MAIN CATEGORIES
  {
    name: "Communication & Advertising",
    slug: "communication-advertising",
    description: "Communication agencies, media, advertising and events.",
    mainCategory: true,
  },
  {
    name: "Communication Agencies",
    slug: "communication-agencies",
    description: "Public relations and communication agencies",
    parentSlug: "communication-advertising",
  },
  {
    name: "Advertising & Marketing",
    slug: "advertising-marketing",
    description: "Advertising and marketing services",
    parentSlug: "communication-advertising",
  },
  {
    name: "Media & Publishing",
    slug: "media-publishing",
    description: "Media companies and publishers",
    parentSlug: "communication-advertising",
  },
  {
    name: "Printing Services",
    slug: "printing-services",
    description: "Printing and publishing services",
    parentSlug: "communication-advertising",
  },
  {
    name: "Events & Conferences",
    slug: "events-conferences",
    description: "Event organization and conference planning",
    parentSlug: "communication-advertising",
  },
  {
    name: "Web Design & Development",
    slug: "web-design-development",
    description: "Web design and development services",
    parentSlug: "communication-advertising",
  },
  {
    name: "Graphic Design",
    slug: "graphic-design",
    description: "Graphic design services",
    parentSlug: "communication-advertising",
  },
  {
    name: "Photography & Video",
    slug: "photography-video",
    description: "Photography and videography services",
    parentSlug: "communication-advertising",
  },

  // 10. IT & INTERNET
  {
    name: "IT & Internet",
    slug: "it-internet",
    description: "IT, internet and digital technology services.",
    mainCategory: true,
  },
  {
    name: "Software Development",
    slug: "software-development",
    description: "Custom software and application development",
    parentSlug: "it-internet",
  },
  {
    name: "IT Services & Support",
    slug: "it-services-support",
    description: "IT support and managed services",
    parentSlug: "it-internet",
  },
  {
    name: "Cloud Hosting & Data Centers",
    slug: "cloud-hosting-data-centers",
    description: "Cloud services and data hosting",
    parentSlug: "it-internet",
  },
  {
    name: "Internet Service Providers",
    slug: "internet-service-providers",
    description: "Internet connectivity providers",
    parentSlug: "it-internet",
  },
  {
    name: "Cybersecurity & Compliance",
    slug: "cybersecurity-compliance",
    description: "Cybersecurity and IT compliance services",
    parentSlug: "it-internet",
  },
  {
    name: "SEO & Digital Marketing",
    slug: "seo-digital-marketing",
    description: "Search engine optimization and digital marketing",
    parentSlug: "it-internet",
  },
  {
    name: "E-Commerce Platforms",
    slug: "ecommerce-platforms",
    description: "E-commerce solutions and platforms",
    parentSlug: "it-internet",
  },

  // 11. ACCOUNTING, LEGAL & ADVISORY
  {
    name: "Accounting, Legal & Advisory",
    slug: "accounting-legal-advisory",
    description: "Accounting, legal and advisory services.",
    mainCategory: true,
  },
  {
    name: "Accounting & Auditing",
    slug: "accounting-auditing",
    description: "Accounting and audit services",
    parentSlug: "accounting-legal-advisory",
  },
  {
    name: "Law Firms & Legal Services",
    slug: "law-firms-legal-services",
    description: "Legal services and law firms",
    parentSlug: "accounting-legal-advisory",
  },
  {
    name: "Notaries & Legal Document Services",
    slug: "notaries-legal-documents",
    description: "Notary and legal document services",
    parentSlug: "accounting-legal-advisory",
  },
  {
    name: "Tax Consulting",
    slug: "tax-consulting",
    description: "Tax advisory and planning services",
    parentSlug: "accounting-legal-advisory",
  },
  {
    name: "Business Consulting",
    slug: "business-consulting",
    description: "Management and business consulting",
    parentSlug: "accounting-legal-advisory",
  },

  // 12. FOOD & BEVERAGE
  {
    name: "Food & Beverage",
    slug: "food-beverage",
    description: "Restaurants, food shops and culinary services.",
    mainCategory: true,
  },
  {
    name: "Fine Dining Restaurants",
    slug: "fine-dining-restaurants",
    description: "Upscale dining establishments",
    parentSlug: "food-beverage",
  },
  {
    name: "Casual Dining",
    slug: "casual-dining",
    description: "Casual restaurant and cafe establishments",
    parentSlug: "food-beverage",
  },
  {
    name: "Fast Food & Quick Service",
    slug: "fast-food-quick-service",
    description: "Fast food and quick service restaurants",
    parentSlug: "food-beverage",
  },
  {
    name: "Bakeries & Pastry Shops",
    slug: "bakeries-pastry-shops",
    description: "Bakeries and pastry shops",
    parentSlug: "food-beverage",
  },
  {
    name: "Catering Services",
    slug: "catering-services",
    description: "Catering and food delivery services",
    parentSlug: "food-beverage",
  },
  {
    name: "Food Shops & Butcheries",
    slug: "food-shops-butcheries",
    description: "Food retail and specialty food shops",
    parentSlug: "food-beverage",
  },

  // 13. ANIMALS & PETS
  {
    name: "Animals & Pets",
    slug: "animals-pets",
    description: "Veterinary services, pet shops and animal care.",
    mainCategory: true,
  },
  {
    name: "Veterinary Services",
    slug: "veterinary-services",
    description: "Veterinary clinics and animal hospitals",
    parentSlug: "animals-pets",
  },
  {
    name: "Pet Shops & Supplies",
    slug: "pet-shops-supplies",
    description: "Pet stores and animal supplies",
    parentSlug: "animals-pets",
  },
  {
    name: "Pet Grooming & Boarding",
    slug: "pet-grooming-boarding",
    description: "Pet grooming and boarding services",
    parentSlug: "animals-pets",
  },
  {
    name: "Livestock & Farm Services",
    slug: "livestock-farm-services",
    description: "Livestock and agricultural services",
    parentSlug: "animals-pets",
  },
  {
    name: "Zoo & Wildlife Parks",
    slug: "zoo-wildlife-parks",
    description: "Zoo and wildlife facilities",
    parentSlug: "animals-pets",
  },

  // 14. ARTISANS & TRADES
  {
    name: "Artisans & Trades",
    slug: "artisans-trades",
    description: "Skilled tradespeople and craftspeople.",
    mainCategory: true,
  },
  {
    name: "Carpenters & Woodworkers",
    slug: "carpenters-woodworkers",
    description: "Carpentry and woodworking services",
    parentSlug: "artisans-trades",
  },
  {
    name: "Welders & Metal Workers",
    slug: "welders-metal-workers",
    description: "Welding and metalwork services",
    parentSlug: "artisans-trades",
  },
  {
    name: "Painters & Decorators",
    slug: "painters-decorators",
    description: "Painting and decorating services",
    parentSlug: "artisans-trades",
  },
  {
    name: "Flooring Services",
    slug: "flooring-services",
    description: "Flooring installation and repair",
    parentSlug: "artisans-trades",
  },
  {
    name: "Roofing Services",
    slug: "roofing-services",
    description: "Roofing installation and repair",
    parentSlug: "artisans-trades",
  },
  {
    name: "Cleaning & Maintenance",
    slug: "cleaning-maintenance",
    description: "Cleaning and maintenance services",
    parentSlug: "artisans-trades",
  },

  // 15. HOME & INTERIOR DESIGN
  {
    name: "Home & Interior Design",
    slug: "home-interior-design",
    description: "Furniture, home decor and interior design.",
    mainCategory: true,
  },
  {
    name: "Interior Design Services",
    slug: "interior-design-services",
    description: "Interior design and decoration",
    parentSlug: "home-interior-design",
  },
  {
    name: "Furniture Stores",
    slug: "furniture-stores",
    description: "Furniture retail shops",
    parentSlug: "home-interior-design",
  },
  {
    name: "Home Decor & Accessories",
    slug: "home-decor-accessories",
    description: "Home decoration and accessories",
    parentSlug: "home-interior-design",
  },
  {
    name: "Kitchen & Bath",
    slug: "kitchen-bath",
    description: "Kitchen and bathroom fixtures",
    parentSlug: "home-interior-design",
  },
  {
    name: "Lighting & Electrical Fixtures",
    slug: "lighting-electrical-fixtures",
    description: "Lighting and electrical fixtures",
    parentSlug: "home-interior-design",
  },

  // 16. FASHION & TEXTILES
  {
    name: "Fashion & Textiles",
    slug: "fashion-textiles",
    description: "Clothing, textiles and fashion.",
    mainCategory: true,
  },
  {
    name: "Clothing Retailers",
    slug: "clothing-retailers",
    description: "Clothing stores and boutiques",
    parentSlug: "fashion-textiles",
  },
  {
    name: "Fashion Designers",
    slug: "fashion-designers",
    description: "Fashion design and custom tailoring",
    parentSlug: "fashion-textiles",
  },
  {
    name: "Fabric & Textile Shops",
    slug: "fabric-textile-shops",
    description: "Textile and fabric retailers",
    parentSlug: "fashion-textiles",
  },
  {
    name: "Shoe Stores",
    slug: "shoe-stores",
    description: "Footwear retailers",
    parentSlug: "fashion-textiles",
  },
  {
    name: "Accessories & Jewelry",
    slug: "accessories-jewelry",
    description: "Jewelry and fashion accessories",
    parentSlug: "fashion-textiles",
  },

  // 17. TELECOMMUNICATIONS
  {
    name: "Telecommunications",
    slug: "telecommunications",
    description: "Telecommunications and connectivity services.",
    mainCategory: true,
  },
  {
    name: "Telephone Operators",
    slug: "telephone-operators",
    description: "Mobile and fixed line services",
    parentSlug: "telecommunications",
  },
  {
    name: "Internet Providers",
    slug: "internet-providers",
    description: "Internet service and connectivity",
    parentSlug: "telecommunications",
  },
  {
    name: "Network Equipment",
    slug: "network-equipment",
    description: "Networking equipment and supplies",
    parentSlug: "telecommunications",
  },
  {
    name: "Telecommunications Support",
    slug: "telecommunications-support",
    description: "Technical support for telecom services",
    parentSlug: "telecommunications",
  },

  // 18. AGRI-FOOD & AGRICULTURE
  {
    name: "Agri-Food & Agriculture",
    slug: "agri-food-agriculture",
    description: "Agriculture, farming and agribusiness.",
    mainCategory: true,
  },
  {
    name: "Agricultural Suppliers",
    slug: "agricultural-suppliers",
    description: "Farm equipment and agricultural supplies",
    parentSlug: "agri-food-agriculture",
  },
  {
    name: "Crop Production",
    slug: "crop-production",
    description: "Crop farming and production",
    parentSlug: "agri-food-agriculture",
  },
  {
    name: "Livestock Farming",
    slug: "livestock-farming",
    description: "Livestock raising and breeding",
    parentSlug: "agri-food-agriculture",
  },
  {
    name: "Food Processing",
    slug: "food-processing",
    description: "Food processing and manufacturing",
    parentSlug: "agri-food-agriculture",
  },
  {
    name: "Agricultural Cooperatives",
    slug: "agricultural-cooperatives",
    description: "Farmer cooperatives and associations",
    parentSlug: "agri-food-agriculture",
  },

  // 19. TRANSPORTATION & LOGISTICS
  {
    name: "Transportation & Logistics",
    slug: "transportation-logistics",
    description: "Transportation, shipping and logistics.",
    mainCategory: true,
  },
  {
    name: "Shipping & Courier",
    slug: "shipping-courier",
    description: "Courier and shipping services",
    parentSlug: "transportation-logistics",
  },
  {
    name: "Logistics & Warehousing",
    slug: "logistics-warehousing",
    description: "Logistics and warehouse management",
    parentSlug: "transportation-logistics",
  },
  {
    name: "Taxi & Ride Services",
    slug: "taxi-ride-services",
    description: "Taxi and ride-sharing services",
    parentSlug: "transportation-logistics",
  },
  {
    name: "Airlines & Air Transport",
    slug: "airlines-air-transport",
    description: "Airlines and air cargo services",
    parentSlug: "transportation-logistics",
  },
  {
    name: "Port Services",
    slug: "port-services",
    description: "Port and maritime services",
    parentSlug: "transportation-logistics",
  },

  // 20. ADMINISTRATION & GOVERNMENT
  {
    name: "Administration & Government",
    slug: "administration-government",
    description: "Government institutions and public services.",
    mainCategory: true,
  },
  {
    name: "Government Agencies",
    slug: "government-agencies",
    description: "Government offices and agencies",
    parentSlug: "administration-government",
  },
  {
    name: "Social Services",
    slug: "social-services",
    description: "Social welfare and assistance services",
    parentSlug: "administration-government",
  },
  {
    name: "Education - Government",
    slug: "education-government",
    description: "Government schools and education",
    parentSlug: "administration-government",
  },
  {
    name: "Public Safety",
    slug: "public-safety",
    description: "Police, fire and emergency services",
    parentSlug: "administration-government",
  },
  {
    name: "Municipal Services",
    slug: "municipal-services",
    description: "City and municipal services",
    parentSlug: "administration-government",
  },

  // 21. EDUCATION & TRAINING
  {
    name: "Education & Training",
    slug: "education-training",
    description: "Schools, universities and training centers.",
    mainCategory: true,
  },
  {
    name: "Primary & Secondary Schools",
    slug: "primary-secondary-schools",
    description: "Elementary and middle schools",
    parentSlug: "education-training",
  },
  {
    name: "Universities & Colleges",
    slug: "universities-colleges",
    description: "Higher education institutions",
    parentSlug: "education-training",
  },
  {
    name: "Vocational Training",
    slug: "vocational-training",
    description: "Vocational and technical training",
    parentSlug: "education-training",
  },
  {
    name: "Language Schools",
    slug: "language-schools",
    description: "Language training and schools",
    parentSlug: "education-training",
  },
  {
    name: "Online Courses & E-Learning",
    slug: "online-courses-elearning",
    description: "Online education and distance learning",
    parentSlug: "education-training",
  },

  // 22. IMPORT & EXPORT
  {
    name: "Import & Export",
    slug: "import-export",
    description: "Import, export and international trade.",
    mainCategory: true,
  },
  {
    name: "Export Companies",
    slug: "export-companies",
    description: "Export trading companies",
    parentSlug: "import-export",
  },
  {
    name: "Import Companies",
    slug: "import-companies",
    description: "Import trading companies",
    parentSlug: "import-export",
  },
  {
    name: "Customs & Trade Services",
    slug: "customs-trade-services",
    description: "Customs clearance and trade services",
    parentSlug: "import-export",
  },
  {
    name: "Trade Associations",
    slug: "trade-associations",
    description: "Trade and business associations",
    parentSlug: "import-export",
  },

  // 23. PROFESSIONAL SERVICES
  {
    name: "Professional Services",
    slug: "professional-services",
    description: "Professional and consulting services.",
    mainCategory: true,
  },
  {
    name: "Human Resources",
    slug: "human-resources",
    description: "HR recruitment and staffing",
    parentSlug: "professional-services",
  },
  {
    name: "Recruitment & Staffing",
    slug: "recruitment-staffing",
    description: "Job placement and recruitment services",
    parentSlug: "professional-services",
  },
  {
    name: "Insurance Claims",
    slug: "insurance-claims",
    description: "Insurance claims adjustment",
    parentSlug: "professional-services",
  },
  {
    name: "Real Estate Brokerage",
    slug: "real-estate-brokerage",
    description: "Real estate brokerage services",
    parentSlug: "professional-services",
  },

  // 24. UTILITIES & ENERGY
  {
    name: "Utilities & Energy",
    slug: "utilities-energy",
    description: "Electricity, water and energy services.",
    mainCategory: true,
  },
  {
    name: "Electricity Providers",
    slug: "electricity-providers",
    description: "Electric power utilities",
    parentSlug: "utilities-energy",
  },
  {
    name: "Water Services",
    slug: "water-services",
    description: "Water supply and sanitation",
    parentSlug: "utilities-energy",
  },
  {
    name: "Gas Providers",
    slug: "gas-providers",
    description: "Natural gas and fuel suppliers",
    parentSlug: "utilities-energy",
  },
  {
    name: "Renewable Energy",
    slug: "renewable-energy",
    description: "Solar, wind and renewable energy",
    parentSlug: "utilities-energy",
  },

  // 25. MEDIA & ENTERTAINMENT
  {
    name: "Media & Entertainment",
    slug: "media-entertainment",
    description: "Media, broadcasting and entertainment.",
    mainCategory: true,
  },
  {
    name: "Radio Stations",
    slug: "radio-stations",
    description: "Radio broadcasting stations",
    parentSlug: "media-entertainment",
  },
  {
    name: "Television Networks",
    slug: "television-networks",
    description: "Television broadcasters",
    parentSlug: "media-entertainment",
  },
  {
    name: "Newspapers & Magazines",
    slug: "newspapers-magazines",
    description: "Print and digital media",
    parentSlug: "media-entertainment",
  },
  {
    name: "Music & Recording",
    slug: "music-recording",
    description: "Music production and recording studios",
    parentSlug: "media-entertainment",
  },

  // 26. SPORTS & FITNESS
  {
    name: "Sports & Fitness",
    slug: "sports-fitness",
    description: "Sports clubs, fitness centers and recreation.",
    mainCategory: true,
  },
  {
    name: "Gyms & Fitness Centers",
    slug: "gyms-fitness-centers",
    description: "Fitness centers and gyms",
    parentSlug: "sports-fitness",
  },
  {
    name: "Sports Clubs",
    slug: "sports-clubs",
    description: "Sports clubs and associations",
    parentSlug: "sports-fitness",
  },
  {
    name: "Sports Equipment",
    slug: "sports-equipment",
    description: "Sports equipment retail",
    parentSlug: "sports-fitness",
  },
  {
    name: "Personal Training",
    slug: "personal-training",
    description: "Personal training and coaching",
    parentSlug: "sports-fitness",
  },

  // 27. BEAUTY & PERSONAL CARE
  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    description: "Salons, spas and personal care services.",
    mainCategory: true,
  },
  {
    name: "Hair Salons",
    slug: "hair-salons",
    description: "Hair cutting and styling salons",
    parentSlug: "beauty-personal-care",
  },
  {
    name: "Beauty Salons & Spas",
    slug: "beauty-salons-spas",
    description: "Beauty and spa services",
    parentSlug: "beauty-personal-care",
  },
  {
    name: "Cosmetics & Beauty Products",
    slug: "cosmetics-beauty-products",
    description: "Beauty product retailers",
    parentSlug: "beauty-personal-care",
  },
  {
    name: "Barbers",
    slug: "barbers",
    description: "Barber shops",
    parentSlug: "beauty-personal-care",
  },

  // 28. MANUFACTURING & INDUSTRY
  {
    name: "Manufacturing & Industry",
    slug: "manufacturing-industry",
    description: "Manufacturing and industrial companies.",
    mainCategory: true,
  },
  {
    name: "Heavy Industry",
    slug: "heavy-industry",
    description: "Heavy manufacturing and industrial",
    parentSlug: "manufacturing-industry",
  },
  {
    name: "Textiles Manufacturing",
    slug: "textiles-manufacturing",
    description: "Textile mills and manufacturers",
    parentSlug: "manufacturing-industry",
  },
  {
    name: "Plastics Manufacturing",
    slug: "plastics-manufacturing",
    description: "Plastic product manufacturers",
    parentSlug: "manufacturing-industry",
  },
  {
    name: "Chemical Manufacturing",
    slug: "chemical-manufacturing",
    description: "Chemical production and manufacturing",
    parentSlug: "manufacturing-industry",
  },

  // 29. WHOLESALE & DISTRIBUTION
  {
    name: "Wholesale & Distribution",
    slug: "wholesale-distribution",
    description: "Wholesale suppliers and distributors.",
    mainCategory: true,
  },
  {
    name: "General Wholesalers",
    slug: "general-wholesalers",
    description: "General wholesale suppliers",
    parentSlug: "wholesale-distribution",
  },
  {
    name: "Food Wholesalers",
    slug: "food-wholesalers",
    description: "Food and beverage wholesalers",
    parentSlug: "wholesale-distribution",
  },
  {
    name: "Electronics Wholesalers",
    slug: "electronics-wholesalers",
    description: "Electronics and IT wholesalers",
    parentSlug: "wholesale-distribution",
  },
  {
    name: "Pharmaceutical Distributors",
    slug: "pharmaceutical-distributors",
    description: "Pharmaceutical distributors",
    parentSlug: "wholesale-distribution",
  },

  // 30. SECURITY & SAFETY
  {
    name: "Security & Safety",
    slug: "security-safety",
    description: "Security, surveillance and safety services.",
    mainCategory: true,
  },
  {
    name: "Security Companies",
    slug: "security-companies",
    description: "Security and guard services",
    parentSlug: "security-safety",
  },
  {
    name: "Surveillance & Alarms",
    slug: "surveillance-alarms",
    description: "Security cameras and alarm systems",
    parentSlug: "security-safety",
  },
  {
    name: "Fire Safety",
    slug: "fire-safety",
    description: "Fire prevention and safety",
    parentSlug: "security-safety",
  },
  {
    name: "Insurance & Risk",
    slug: "insurance-risk",
    description: "Risk management and insurance",
    parentSlug: "security-safety",
  },

  // 31. WASTE MANAGEMENT
  {
    name: "Waste Management",
    slug: "waste-management",
    description: "Waste collection and recycling services.",
    mainCategory: true,
  },
  {
    name: "Waste Collection",
    slug: "waste-collection",
    description: "Garbage and waste collection",
    parentSlug: "waste-management",
  },
  {
    name: "Recycling Services",
    slug: "recycling-services",
    description: "Recycling and waste processing",
    parentSlug: "waste-management",
  },
  {
    name: "Hazardous Waste",
    slug: "hazardous-waste",
    description: "Hazardous waste management",
    parentSlug: "waste-management",
  },
  {
    name: "Composting",
    slug: "composting",
    description: "Composting and organic waste",
    parentSlug: "waste-management",
  },

  // 32. MISCELLANEOUS SERVICES
  {
    name: "Miscellaneous Services",
    slug: "miscellaneous-services",
    description: "Various other services and businesses.",
    mainCategory: true,
  },
  {
    name: "Repair Services",
    slug: "repair-services",
    description: "General repair and maintenance",
    parentSlug: "miscellaneous-services",
  },
  {
    name: "Rental Services",
    slug: "rental-services",
    description: "Equipment and property rentals",
    parentSlug: "miscellaneous-services",
  },
  {
    name: "Storage Services",
    slug: "storage-services",
    description: "Storage and warehouse facilities",
    parentSlug: "miscellaneous-services",
  },
  {
    name: "Translation & Interpretation",
    slug: "translation-interpretation",
    description: "Translation and interpretation services",
    parentSlug: "miscellaneous-services",
  },
];
