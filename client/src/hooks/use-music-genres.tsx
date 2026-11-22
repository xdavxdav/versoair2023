import { useQuery } from "@tanstack/react-query";
import { SelectItem } from "@/components/ui/select";

export interface MusicGenreOption {
  slug: string;
  name: string;
  kind: "family" | "style";
  parent: string | null;
  countries: string[];
}

export function useMusicGenres(country?: string) {
  const qs = country ? `?country=${encodeURIComponent(country)}` : "";
  return useQuery<MusicGenreOption[]>({
    queryKey: ["/api/music-genres", country ?? "all"],
    queryFn: async () => {
      const res = await fetch(`/api/music-genres${qs}`);
      if (!res.ok) throw new Error("Failed to load genres");
      return (await res.json()).data as MusicGenreOption[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

/** Options for a Radix Select, from the canonical taxonomy. Keeps a legacy current value selectable. */
export function GenreSelectItems({ current }: { current?: string }) {
  const { data = [] } = useMusicGenres();
  const known = data.some((g) => g.name === current);
  return (
    <>
      {current && !known && <SelectItem value={current}>{current}</SelectItem>}
      {data.map((g) => (
        <SelectItem key={g.slug} value={g.name}>
          {g.name}
        </SelectItem>
      ))}
    </>
  );
}

/** <datalist> for free-text genre inputs; pair with list="music-genre-options". */
export function GenreDatalist() {
  const { data = [] } = useMusicGenres();
  return (
    <datalist id="music-genre-options">
      {data.map((g) => (
        <option key={g.slug} value={g.name} />
      ))}
    </datalist>
  );
}
