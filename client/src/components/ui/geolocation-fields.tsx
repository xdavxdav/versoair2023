import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Standard business type options used across all CRUD forms.
 */
export const BUSINESS_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "retail", label: "Retail / Shop" },
  { value: "service", label: "Service Provider" },
  { value: "construction", label: "Construction" },
  { value: "automotive", label: "Automotive" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "technology", label: "Technology" },
  { value: "real_estate", label: "Real Estate" },
  { value: "logistics", label: "Logistics / Transport" },
  { value: "agriculture", label: "Agriculture" },
  { value: "wholesale", label: "Wholesale / Distribution" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "beauty", label: "Beauty & Personal Care" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "media", label: "Media & Communication" },
  { value: "security", label: "Security & Safety" },
  { value: "government", label: "Government / Public" },
  { value: "professional", label: "Professional Services" },
  { value: "telecom", label: "Telecommunications" },
  { value: "sports", label: "Sports & Fitness" },
  { value: "pets", label: "Animals & Pets" },
  { value: "artisan", label: "Artisan / Trades" },
  { value: "fashion", label: "Fashion & Textiles" },
  { value: "energy", label: "Utilities & Energy" },
  { value: "waste", label: "Waste Management" },
  { value: "other", label: "Other" },
] as const;

/**
 * Maps each main category slug to the business types that are logically compatible.
 * When a category is selected, only matching types are enabled; the rest are greyed out.
 * Uses category slugs from the seed data (category-seed-data.ts).
 */
