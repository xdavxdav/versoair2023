import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gamepad2,
  Music,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  CASUAL_ARCADE_GAME_IDS,
  MUSIC_ARCADE_GAME_IDS,
  type AllArcadeGameId,
  type ArcadeGamesAdminConfig,
  type CasualArcadeGameId,
  type CustomArcadeQuestion,
  type CustomQuestionCategory,
} from "@shared/arcade-games";
import { authenticatedFetch } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ArcadeAdminOverview {
  config: ArcadeGamesAdminConfig;
  casualGames: Record<
    CasualArcadeGameId,
    { id: CasualArcadeGameId; name: string; tagline: string }
  >;
  musicGames: Record<
    string,
    { id: string; name: string; tagline: string; backendType: string }
  >;
  casualStats: Record<
    string,
    { runsCount: number; playersCount: number; topScore: number }
  >;
  musicStats: Record<
    string,
    { totalMatches: number; completedMatches: number }
  >;
  recentScores: Array<{
    id: number;
    game: string;
    userId: number;
    displayName: string;
    score: number;
    level: number;
    durationMs: number;
    createdAt: string;
  }>;
  customQuestions: CustomArcadeQuestion[];
  builtinQuestionCounts: Record<CustomQuestionCategory, number>;
}

const OVERVIEW_QUERY_KEY = ["/api/arcade/admin/overview"];

const CATEGORY_LABELS: Record<CustomQuestionCategory, string> = {
  lyrics: "Lyrics Challenge",
  trivia: "Music Trivia Duel",
  guess: "Name That Track / Artist",
  decade: "Decade Dash",
};

