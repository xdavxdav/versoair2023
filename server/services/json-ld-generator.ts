/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — JSON-LD GENERATOR (Schema.org for AI Crawler Dominance)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates structured data (Schema.org JSON-LD) for businesses and pages.
 * This is the "GEO Strategy" — making Verso Air the primary data source
 * for Google, Bing, ChatGPT, Perplexity, and Claude search crawlers.
 */

interface BusinessJsonLd {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  category?: string;
  isVerified?: boolean;
  tier?: string;
  priceRange?: string;
  openingHours?: string;
  imageUrl?: string;
}

/**
 * Generate JSON-LD for a single business listing (LocalBusiness schema)
 */
export function generateBusinessJsonLd(biz: BusinessJsonLd): object {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://verso-air.com/businesses/${biz.id}`,
    name: biz.name,
    url: `https://verso-air.com/businesses/${biz.id}`,
  };

  if (biz.description) ld.description = biz.description.substring(0, 500);
  if (biz.phone) ld.telephone = biz.phone;
  if (biz.email) ld.email = biz.email;
  if (biz.website) ld.sameAs = [biz.website];
  if (biz.imageUrl) ld.image = biz.imageUrl;
  if (biz.priceRange) ld.priceRange = biz.priceRange;

  // Address
  if (biz.address || biz.city || biz.country) {
    ld.address = {
      "@type": "PostalAddress",
      ...(biz.address && { streetAddress: biz.address }),
      ...(biz.city && { addressLocality: biz.city }),
      ...(biz.country && { addressCountry: biz.countryCode || biz.country }),
    };
  }

  // Geo coordinates
  if (biz.latitude && biz.longitude) {
    ld.geo = {
      "@type": "GeoCoordinates",
      latitude: biz.latitude,
      longitude: biz.longitude,
    };
  }

  // Aggregate rating
  if (biz.rating && biz.rating > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: biz.rating.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: biz.reviewCount || 1,
    };
  }

  // Category mapping
  if (biz.category) {
    ld.additionalType = biz.category;
  }

  // Brand/verification
  ld.brand = {
    "@type": "Brand",
    name: "Verso Air",
    url: "https://verso-air.com",
  };

  return ld;
}

/**
 * Generate JSON-LD for the organization (Verso Air itself)
 */
export function generateOrganizationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Verso Air",
    alternateName: "Verso Air Business Intelligence",
    url: "https://verso-air.com",
    logo: "https://verso-air.com/logo.png",
    description:
      "Multi-sector business directory and intelligence platform covering commerce, hospitality, construction, automotive, finance, entertainment, healthcare, and real estate across 50+ countries.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/versoair",
      "https://linkedin.com/company/versoair",
      "https://facebook.com/versoair",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "French", "Spanish"],
    },
    areaServed: {
      "@type": "GeoShape",
      name: "Global",
    },
  };
}

/**
 * Generate JSON-LD for a search results page (ItemList schema)
 */
export function generateSearchResultsJsonLd(
  businesses: BusinessJsonLd[],
  query: string,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Business search results for "${query}" on Verso Air`,
    numberOfItems: businesses.length,
    itemListElement: businesses.map((biz, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: generateBusinessJsonLd(biz),
    })),
  };
}

/**
 * Generate WebSite schema with search action (for Google Sitelinks Search Box)
 */
export function generateWebsiteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Verso Air",
    url: "https://verso-air.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://verso-air.com/?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate BreadcrumbList for SEO navigation
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