export const CATEGORY_TO_TYPES: Record<string, string[]> = {
  // 1. Commerce — shops, malls, supermarkets, commercial activity
  commerce: [
    "retail",
    "wholesale",
    "restaurant",
    "food_beverage",
    "entertainment",
    "fashion",
    "technology",
    "manufacturing",
    "service",
    "other",
  ],
  // 2. Tourism & Leisure — hotels, travel, events, recreation
  "tourism-leisure": [
    "hotel",
    "restaurant",
    "entertainment",
    "service",
    "food_beverage",
    "retail",
    "logistics",
    "sports",
    "other",
  ],
  // 3. Building & Construction — contractors, materials, trades
  "building-construction": [
    "construction",
    "artisan",
    "service",
    "manufacturing",
    "retail",
    "wholesale",
    "real_estate",
    "professional",
    "energy",
    "other",
  ],
  // 4. Automotive & Motorbike — dealers, repair, parts
  "automotive-motorbike": [
    "automotive",
    "retail",
    "service",
    "wholesale",
    "manufacturing",
    "logistics",
    "other",
  ],
  // 5. Finance — banking, insurance, fintech
  finance: [
    "finance",
    "professional",
    "service",
    "technology",
    "real_estate",
    "other",
  ],
  // 6. Entertainment & Sports — venues, bars, clubs, recreation
  "entertainment-sports": [
    "entertainment",
    "sports",
    "restaurant",
    "food_beverage",
    "hotel",
    "media",
    "retail",
    "service",
    "education",
    "other",
  ],
  // 7. Health — hospitals, clinics, pharmacies, wellness
  health: [
    "healthcare",
    "service",
    "professional",
    "retail",
    "sports",
    "beauty",
    "technology",
    "education",
    "manufacturing",
    "other",
  ],
  // 8. Real Estate — agencies, developers, property management
  "real-estate": [
    "real_estate",
    "construction",
    "professional",
    "service",
    "finance",
    "other",
  ],
  // 9. Communication & Advertising — agencies, media, events
  "communication-advertising": [
    "media",
    "technology",
    "professional",
    "service",
    "entertainment",
    "retail",
    "artisan",
    "other",
  ],
  // 10. IT & Internet — software, cloud, cybersecurity, e-commerce
  "it-internet": [
    "technology",
    "telecom",
    "service",
    "professional",
    "security",
    "retail",
    "education",
    "other",
  ],
  // 11. Accounting, Legal & Advisory
  "accounting-legal-advisory": [
    "professional",
    "finance",
    "service",
    "education",
    "other",
  ],
  // 12. Food & Beverage — restaurants, bakeries, catering, food shops
  "food-beverage": [
    "restaurant",
    "food_beverage",
    "retail",
    "wholesale",
    "service",
    "entertainment",
    "manufacturing",
    "agriculture",
    "artisan",
    "other",
  ],
  // 13. Animals & Pets — vet, pet shops, zoos, livestock
  "animals-pets": [
    "pets",
    "retail",
    "healthcare",
    "service",
    "agriculture",
    "wholesale",
    "entertainment",
    "professional",
    "education",
    "other",
  ],
  // 14. Artisans & Trades — carpenters, welders, painters
  "artisans-trades": [
    "artisan",
    "construction",
    "service",
    "manufacturing",
    "retail",
    "professional",
    "other",
  ],
  // 15. Home & Interior Design — furniture, decor, renovation
  "home-interior-design": [
    "retail",
    "artisan",
    "service",
    "manufacturing",
    "construction",
    "wholesale",
    "professional",
    "fashion",
    "other",
  ],
  // 16. Fashion & Textiles — clothing, shoes, accessories, tailoring
  "fashion-textiles": [
    "fashion",
    "retail",
    "manufacturing",
    "wholesale",
    "artisan",
    "service",
    "beauty",
    "other",
  ],
  // 17. Telecommunications — operators, ISPs, network equipment
  telecommunications: [
    "telecom",
    "technology",
    "retail",
    "service",
    "wholesale",
    "manufacturing",
    "professional",
    "other",
  ],
  // 18. Agri-Food & Agriculture — farming, crops, livestock, processing
  "agri-food-agriculture": [
    "agriculture",
    "food_beverage",
    "wholesale",
    "manufacturing",
    "retail",
    "logistics",
    "service",
    "pets",
    "other",
  ],
  // 19. Transportation & Logistics — shipping, taxi, airlines
  "transportation-logistics": [
    "logistics",
    "service",
    "automotive",
    "wholesale",
    "technology",
    "manufacturing",
    "other",
  ],
  // 20. Administration & Government — agencies, public safety
  "administration-government": [
    "government",
    "education",
    "service",
    "security",
    "professional",
    "healthcare",
    "other",
  ],
  // 21. Education & Training — schools, universities, e-learning
  "education-training": [
    "education",
    "technology",
    "professional",
    "service",
    "media",
    "sports",
    "entertainment",
    "other",
  ],
  // 22. Import & Export — international trade, customs
  "import-export": [
    "wholesale",
    "logistics",
    "service",
    "professional",
    "retail",
    "manufacturing",
    "agriculture",
    "food_beverage",
    "other",
  ],
  // 23. Professional Services — HR, consulting, brokerage
  "professional-services": [
    "professional",
    "finance",
    "service",
    "technology",
    "education",
    "real_estate",
    "other",
  ],
  // 24. Utilities & Energy — electricity, water, gas, renewables
  "utilities-energy": [
    "energy",
    "service",
    "construction",
    "manufacturing",
    "technology",
    "government",
    "other",
  ],
  // 25. Media & Entertainment — radio, TV, newspapers, music
  "media-entertainment": [
    "media",
    "entertainment",
    "technology",
    "service",
    "professional",
    "education",
    "retail",
    "other",
  ],
  // 26. Sports & Fitness — gyms, sports clubs, coaching
  "sports-fitness": [
    "sports",
    "healthcare",
    "retail",
    "entertainment",
    "service",
    "education",
    "professional",
    "food_beverage",
    "beauty",
    "other",
  ],
  // 27. Beauty & Personal Care — salons, spas, cosmetics
  "beauty-personal-care": [
    "beauty",
    "retail",
    "service",
    "healthcare",
    "wholesale",
    "professional",
    "manufacturing",
    "fashion",
    "other",
  ],
  // 28. Manufacturing & Industry — factories, industrial production
  "manufacturing-industry": [
    "manufacturing",
    "wholesale",
    "service",
    "technology",
    "logistics",
    "construction",
    "energy",
    "professional",
    "retail",
    "other",
  ],
  // 29. Wholesale & Distribution — wholesalers, distributors
  "wholesale-distribution": [
    "wholesale",
    "retail",
    "logistics",
    "manufacturing",
    "food_beverage",
    "service",
    "agriculture",
    "technology",
    "other",
  ],
  // 30. Security & Safety — guards, surveillance, fire safety
  "security-safety": [
    "security",
    "technology",
    "service",
    "professional",
    "retail",
    "manufacturing",
    "government",
    "other",
  ],
  // 31. Waste Management — collection, recycling, hazardous
  "waste-management": [
    "waste",
    "service",
    "energy",
    "manufacturing",
    "logistics",
    "construction",
    "government",
    "technology",
    "other",
  ],
  // 32. Miscellaneous Services — repair, rental, storage, misc
  "miscellaneous-services": [
    "service",
    "retail",
    "artisan",
    "professional",
    "logistics",
    "technology",
    "entertainment",
    "other",
  ],
};

