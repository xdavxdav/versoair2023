import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Loader2,
  MapPin,
  Palette,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ArtisanProfile {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  bio: string | null;
  cityName: string | null;
  countryCode: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  slug: string | null;
  metadata: Record<string, unknown>;
}

export default function ArtAndArtisanat() {
  const [profiles, setProfiles] = useState<ArtisanProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadProfiles = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          accountType: "artisan",
          limit: "60",
        });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/profiles/search?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load creators");
        setProfiles(data.data || []);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load creators",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(loadProfiles, query ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fbf8f3] via-white to-violet-50/40 text-slate-900">
      <section className="border-b border-violet-100 bg-gradient-to-br from-violet-950 via-fuchsia-950 to-amber-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-200">
              <Sparkles className="h-4 w-4" /> Art & Artisanat
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Meet the makers behind the work.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-violet-100">
              Discover verified creators, their techniques, and the stories
              carried by each craft. For prices and purchases, continue to the
              Marché.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace">
                <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                  Visit Marché <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/apply">
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  Present your craft
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
              Creator discovery
            </p>
            <h2 className="mt-2 text-3xl font-bold">The craft community</h2>
            <p className="mt-2 text-slate-500">
              Approved profiles, cultural context, and direct paths to the work.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators or techniques"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-violet-300 focus:ring-2"
            />
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        )}
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading creators...
          </div>
        ) : profiles.length === 0 ? (
          <Card className="border-violet-100 bg-white/80">
            <CardContent className="flex flex-col items-center p-12 text-center">
              <Award className="h-12 w-12 text-violet-300" />
              <h3 className="mt-4 text-xl font-semibold">
                The collection is beginning
              </h3>
              <p className="mt-2 max-w-md text-slate-500">
                No approved creators match this search yet. Start your own
                profile and bring your work into the collection.
              </p>
              <Link href="/apply">
                <Button className="mt-6 bg-violet-700 hover:bg-violet-800">
                  Create a creator profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="group h-full overflow-hidden border-violet-100 bg-white transition-all hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl">
                  <div className="relative h-36 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50">
                    {profile.coverImageUrl && (
                      <img
                        src={profile.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-5 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white bg-violet-100">
                      {profile.profileImageUrl ? (
                        <img
                          src={profile.profileImageUrl}
                          alt=""
                          className="h-16 w-16 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center text-violet-600">
                          <Palette />
                        </div>
                      )}
                    </div>
                  </div>
                  <CardHeader className="pt-12">
                    <CardTitle>{profile.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-violet-700">
                      <Palette className="h-3.5 w-3.5" />{" "}
                      {profile.category || "Craft professional"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {profile.bio ||
                        profile.description ||
                        "A maker sharing craft, technique, and cultural knowledge."}
                    </p>
                    {(profile.cityName || profile.countryCode) && (
                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-violet-600" />{" "}
                        {[profile.cityName, profile.countryCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <Link
                        href={
                          profile.slug
                            ? `/profiles/${profile.slug}`
                            : "/artisans"
                        }
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                        >
                          View story
                        </Button>
                      </Link>
                      <Link href="/marketplace">
                        <Button
                          className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                          aria-label={`Browse work from ${profile.name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
