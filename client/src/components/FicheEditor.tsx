import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/LanguageSwitcher";
import { apiRequest } from "@/lib/queryClient";
import {
  FicheSectionId,
  SECTION_LABELS,
  SECTOR_LABELS,
  getVisibleSections,
  inferSector,
  normalizeTier,
} from "@/lib/fiche-technique-config";
import {
  applyHoursToWeekdays,
  ficheToForm,
  formToPayload,
  type FicheForm,
} from "@/lib/fiche-editor-form";
import {
  FICHE_LIMITS,
  FICHE_SECTORS,
  SOCIAL_NETWORKS,
  WEEKDAYS,
  type Fiche,
} from "@shared/fiche-technique";

const TIMEZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Tunis",
];

const DAY_LABELS = {
  monday: { en: "Monday", fr: "Lundi" },
  tuesday: { en: "Tuesday", fr: "Mardi" },
  wednesday: { en: "Wednesday", fr: "Mercredi" },
  thursday: { en: "Thursday", fr: "Jeudi" },
  friday: { en: "Friday", fr: "Vendredi" },
  saturday: { en: "Saturday", fr: "Samedi" },
  sunday: { en: "Sunday", fr: "Dimanche" },
} as const;

const NETWORK_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600";
const fieldClass = "border-slate-300 bg-white text-slate-900";

// apiRequest rejects with "<status>: <body>"; show the server's own message.
function errorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : "";
  const body = raw.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // not JSON; fall through
  }
  return body && body.length < 200 ? body : fallback;
}

interface FicheEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: { id: number | string; name: string; tier?: string | null; [key: string]: any };
  onSaved: () => void;
}