/**
 * Resolves a CATEGORY_TO_TYPES key from a category's slug and/or name.
 * Tries multiple strategies: exact slug → derived slug from name → fuzzy name match.
 */
function resolveCategoryKey(
  slug?: string | null,
  name?: string | null,
): string | undefined {
  // 1. Direct slug match
  if (slug && CATEGORY_TO_TYPES[slug]) return slug;

  // 2. Lowercase slug match
  if (slug && CATEGORY_TO_TYPES[slug.toLowerCase()]) return slug.toLowerCase();

  // 3. Derive slug from category name (e.g. "Utilities & Energy" → "utilities-energy")
  if (name) {
    const derived = name
      .toLowerCase()
      .trim()
      .replace(/[&]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (CATEGORY_TO_TYPES[derived]) return derived;

    // 4. Try keeping "&" as "-and-" variant
    const derived2 = name
      .toLowerCase()
      .trim()
      .replace(/\s*&\s*/g, "-")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (CATEGORY_TO_TYPES[derived2]) return derived2;

    // 5. Partial match — check if any key is contained in the derived slug or vice-versa
    const keys = Object.keys(CATEGORY_TO_TYPES);
    for (const key of keys) {
      if (derived.includes(key) || key.includes(derived)) return key;
    }
  }

  return undefined;
}

/**
 * Get the allowed business types for a given category.
 * Pass the categories array and the selected categoryId.
 * Returns the full BUSINESS_TYPE_OPTIONS array with a `disabled` flag on each item.
 */
export function getBusinessTypesForCategory(
  categories: any[],
  selectedCategoryId: number | string | null | undefined,
): Array<{ value: string; label: string; disabled: boolean }> {
  if (!selectedCategoryId) {
    // No category selected → all enabled
    return BUSINESS_TYPE_OPTIONS.map((opt) => ({ ...opt, disabled: false }));
  }

  const catId =
    typeof selectedCategoryId === "string"
      ? parseInt(selectedCategoryId)
      : selectedCategoryId;
  if (!catId || isNaN(catId)) {
    return BUSINESS_TYPE_OPTIONS.map((opt) => ({ ...opt, disabled: false }));
  }

  // Find the selected category
  const selectedCat = categories.find((c: any) => c.id === catId);
  if (!selectedCat) {
    console.warn(
      `[BusinessType] Category ID ${catId} not found in categories array (${categories.length} items)`,
    );
    return BUSINESS_TYPE_OPTIONS.map((opt) => ({ ...opt, disabled: false }));
  }

  // Determine the main (parent) category
  let mainCat = selectedCat;
  if (selectedCat.parentId || selectedCat.parent_id) {
    const parentId = selectedCat.parentId || selectedCat.parent_id;
    const parent = categories.find((c: any) => c.id === parentId);
    if (parent) mainCat = parent;
  }

  // Resolve the mapping key using slug + name fallback
  const resolvedKey = resolveCategoryKey(mainCat.slug, mainCat.name);

  if (!resolvedKey) {
    console.warn(
      `[BusinessType] No mapping found for category "${mainCat.name}" (slug: "${mainCat.slug}")`,
    );
    return BUSINESS_TYPE_OPTIONS.map((opt) => ({ ...opt, disabled: false }));
  }

  const allowedTypes = CATEGORY_TO_TYPES[resolvedKey];

  return BUSINESS_TYPE_OPTIONS.map((opt) => ({
    ...opt,
    disabled: !allowedTypes.includes(opt.value),
  }));
}

interface GeoCoords {
  latitude: string;
  longitude: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

/**
 * Country-specific administrative division labels.
 * Adapts "Region" and "City" labels to match each country's real terminology,
 * like real-world address forms (e.g., Province for Canada, State for US, District for Ivory Coast).
 * Each label matches the REAL administrative division name used by that country.
 */
export const COUNTRY_ADMIN_LABELS: Record<
  string,
  { region: string; city: string; address: string }
> = {
  // ── North America ──
  CA: {
    region: "Province / Territory",
    city: "City",
    address: "Street Address",
  },
  US: { region: "State", city: "City", address: "Street Address" },
  MX: { region: "Estado", city: "Ciudad", address: "Dirección" },

  // ── West Africa ──
  CI: { region: "District", city: "Ville / Commune", address: "Rue / Adresse" },
  SN: { region: "Région", city: "Ville / Commune", address: "Rue / Adresse" },
  ML: { region: "Région", city: "Ville / Commune", address: "Rue / Adresse" },
  BF: { region: "Région", city: "Ville / Commune", address: "Rue / Adresse" },
  GN: { region: "Région", city: "Ville / Commune", address: "Rue / Adresse" },
  CM: { region: "Région", city: "Ville", address: "Rue / Adresse" },
  NG: { region: "State", city: "City / Town", address: "Street Address" },
  TG: { region: "Région", city: "Ville", address: "Rue / Adresse" },
  BJ: {
    region: "Département",
    city: "Commune / Ville",
    address: "Rue / Adresse",
  },
  NE: { region: "Région", city: "Ville / Commune", address: "Rue / Adresse" },

  // ── Central Africa ──
  CD: { region: "Province", city: "Ville", address: "Avenue / Rue" },
  CG: {
    region: "Département",
    city: "Ville / Commune",
    address: "Avenue / Rue",
  },
  GA: { region: "Province", city: "Ville", address: "Rue / Adresse" },

  // ── East Africa / Indian Ocean ──
  MG: { region: "Région", city: "Ville / Commune", address: "Adresse" },

  // ── North Africa ──
  MA: { region: "Région", city: "Ville", address: "Adresse" },
  DZ: { region: "Wilaya", city: "Commune / Ville", address: "Adresse" },
  TN: { region: "Gouvernorat", city: "Ville", address: "Adresse" },

  // ── Southern Africa ──
  ZA: { region: "Province", city: "City", address: "Street Address" },

  // ── Europe ──
  FR: { region: "Région", city: "Ville", address: "Adresse" },
  BE: { region: "Province", city: "Commune / Ville", address: "Adresse" },
  CH: { region: "Canton", city: "Ville", address: "Adresse" },
  DE: { region: "Bundesland", city: "Stadt", address: "Adresse" },
  GB: {
    region: "Nation / Region",
    city: "City / Town",
    address: "Street Address",
  },
  ES: { region: "Comunidad Autónoma", city: "Ciudad", address: "Dirección" },
  IT: { region: "Regione", city: "Città", address: "Indirizzo" },
  PT: { region: "Distrito", city: "Cidade", address: "Morada" },

  // ── Americas ──
  BR: { region: "Estado", city: "Cidade", address: "Endereço" },
  HT: { region: "Département", city: "Ville / Commune", address: "Adresse" },

  // ── Middle East ──
  AE: { region: "Emirate", city: "City / Area", address: "Street Address" },

  // ── Asia ──
  IN: { region: "State", city: "City", address: "Street Address" },
  JP: { region: "Region", city: "City", address: "Address" },
  CN: { region: "Province", city: "City", address: "Address" },
};

const DEFAULT_ADMIN_LABELS = {
  region: "Region / State",
  city: "City",
  address: "Street Address",
};

/**
 * Returns the correct admin-division labels for a given country code.
 * e.g., getAdminLabels("CA") → { region: "Province", city: "City", address: "Street Address" }
 */
export function getAdminLabels(countryCode?: string | null): {
  region: string;
  city: string;
  address: string;
} {
  if (!countryCode) return DEFAULT_ADMIN_LABELS;
  return (
    COUNTRY_ADMIN_LABELS[countryCode.toUpperCase()] || DEFAULT_ADMIN_LABELS
  );
}

/**
 * Detects user's current location using browser geolocation API.
 * Falls back to IP-based geolocation if browser API is denied/unavailable.
 * IP-based fallback also returns countryCode and city when available.
 */
export async function detectUserLocation(): Promise<GeoCoords | null> {
  // Try IP-based geolocation FIRST because it gives us country + city too
  const ipProviders = [
    {
      url: "/api/geo/ip",
      extract: (d: any) => ({
        latitude: String(d.latitude),
        longitude: String(d.longitude),
        countryCode: d.country_code || d.countryCode || "",
        region: d.region || d.region_name || d.state || "",
        city: d.city || "",
      }),
    },
    {
      url: "https://ipwho.is/",
      extract: (d: any) => ({
        latitude: String(d.latitude),
        longitude: String(d.longitude),
        countryCode: d.country_code || "",
        region: d.region || "",
        city: d.city || "",
      }),
    },
    {
      url: "https://ipapi.co/json/",
      extract: (d: any) => ({
        latitude: String(d.latitude),
        longitude: String(d.longitude),
        countryCode: d.country_code || "",
        region: d.region || "",
        city: d.city || "",
      }),
    },
  ];

  for (const provider of ipProviders) {
    try {
      const res = await fetch(provider.url, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          return provider.extract(data);
        }
      }
    } catch {
      // Try next provider
    }
  }

  // Fallback: browser geolocation (gives accurate lat/lng but no country/city)
  const browserResult = await new Promise<GeoCoords | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true },
    );
  });

  return browserResult;
}

