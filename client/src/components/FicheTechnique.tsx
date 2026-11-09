import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  Clock,
  ExternalLink,
  Globe,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageSwitcher";
import {
  FicheSectionId,
  SECTION_LABELS,
  SECTOR_LABELS,
  getLockedSections,
  getVisibleSections,
  inferSector,
  normalizeTier,
} from "@/lib/fiche-technique-config";
import {
  WEEKDAYS,
  openNow,
  readFiche,
  weekdayIn,
  type Fiche,
  type Weekday,
} from "@shared/fiche-technique";

type BusinessInput = {
  id: number | string;
  name: string;
  address?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  rating?: number | string | null;
  category_name?: string | null;
  categoryName?: string | null;
  tier?: string | null;
  sector_data?: unknown;
  opening_hours?: unknown;
  social_links?: unknown;
  [key: string]: any;
};

interface FicheTechniqueProps {
  business: BusinessInput;
  // Present only for the owner or staff: shows the editor entry points.
  onEdit?: () => void;
}

const DAY_LABELS: Record<Weekday, { en: string; fr: string }> = {
  monday: { en: "Monday", fr: "Lundi" },
  tuesday: { en: "Tuesday", fr: "Mardi" },
  wednesday: { en: "Wednesday", fr: "Mercredi" },
  thursday: { en: "Thursday", fr: "Jeudi" },
  friday: { en: "Friday", fr: "Vendredi" },
  saturday: { en: "Saturday", fr: "Samedi" },
  sunday: { en: "Sunday", fr: "Dimanche" },
};

const NETWORK_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const TIER_LABELS = {
  free: { en: "Free", fr: "Gratuit" },
  premium: { en: "Premium", fr: "Premium" },
  enterprise: { en: "Enterprise", fr: "Entreprise" },
};

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="fiche-section rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 print:text-slate-900">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm text-slate-800">{children}</div>
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-800"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ label, text }: { label?: string; text: string }) {
  if (!text) return null;
  return (
    <p className="whitespace-pre-line">
      {label && <strong>{label}: </strong>}
      {text}
    </p>
  );
}

function formatHours(value: string, isFr: boolean): string {
  if (value === "closed") return isFr ? "Fermé" : "Closed";
  return value.replace(/-/g, " – ");
}

