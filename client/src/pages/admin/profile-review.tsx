import { useEffect, useState } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  id: number;
  name: string;
  displayName?: string | null;
  category?: string | null;
  bio?: string | null;
  cityName?: string | null;
  countryCode?: string | null;
  status?: string | null;
  verificationStatus?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string | null;
}

export default function ProfileReviewPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/admin/profiles/pending");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Impossible de charger les profils");
      setProfiles(data.data || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Erreur de chargement",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const review = async (profileId: number, action: "approve" | "reject") => {
    setBusyId(profileId);
    setError("");
    try {
      const response = await authenticatedFetch(
        `/api/admin/profiles/${profileId}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            notes: notes[profileId] || undefined,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action impossible");
      setProfiles((current) =>
        current.filter((profile) => profile.id !== profileId),
      );
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Action impossible",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            Verso Air Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Profils artisan à vérifier
          </h1>
          <p className="mt-2 text-slate-400">
            Validez les profils avant leur publication dans l'annuaire public.
          </p>
        </header>

        {error && (
          <p className="rounded-lg bg-red-500/10 p-3 text-red-300">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : profiles.length === 0 ? (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardContent className="p-8 text-center text-slate-400">
              Aucun profil en attente de validation.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="border-white/10 bg-white/5 text-white"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex gap-3">
                    {profile.profileImageUrl ? (
                      <img
                        src={profile.profileImageUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                        <Eye className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {profile.displayName || profile.name}
                      </CardTitle>
                      <p className="text-sm text-slate-400">
                        {[
                          profile.category,
                          profile.cityName,
                          profile.countryCode,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Informations à compléter"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs text-amber-300">
                    {profile.status || "PENDING"}
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="min-h-12 text-sm leading-relaxed text-slate-300">
                    {profile.bio || "Aucune biographie fournie."}
                  </p>
                  <Textarea
                    value={notes[profile.id] || ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [profile.id]: event.target.value,
                      }))
                    }
                    placeholder="Note interne facultative"
                    className="border-white/10 bg-black/20 text-white placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className="border-red-400/30 text-red-300 hover:bg-red-500/10"
                      onClick={() => review(profile.id, "reject")}
                      disabled={busyId === profile.id}
                    >
                      <X className="mr-2 h-4 w-4" /> Rejeter
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => review(profile.id, "approve")}
                      disabled={busyId === profile.id}
                    >
                      <Check className="mr-2 h-4 w-4" /> Approuver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