export function FicheEditor({
  open,
  onOpenChange,
  business,
  onSaved,
}: FicheEditorProps) {
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const t = (en: string, fr: string) => (isFr ? fr : en);

  const [form, setForm] = useState<FicheForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isError, error: loadError } = useQuery<Fiche>({
    queryKey: ["business-fiche", String(business.id)],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/businesses/${business.id}/fiche`);
      return (await res.json()).data as Fiche;
    },
  });

  useEffect(() => {
    if (open && data) setForm(ficheToForm(data));
    if (!open) {
      setForm(null);
      setError(null);
    }
  }, [open, data]);

  const set = <K extends keyof FicheForm>(key: K, value: FicheForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const tier = normalizeTier(business.tier);
  const sector = inferSector(
    business.category_name || business.categoryName || "",
    form?.sector,
  );
  const visible = getVisibleSections(tier, sector);
  const locked = (id: FicheSectionId) => !visible.includes(id);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(
        "PUT",
        `/api/businesses/${business.id}/fiche`,
        formToPayload(form),
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e, t("Could not save the fiche.", "Impossible d'enregistrer la fiche.")));
    } finally {
      setSaving(false);
    }
  };

  const fieldset = (id: FicheSectionId, title: string, children: React.ReactNode) => (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-amber-800">
        {title}
      </legend>
      {locked(id) && (
        <p className="text-xs text-slate-700">
          {t(
            "Saved now, shown on your page once your plan includes this section.",
            "Enregistré maintenant, affiché sur votre page quand votre forfait inclut cette section.",
          )}
        </p>
      )}
      {children}
    </fieldset>
  );

  const area = (
    key: keyof FicheForm,
    label: string,
    max: number,
    rows = 3,
    hint?: string,
  ) => {
    const id = `fiche-${String(key)}`;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-slate-800">
          {label}
        </Label>
        <Textarea
          id={id}
          rows={rows}
          maxLength={max}
          className={fieldClass}
          value={form ? String(form[key] ?? "") : ""}
          onChange={(e) => set(key, e.target.value as never)}
        />
        {hint && <p className="text-xs text-slate-700">{hint}</p>}
      </div>
    );
  };

  const listHint = t("One per line.", "Une entrée par ligne.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {t("Edit technical profile", "Modifier la fiche technique")}
          </DialogTitle>
          <DialogDescription className="text-slate-700">
            {business.name}
          </DialogDescription>
        </DialogHeader>

        {isError && (
          <p role="alert" className="text-sm text-rose-800">
            {errorMessage(
              loadError,
              t("Could not load the fiche.", "Impossible de charger la fiche."),
            )}
          </p>
        )}
        {!form && !isError && (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("Loading…", "Chargement…")}
          </div>
        )}

        {form && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {fieldset(
              "basic",
              t("Basics and opening hours", "Informations de base et horaires"),
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fiche-sector" className="text-slate-800">
                      {t("Sector", "Secteur")}
                    </Label>
                    <select
                      id="fiche-sector"
                      className={selectClass}
                      value={form.sector}
                      onChange={(e) => set("sector", e.target.value)}
                    >
                      <option value="">
                        {t("Detect from category", "Détecter selon la catégorie")}
                      </option>
                      {FICHE_SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {SECTOR_LABELS[s][isFr ? "fr" : "en"]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fiche-timezone" className="text-slate-800">
                      {t("Timezone of your hours", "Fuseau horaire de vos horaires")}
                    </Label>
                    <select
                      id="fiche-timezone"
                      className={selectClass}
                      value={form.timezone}
                      onChange={(e) => set("timezone", e.target.value)}
                    >
                      <option value="">{t("Not set", "Non défini")}</option>
                      {(TIMEZONES.includes(form.timezone) || !form.timezone
                        ? TIMEZONES
                        : [form.timezone, ...TIMEZONES]
                      ).map((zone) => (
                        <option key={zone} value={zone}>
                          {zone.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-700">
                      {t(
                        "Needed to show an accurate “Open now” badge.",
                        "Nécessaire pour afficher un badge « Ouvert » exact.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {t("Opening hours", "Horaires d'ouverture")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-800"
                      onClick={() =>
                        set("opening_hours", applyHoursToWeekdays(form.opening_hours))
                      }
                    >
                      {t("Copy Monday to Friday", "Copier lundi au vendredi")}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <Label
                          htmlFor={`fiche-hours-${day}`}
                          className="w-24 shrink-0 text-slate-800"
                        >
                          {DAY_LABELS[day][isFr ? "fr" : "en"]}
                        </Label>
                        <Input
                          id={`fiche-hours-${day}`}
                          className={fieldClass}
                          placeholder="09:00-17:00"
                          value={form.opening_hours[day]}
                          onChange={(e) =>
                            set("opening_hours", {
                              ...form.opening_hours,
                              [day]: e.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-700">
                    {t(
                      "Use 09:00-17:00, split shifts like 09:00-12:00, 13:00-17:00, or the word closed. Leave a day empty if unknown.",
                      "Utilisez 09:00-17:00, des plages comme 09:00-12:00, 13:00-17:00, ou le mot fermé. Laissez vide si inconnu.",
                    )}
                  </p>
                </div>
              </>,
            )}

            {fieldset(
              "services",
              SECTION_LABELS.services[isFr ? "fr" : "en"],
              <>
                {area("services", t("Services", "Services"), 4000, 4, listHint)}
                {area("products", t("Products", "Produits"), 4000, 4, listHint)}
              </>,
            )}

            {fieldset(
              "team",
              SECTION_LABELS.team[isFr ? "fr" : "en"],
              area("team", t("About the team", "À propos de l'équipe"), FICHE_LIMITS.longText),
            )}

            {fieldset(
              "kpis",
              SECTION_LABELS.kpis[isFr ? "fr" : "en"],
              <div className="space-y-2">
                {form.kpis.map((kpi, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`fiche-kpi-label-${index}`} className="text-slate-800">
                        {t("Indicator", "Indicateur")}
                      </Label>
                      <Input
                        id={`fiche-kpi-label-${index}`}
                        className={fieldClass}
                        maxLength={FICHE_LIMITS.kpiText}
                        value={kpi.label}
                        onChange={(e) =>
                          set(
                            "kpis",
                            form.kpis.map((k, i) =>
                              i === index ? { ...k, label: e.target.value } : k,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label htmlFor={`fiche-kpi-value-${index}`} className="text-slate-800">
                        {t("Value", "Valeur")}
                      </Label>
                      <Input
                        id={`fiche-kpi-value-${index}`}
                        className={fieldClass}
                        maxLength={FICHE_LIMITS.kpiText}
                        value={kpi.value}
                        onChange={(e) =>
                          set(
                            "kpis",
                            form.kpis.map((k, i) =>
                              i === index ? { ...k, value: e.target.value } : k,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("Remove indicator", "Retirer l'indicateur")}
                      onClick={() =>
                        set("kpis", form.kpis.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {form.kpis.length < FICHE_LIMITS.kpis && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-800"
                    onClick={() =>
                      set("kpis", [...form.kpis, { label: "", value: "" }])
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t("Add an indicator", "Ajouter un indicateur")}
                  </Button>
                )}
              </div>,
            )}

            {fieldset(
              "strategy",
              SECTION_LABELS.strategy[isFr ? "fr" : "en"],
              <>
                {area("mission", "Mission", FICHE_LIMITS.shortText * 2, 2)}
                {area("vision", "Vision", FICHE_LIMITS.shortText * 2, 2)}
                {area(
                  "proposition_valeur",
                  t("Value proposition", "Proposition de valeur"),
                  FICHE_LIMITS.shortText * 2,
                  2,
                )}
                {area("strategy", t("Strategy", "Stratégie"), FICHE_LIMITS.longText)}
              </>,
            )}

            {fieldset(
              "techStack",
              SECTION_LABELS.techStack[isFr ? "fr" : "en"],
              area("tech_stack", t("Tools and technologies", "Outils et technologies"), 4000, 3, listHint),
            )}

            {fieldset(
              "caseStudies",
              SECTION_LABELS.caseStudies[isFr ? "fr" : "en"],
              <div className="space-y-3">
                {form.case_studies.map((study, index) => (
                  <div key={index} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`fiche-case-title-${index}`} className="text-slate-800">
                          {t("Title", "Titre")}
                        </Label>
                        <Input
                          id={`fiche-case-title-${index}`}
                          className={fieldClass}
                          maxLength={FICHE_LIMITS.caseTitle}
                          value={study.title}
                          onChange={(e) =>
                            set(
                              "case_studies",
                              form.case_studies.map((c, i) =>
                                i === index ? { ...c, title: e.target.value } : c,
                              ),
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("Remove case study", "Retirer l'étude de cas")}
                        onClick={() =>
                          set(
                            "case_studies",
                            form.case_studies.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <Label htmlFor={`fiche-case-summary-${index}`} className="text-slate-800">
                      {t("Summary", "Résumé")}
                    </Label>
                    <Textarea
                      id={`fiche-case-summary-${index}`}
                      rows={2}
                      maxLength={FICHE_LIMITS.caseSummary}
                      className={fieldClass}
                      value={study.summary}
                      onChange={(e) =>
                        set(
                          "case_studies",
                          form.case_studies.map((c, i) =>
                            i === index ? { ...c, summary: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {form.case_studies.length < FICHE_LIMITS.caseStudies && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-800"
                    onClick={() =>
                      set("case_studies", [
                        ...form.case_studies,
                        { title: "", summary: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {t("Add a case study", "Ajouter une étude de cas")}
                  </Button>
                )}
              </div>,
            )}

            {fieldset(
              "legal",
              SECTION_LABELS.legal[isFr ? "fr" : "en"],
              <>
                {area("legal", t("Legal notice", "Mentions légales"), FICHE_LIMITS.longText)}
                {area("rgpd", t("Privacy (RGPD)", "Confidentialité (RGPD)"), FICHE_LIMITS.longText)}
                {area("terms", t("Terms of sale", "Conditions de vente"), FICHE_LIMITS.longText)}
              </>,
            )}

            {fieldset(
              "social",
              SECTION_LABELS.social[isFr ? "fr" : "en"],
              <div className="grid gap-3 sm:grid-cols-2">
                {SOCIAL_NETWORKS.map((network) => (
                  <div key={network} className="space-y-1.5">
                    <Label htmlFor={`fiche-social-${network}`} className="text-slate-800">
                      {NETWORK_LABELS[network]}
                    </Label>
                    <Input
                      id={`fiche-social-${network}`}
                      type="url"
                      inputMode="url"
                      className={fieldClass}
                      placeholder="https://"
                      maxLength={FICHE_LIMITS.url}
                      value={form.social_links[network]}
                      onChange={(e) =>
                        set("social_links", {
                          ...form.social_links,
                          [network]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>,
            )}

            {error && (
              <p role="alert" className="text-sm font-medium text-rose-800">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-300 text-slate-800"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t("Cancel", "Annuler")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {t("Save fiche", "Enregistrer la fiche")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