interface GeolocationFieldsProps {
  latitude: string;
  longitude: string;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  /** Called when auto-detect resolves a country code (ISO 2-letter) */
  onCountryDetected?: (countryCode: string) => void;
  /** Called when auto-detect resolves a region/state name */
  onRegionDetected?: (region: string) => void;
  /** Called when auto-detect resolves a city name */
  onCityDetected?: (city: string) => void;
  /** Optional custom className for the wrapper */
  className?: string;
  /** Dark theme variant (used in some dialogs) */
  dark?: boolean;
}

/**
 * Reusable Latitude/Longitude fields with auto-detect and location tip.
 * Drop this into any CRUD form that needs lat/lng input.
 */
export function GeolocationFields({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  onCountryDetected,
  onRegionDetected,
  onCityDetected,
  className = "",
  dark = false,
}: GeolocationFieldsProps) {
  const [detecting, setDetecting] = useState(false);

  const handleDetectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const coords = await detectUserLocation();
      if (coords) {
        onLatitudeChange(coords.latitude);
        onLongitudeChange(coords.longitude);
        if (coords.countryCode && onCountryDetected) {
          onCountryDetected(coords.countryCode.toUpperCase());
        }
        if (coords.region && onRegionDetected) {
          onRegionDetected(coords.region);
        }
        if (coords.city && onCityDetected) {
          onCityDetected(coords.city);
        }
        toast({
          title: "Location Detected",
          description: `Coordinates: ${Number(coords.latitude).toFixed(6)}, ${Number(coords.longitude).toFixed(6)}${coords.region ? ` · ${coords.region}` : ""}${coords.city ? ` · ${coords.city}` : ""}${coords.countryCode ? ` (${coords.countryCode.toUpperCase()})` : ""}`,
        });
      } else {
        toast({
          title: "Could not detect location",
          description:
            "Please allow location access in your browser, or use the 📍 Location button in the top banner to copy your coordinates.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Location Detection Failed",
        description:
          "Try using the 📍 Location button in the top navigation bar to find your coordinates.",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  }, [
    onLatitudeChange,
    onLongitudeChange,
    onCountryDetected,
    onRegionDetected,
    onCityDetected,
  ]);

  const inputClass = dark
    ? "bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
    : "";
  const labelClass = dark ? "text-slate-200" : "";
  const tipBg = dark
    ? "bg-blue-900/30 border-blue-700/50"
    : "bg-blue-50 border-blue-200";
  const tipText = dark ? "text-blue-300" : "text-blue-700";

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={`flex items-center gap-2 ${labelClass}`}>
            <MapPin className="h-4 w-4" /> Latitude
          </Label>
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onLatitudeChange(e.target.value)}
            placeholder="e.g., 5.3599"
            className={inputClass}
          />
        </div>
        <div>
          <Label className={`flex items-center gap-2 ${labelClass}`}>
            <MapPin className="h-4 w-4" /> Longitude
          </Label>
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onLongitudeChange(e.target.value)}
            placeholder="e.g., -3.9746"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetectLocation}
          disabled={detecting}
          className="gap-2 text-xs"
        >
          {detecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          {detecting ? "Detecting..." : "Auto-detect my location"}
        </Button>
      </div>

      {!latitude && !longitude && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${tipBg} ${tipText}`}
        >
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Tip:</strong> Don't know your coordinates? Click{" "}
            <strong>"Auto-detect my location"</strong> above, or use the{" "}
            <strong>📍 Location</strong> button in the top navigation bar to
            view and copy your latitude &amp; longitude.
          </span>
        </div>
      )}
    </div>
  );
}