function mapsLink(business: BusinessInput): string | null {
  const lat = Number(business.latitude);
  const lng = Number(business.longitude);
  const query =
    Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? `${lat},${lng}`
      : business.address
        ? [business.address, business.location].filter(Boolean).join(", ")
        : "";
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function safeWebsite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function OpenNowBadge({ fiche, isFr }: { fiche: Fiche; isFr: boolean }) {
  const status = openNow(fiche.opening_hours, fiche.timezone, new Date());
  if (status.state === "unknown") return null;
  const open = status.state === "open";
  const label = open
    ? status.at
      ? isFr
        ? `Ouvert • ferme à ${status.at}`
        : `Open now • closes ${status.at}`
      : isFr
        ? "Ouvert"
        : "Open now"
    : status.at
      ? isFr
        ? `Fermé • ouvre à ${status.at}`
        : `Closed • opens ${status.at}`
      : isFr
        ? "Fermé"
        : "Closed";
  return (
    <Badge
      className={
        open
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-rose-300 bg-rose-50 text-rose-800"
      }
    >
      <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function FicheTechnique({ business, onEdit }: FicheTechniqueProps) {
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const label = (section: FicheSectionId) =>
    isFr ? SECTION_LABELS[section].fr : SECTION_LABELS[section].en;

  const fiche = readFiche({
    ...(business.sector_data && typeof business.sector_data === "object"
      ? (business.sector_data as object)
      : {}),
    opening_hours: business.opening_hours,
    social_links: business.social_links,
  }).value;

  const tier = normalizeTier(business.tier);
  const sector = inferSector(
    business.category_name || business.categoryName || "",
    fiche.sector,
  );
  const sections = getVisibleSections(tier, sector);
  const locked = getLockedSections(tier, sector);
  const has = (id: FicheSectionId) => sections.includes(id);

  const website = safeWebsite(business.website);
  const directions = mapsLink(business);
  const hoursEntries = WEEKDAYS.filter((day) => fiche.opening_hours[day]);
  const today = weekdayIn(fiche.timezone, new Date());
  const socialEntries = Object.entries(fiche.social_links);

  const showServices =
    has("services") && (fiche.services.length > 0 || fiche.products.length > 0);
  const showTeam = has("team") && Boolean(fiche.team);
  const showKpis = has("kpis") && fiche.kpis.length > 0;
  const showLegal =
    has("legal") && Boolean(fiche.legal || fiche.rgpd || fiche.terms);
  const showSocial = has("social") && socialEntries.length > 0;
  const showStrategy =
    has("strategy") &&
    Boolean(
      fiche.strategy || fiche.mission || fiche.vision || fiche.proposition_valeur,
    );
  const showTech = has("techStack") && fiche.tech_stack.length > 0;
  const showCases = has("caseStudies") && fiche.case_studies.length > 0;
  const hasExtra =
    showServices ||
    showTeam ||
    showKpis ||
    showLegal ||
    showStrategy ||
    showTech ||
    showCases;
  const hasAnyContent = hasExtra || hoursEntries.length > 0 || showSocial;

  const tierLabel = TIER_LABELS[tier][isFr ? "fr" : "en"];
  const sectorLabel = SECTOR_LABELS[sector][isFr ? "fr" : "en"];

  return (
    <Card
      id="fiche-technique"
      className="fiche-technique border border-slate-200 bg-white text-slate-900 shadow-md print:border-slate-300 print:shadow-none"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-xl text-slate-900">
              {isFr ? "Fiche technique" : "Technical Profile"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-slate-300 bg-slate-50 text-slate-800"
              >
                {sectorLabel}
              </Badge>
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-900"
              >
                {tierLabel}
              </Badge>
              <OpenNowBadge fiche={fiche} isFr={isFr} />
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            {onEdit && (
              <Button type="button" size="sm" onClick={onEdit}>
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {isFr ? "Modifier la fiche" : "Edit fiche"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-800"
              onClick={() => window.print()}
            >
              <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isFr ? "Imprimer / PDF" : "Print / PDF"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {onEdit && !hasAnyContent && (
          <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 print:hidden">
            <p className="font-medium">
              {isFr
                ? "Votre fiche technique est vide."
                : "Your technical profile is empty."}
            </p>
            <p className="mt-1">
              {isFr
                ? "Ajoutez vos horaires, services et liens pour que les clients vous trouvent et vous contactent plus vite."
                : "Add your hours, services and links so customers can find and reach you faster."}
            </p>
            <Button type="button" size="sm" className="mt-3" onClick={onEdit}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isFr ? "Remplir la fiche" : "Fill in the fiche"}
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-4 md:col-span-3">
            {showServices && (
              <SectionBlock title={label("services")}>
                {fiche.services.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-medium">Services</p>
                    <Chips items={fiche.services} />
                  </div>
                )}
                {fiche.products.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-medium">{isFr ? "Produits" : "Products"}</p>
                    <Chips items={fiche.products} />
                  </div>
                )}
              </SectionBlock>
            )}

            {showStrategy && (
              <SectionBlock title={label("strategy")}>
                <Paragraph label="Mission" text={fiche.mission} />
                <Paragraph label="Vision" text={fiche.vision} />
                <Paragraph
                  label={isFr ? "Proposition de valeur" : "Value proposition"}
                  text={fiche.proposition_valeur}
                />
                <Paragraph text={fiche.strategy} />
              </SectionBlock>
            )}

            {showTeam && (
              <SectionBlock title={label("team")}>
                <Paragraph text={fiche.team} />
              </SectionBlock>
            )}

            {showKpis && (
              <SectionBlock title={label("kpis")}>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {fiche.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <dt className="text-xs text-slate-700">{kpi.label}</dt>
                      <dd className="text-base font-semibold text-slate-900">
                        {kpi.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </SectionBlock>
            )}

            {showTech && (
              <SectionBlock title={label("techStack")}>
                <Chips items={fiche.tech_stack} />
              </SectionBlock>
            )}

            {showCases && (
              <SectionBlock title={label("caseStudies")}>
                <ul className="space-y-2">
                  {fiche.case_studies.map((study) => (
                    <li key={study.title}>
                      <strong>{study.title}</strong>
                      {study.summary && (
                        <p className="text-slate-700">{study.summary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionBlock>
            )}

            {showLegal && (
              <SectionBlock title={label("legal")}>
                <Paragraph text={fiche.legal} />
                <Paragraph label="RGPD" text={fiche.rgpd} />
                <Paragraph label={isFr ? "CGV" : "Terms"} text={fiche.terms} />
              </SectionBlock>
            )}
          </div>

          <aside className="space-y-4 md:col-span-2">
            {(business.phone ||
              business.email ||
              website ||
              business.address ||
              directions) && (
              <SectionBlock title={isFr ? "Coordonnées" : "Contact"}>
                <ul className="space-y-2">
                  {business.address && (
                    <li className="flex items-start gap-2">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                      <span>
                        {business.address}
                        {business.location ? `, ${business.location}` : ""}
                      </span>
                    </li>
                  )}
                  {business.phone && (
                    <li className="flex items-center gap-2">
                      <Phone
                        className="h-4 w-4 shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                      <a
                        className="text-blue-800 underline-offset-2 hover:underline"
                        href={`tel:${business.phone}`}
                      >
                        {business.phone}
                      </a>
                    </li>
                  )}
                  {business.email && (
                    <li className="flex items-center gap-2">
                      <Mail
                        className="h-4 w-4 shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                      <a
                        className="break-all text-blue-800 underline-offset-2 hover:underline"
                        href={`mailto:${business.email}`}
                      >
                        {business.email}
                      </a>
                    </li>
                  )}
                  {website && (
                    <li className="flex items-center gap-2">
                      <Globe
                        className="h-4 w-4 shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                      <a
                        className="break-all text-blue-800 underline-offset-2 hover:underline"
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </li>
                  )}
                </ul>
                {directions && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-1 border-slate-300 text-slate-800 print:hidden"
                  >
                    <a href={directions} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {isFr ? "Itinéraire" : "Directions"}
                    </a>
                  </Button>
                )}
              </SectionBlock>
            )}

            {hoursEntries.length > 0 && (
              <SectionBlock title={isFr ? "Horaires" : "Opening hours"}>
                <table className="w-full text-sm">
                  <tbody>
                    {hoursEntries.map((day) => (
                      <tr
                        key={day}
                        className={
                          day === today
                            ? "bg-amber-50 font-semibold text-slate-900"
                            : ""
                        }
                        aria-current={day === today ? "date" : undefined}
                      >
                        <th
                          scope="row"
                          className="py-1 pl-1 pr-3 text-left font-medium"
                        >
                          {isFr ? DAY_LABELS[day].fr : DAY_LABELS[day].en}
                        </th>
                        <td className="py-1 pr-1 text-right tabular-nums">
                          {formatHours(fiche.opening_hours[day]!, isFr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionBlock>
            )}

            {showSocial && (
              <SectionBlock title={label("social")}>
                <ul className="space-y-1.5">
                  {socialEntries.map(([network, url]) => (
                    <li key={network}>
                      <a
                        className="inline-flex items-center gap-1.5 text-blue-800 underline-offset-2 hover:underline"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {NETWORK_LABELS[network] ?? network}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </SectionBlock>
            )}
          </aside>
        </div>

        {onEdit && locked.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm print:hidden">
            <div className="flex items-start gap-2 text-slate-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {isFr ? "Disponible avec un forfait supérieur : " : "Unlocked with a higher plan: "}
                <strong>{locked.map(label).join(", ")}</strong>
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-slate-300 text-slate-800">
              <Link href="/pricing">{isFr ? "Voir les forfaits" : "View plans"}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
