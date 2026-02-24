// Map page identifiers to category slugs present in business_categories
export const categoryMap: Record<string, string | null> = {
  commerce: "retail",
  hotellerie: "hotels",
  batiment: null,
  finances: null,
  automobile: null,
  divertissement: "restaurants",
};

export function getCategoryEndpointFor(
  pageKey: string,
  apiBase: string,
  queryParams: string
) {
  const slug = categoryMap[pageKey];
  if (slug) return `${apiBase}/api/category/${slug}/search?${queryParams}`;
  return `${apiBase}/api/business/search?${queryParams}`;
}