async function fetchArcadeOverview(): Promise<ArcadeAdminOverview> {
  const res = await authenticatedFetch("/api/arcade/admin/overview");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function ArcadeAdminSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [savingGameId, setSavingGameId] = useState<string | null>(null);
  const [maintenanceDraft, setMaintenanceDraft] = useState<string | null>(null);
  const [savingMessage, setSavingMessage] = useState(false);

  // Custom question form state
  const [qCategory, setQCategory] = useState<CustomQuestionCategory>("lyrics");
  const [qText, setQText] = useState("");
  const [opt0, setOpt0] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [qAnswer, setQAnswer] = useState<0 | 1 | 2 | 3>(0);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const overviewQuery = useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: fetchArcadeOverview,
  });

  const overview = overviewQuery.data;
  const currentMessage =
    maintenanceDraft !== null
      ? maintenanceDraft
      : overview?.config.maintenanceMessage ?? "";

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["/api/arcade/config"] }),
    ]);
  };

  const toggleGame = async (gameId: AllArcadeGameId, nextEnabled: boolean) => {
    setSavingGameId(gameId);
    try {
      const res = await authenticatedFetch("/api/arcade/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledGames: { [gameId]: nextEnabled } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec de mise à jour");
      }
      await refreshAll();
      toast({
        title: nextEnabled ? "Jeu activé" : "Jeu mis en pause",
        description: `Le changement est actif sur /arcade.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Mise à jour impossible",
        variant: "destructive",
      });
    } finally {
      setSavingGameId(null);
    }
  };

  const saveMaintenanceMessage = async () => {
    setSavingMessage(true);
    try {
      const res = await authenticatedFetch("/api/arcade/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMessage: currentMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec d'enregistrement");
      }
      setMaintenanceDraft(null);
      await refreshAll();
      toast({
        title: "Message enregistré",
        description: currentMessage
          ? "Bannière visible sur /arcade."
          : "Bannière effacée.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Enregistrement impossible",
        variant: "destructive",
      });
    } finally {
      setSavingMessage(false);
    }
  };

  const deleteScore = async (scoreId: number) => {
    try {
      const res = await authenticatedFetch(`/api/arcade/admin/scores/${scoreId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Suppression impossible");
      await refreshAll();
      toast({ title: "Score supprimé" });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Suppression impossible",
        variant: "destructive",
      });
    }
  };

  const resetLeaderboard = async (gameId: CasualArcadeGameId, gameName: string) => {
    if (
      !window.confirm(
        `Réinitialiser tout le classement de ${gameName} ? Cette action est définitive.`,
      )
    ) {
      return;
    }
    try {
      const res = await authenticatedFetch(
        `/api/arcade/admin/leaderboard/${gameId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Réinitialisation impossible");
      await refreshAll();
      toast({
        title: "Classement réinitialisé",
        description: `${data.deletedCount ?? 0} score(s) supprimé(s) pour ${gameName}.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Action impossible",
        variant: "destructive",
      });
    }
  };

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingQuestion(true);
    try {
      const res = await authenticatedFetch("/api/arcade/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: qCategory,
          q: qText,
          options: [opt0, opt1, opt2, opt3],
          answer: qAnswer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Ajout impossible");
      }
      setQText("");
      setOpt0("");
      setOpt1("");
      setOpt2("");
      setOpt3("");
      setQAnswer(0);
      await refreshAll();
      toast({
        title: "Question ajoutée",
        description: `Ajoutée au jeu ${CATEGORY_LABELS[qCategory]}.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Vérifiez les champs",
        variant: "destructive",
      });
    } finally {
      setAddingQuestion(false);
    }
  };

  const removeQuestion = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/arcade/admin/questions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Suppression impossible");
      await refreshAll();
      toast({ title: "Question supprimée" });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Suppression impossible",
        variant: "destructive",
      });
    }
  };

  if (overviewQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Chargement du contrôle Arcade...
        </CardContent>
      </Card>
    );
  }

  if (overviewQuery.isError || !overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Arcade &amp; Games
          </CardTitle>
          <CardDescription>
            {overviewQuery.error instanceof Error
              ? overviewQuery.error.message
              : "Impossible de charger la configuration Arcade."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => overviewQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-purple-600" />
            Arcade &amp; Games Control
          </h2>
          <p className="text-sm text-muted-foreground">
            Activez ou mettez en pause chaque jeu en direct sur <code>/arcade</code>, modérez les classements et enrichissez les questions Lyrics &amp; Trivia (mode texte, aucun téléchargement audio requis).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshAll()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualiser
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open("/arcade", "_blank", "noopener")}
          >
            Ouvrir /arcade
          </Button>
        </div>
      </div>

      {/* Global Arcade Maintenance / Announcement Banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bannière / message d&apos;annonce Arcade</CardTitle>
          <CardDescription>
            Optionnel : affiché en haut de /arcade (ex. tournoi du week-end ou maintenance ciblée). Laissez vide pour masquer.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            value={currentMessage}
            onChange={(e) => setMaintenanceDraft(e.target.value)}
            placeholder="Ex: Tournoi Snake ce soir à 20h • Sans crédits"
            maxLength={240}
          />
          <Button
            onClick={saveMaintenanceMessage}
            disabled={savingMessage}
            className="shrink-0"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {savingMessage ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {/* Casual Games Toggles & Leaderboard Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Jeux classiques (Snake, Tetris, Brick Ball, Xensia)
          </CardTitle>
          <CardDescription>
            Jeux gratuits avec classement points uniquement. Désactiver un jeu bloque immédiatement les nouvelles parties et les soumissions de score.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CASUAL_ARCADE_GAME_IDS.map((gameId) => {
            const meta = overview.casualGames[gameId];
            const stats = overview.casualStats[gameId] ?? {
              runsCount: 0,
              playersCount: 0,
              topScore: 0,
            };
            const enabled = overview.config.enabledGames[gameId] !== false;
            return (
              <div
                key={gameId}
                className="rounded-lg border p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{meta.name}</span>
                      <Badge variant={enabled ? "default" : "secondary"}>
                        {enabled ? "Actif" : "En pause"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {meta.tagline}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={savingGameId === gameId}
                    onCheckedChange={(checked) => toggleGame(gameId, checked)}
                    aria-label={`Activer ${meta.name}`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
                  <span>
                    {stats.runsCount} parties • {stats.playersCount} joueurs • Top{" "}
                    <strong>{stats.topScore.toLocaleString()} pts</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    disabled={stats.runsCount === 0}
                    onClick={() => resetLeaderboard(gameId, meta.name)}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset classement
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Music Games Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="h-4 w-4 text-purple-500" />
            Duels Musicaux &amp; Lyrics Challenge
          </CardTitle>
          <CardDescription>
            Quiz musicaux textuels (aucun téléchargement de chanson requis). Les questions personnalisées ajoutées ci-dessous sont automatiquement mélangées dans la banque du jeu.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MUSIC_ARCADE_GAME_IDS.map((gameId) => {
            const meta = overview.musicGames[gameId];
            const stats =
              overview.musicStats[meta.backendType] ??
              overview.musicStats[gameId] ?? {
                totalMatches: 0,
                completedMatches: 0,
              };
            const enabled = overview.config.enabledGames[gameId] !== false;
            return (
              <div
                key={gameId}
                className="rounded-lg border p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{meta.name}</span>
                      <Badge variant={enabled ? "default" : "secondary"}>
                        {enabled ? "Actif" : "En pause"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {meta.tagline}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={savingGameId === gameId}
                    onCheckedChange={(checked) => toggleGame(gameId, checked)}
                    aria-label={`Activer ${meta.name}`}
                  />
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {stats.totalMatches} matchs ({stats.completedMatches} terminés)
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Custom Lyrics & Trivia Question Bank */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            Banque de questions Lyrics &amp; Trivia
          </CardTitle>
          <CardDescription>
            Questions intégrées : Lyrics ({overview.builtinQuestionCounts.lyrics}), Trivia ({overview.builtinQuestionCounts.trivia}), Name That Track / Artist ({overview.builtinQuestionCounts.guess}), Decade ({overview.builtinQuestionCounts.decade}). Ajoutez vos propres paroles ou quiz ici sans aucun fichier audio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={addQuestion} className="space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="arcade-q-category">Jeu cible</Label>
                <select
                  id="arcade-q-category"
                  value={qCategory}
                  onChange={(e) =>
                    setQCategory(e.target.value as CustomQuestionCategory)
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="lyrics">Lyrics Challenge (Complète les paroles)</option>
                  <option value="trivia">Music Trivia Duel</option>
                  <option value="guess">Name That Track / Artist Showdown</option>
                  <option value="decade">Decade Dash</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="arcade-q-text">Question ou extrait de paroles</Label>
                <Input
                  id="arcade-q-text"
                  className="mt-1"
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder={`Ex: Complétez : "I've been chasing the ____ all night..."`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { idx: 0 as const, val: opt0, set: setOpt0 },
                { idx: 1 as const, val: opt1, set: setOpt1 },
                { idx: 2 as const, val: opt2, set: setOpt2 },
                { idx: 3 as const, val: opt3, set: setOpt3 },
              ].map((choice) => (
                <div key={choice.idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={qAnswer === choice.idx}
                    onChange={() => setQAnswer(choice.idx)}
                    aria-label={`Bonne réponse ${String.fromCharCode(65 + choice.idx)}`}
                  />
                  <Input
                    required
                    value={choice.val}
                    onChange={(e) => choice.set(e.target.value)}
                    placeholder={`Choix ${String.fromCharCode(65 + choice.idx)}${qAnswer === choice.idx ? " (bonne réponse)" : ""}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Sélectionnez le bouton radio correspondant à la bonne réponse.
              </p>
              <Button type="submit" disabled={addingQuestion}>
                <Plus className="mr-1.5 h-4 w-4" />
                {addingQuestion ? "Ajout..." : "Ajouter la question"}
              </Button>
            </div>
          </form>

          {overview.customQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune question personnalisée ajoutée pour l&apos;instant — les questions intégrées sont actives.
            </p>
          ) : (
            <div className="space-y-2">
              {overview.customQuestions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {CATEGORY_LABELS[item.category]}
                      </Badge>
                      <span className="text-sm font-medium">{item.q}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.options.map((opt, idx) => (
                        <span
                          key={idx}
                          className={
                            idx === item.answer
                              ? "font-semibold text-emerald-600"
                              : ""
                          }
                        >
                          {String.fromCharCode(65 + idx)}. {opt}
                          {idx === item.answer ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeQuestion(item.id)}
                    aria-label="Supprimer cette question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Casual Leaderboard Moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modération des scores récents</CardTitle>
          <CardDescription>
            Supprimez un score suspect ou de test à tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun score enregistré pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Jeu</th>
                    <th className="py-2 pr-3">Joueur</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Niveau</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentScores.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-medium">
                        {overview.casualGames[row.game as CasualArcadeGameId]?.name ??
                          row.game}
                      </td>
                      <td className="py-2 pr-3">{row.displayName}</td>
                      <td className="py-2 pr-3 font-mono font-semibold">
                        {row.score.toLocaleString()} pts
                      </td>
                      <td className="py-2 pr-3">Niv. {row.level}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => deleteScore(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
