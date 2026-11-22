export interface GenreSource {
  url: string;
  evidence: string;
}

export interface GenreSeed {
  slug: string;
  name: string;
  kind: "family" | "style";
  parent: string | null;
  countries: readonly string[];
  aliases: readonly string[];
  wikidata?: string;
  sources: readonly GenreSource[];
}
