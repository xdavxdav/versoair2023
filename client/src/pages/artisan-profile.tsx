import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Profile {
  name: string;
  category?: string | null;
  bio?: string | null;
  description?: string | null;
  cityName?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  website?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
}

export default function ArtisanProfilePage() {
  const [, params] = useRoute("/profiles/:slug");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.slug) return;
    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/profiles/${encodeURIComponent(params.slug)}`,
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Profile not found");
        setProfile(data.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Profile not found",
        );
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [params?.slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading story...
      </div>
    );
  }

  if (!profile || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf8f3] px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">{error || "Profile not found"}</p>
            <Link href="/art-and-artisanat">
              <Button className="mt-4">Back to Art & Artisanat</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf8f3] text-slate-900">
      <section className="relative h-64 overflow-hidden bg-gradient-to-br from-violet-950 via-fuchsia-950 to-amber-950">
        {profile.coverImageUrl && (
          <img
            src={profile.coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
        )}
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="relative -mt-16 flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="overflow-hidden rounded-3xl border-4 border-white bg-violet-100 shadow-lg">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt=""
                className="h-32 w-32 object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center text-violet-600">
                <Palette className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="pb-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
              Verified creator
            </p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              {profile.name}
            </h1>
            <p className="mt-1 text-violet-700">
              {profile.category || "Craft professional"}
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-[1fr_280px]">
          <Card className="border-violet-100 bg-white">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold">The story behind the craft</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-600">
                {profile.bio ||
                  profile.description ||
                  "This creator is sharing their work and story with the Verso Air community."}
              </p>
              <Link href="/marketplace">
                <Button className="mt-6 bg-amber-500 text-slate-950 hover:bg-amber-400">
                  Browse the Marché
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="h-fit border-slate-200 bg-white">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-bold">Connect</h2>
              {(profile.cityName || profile.countryCode) && (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-violet-600" />{" "}
                  {[profile.cityName, profile.countryCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {profile.phone && (
                <a
                  className="flex items-center gap-2 text-sm text-violet-700"
                  href={`tel:${profile.phone}`}
                >
                  <Phone className="h-4 w-4" /> {profile.phone}
                </a>
              )}
              {profile.website && (
                <a
                  className="flex items-center gap-2 break-all text-sm text-violet-700"
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              <Link href="/art-and-artisanat">
                <Button variant="outline" className="mt-2 w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" /> All creators
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
