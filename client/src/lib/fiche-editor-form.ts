import {
  SOCIAL_NETWORKS,
  WEEKDAYS,
  emptyFiche,
  type Fiche,
  type SocialNetwork,
  type Weekday,
} from "@shared/fiche-technique";

// The editor works on plain strings; lists are one entry per line.
export interface FicheForm {
  sector: string;
  timezone: string;
  services: string;
  products: string;
  tech_stack: string;
  team: string;
  legal: string;
  rgpd: string;
  terms: string;
  mission: string;
  vision: string;
  proposition_valeur: string;
  strategy: string;
  kpis: { label: string; value: string }[];
  case_studies: { title: string; summary: string }[];
  opening_hours: Record<Weekday, string>;
  social_links: Record<SocialNetwork, string>;
}

const lines = (items: string[]) => items.join("\n");

const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export function ficheToForm(fiche: Fiche = emptyFiche()): FicheForm {
  return {
    sector: fiche.sector ?? "",
    timezone: fiche.timezone ?? "",
    services: lines(fiche.services),
    products: lines(fiche.products),
    tech_stack: lines(fiche.tech_stack),
    team: fiche.team,
    legal: fiche.legal,
    rgpd: fiche.rgpd,
    terms: fiche.terms,
    mission: fiche.mission,
    vision: fiche.vision,
    proposition_valeur: fiche.proposition_valeur,
    strategy: fiche.strategy,
    kpis: fiche.kpis.map((kpi) => ({ ...kpi })),
    case_studies: fiche.case_studies.map((study) => ({ ...study })),
    opening_hours: Object.fromEntries(
      WEEKDAYS.map((day) => [day, fiche.opening_hours[day] ?? ""]),
    ) as Record<Weekday, string>,
    social_links: Object.fromEntries(
      SOCIAL_NETWORKS.map((network) => [network, fiche.social_links[network] ?? ""]),
    ) as Record<SocialNetwork, string>,
  };
}

// Blank rows and blank fields are left out; the server validates the rest and refuses bad input.
export function formToPayload(form: FicheForm) {
  return {
    sector: form.sector || undefined,
    timezone: form.timezone || undefined,
    services: splitLines(form.services),
    products: splitLines(form.products),
    tech_stack: splitLines(form.tech_stack),
    team: form.team,
    legal: form.legal,
    rgpd: form.rgpd,
    terms: form.terms,
    mission: form.mission,
    vision: form.vision,
    proposition_valeur: form.proposition_valeur,
    strategy: form.strategy,
    kpis: form.kpis.filter((k) => k.label.trim() || k.value.trim()),
    case_studies: form.case_studies.filter(
      (c) => c.title.trim() || c.summary.trim(),
    ),
    opening_hours: Object.fromEntries(
      WEEKDAYS.flatMap((day) => {
        const value = form.opening_hours[day].trim();
        return value ? [[day, value]] : [];
      }),
    ),
    social_links: Object.fromEntries(
      SOCIAL_NETWORKS.flatMap((network) => {
        const value = form.social_links[network].trim();
        return value ? [[network, value]] : [];
      }),
    ),
  };
}

// Copies one day's hours to the other weekdays (Monday to Friday) in one click.
export function applyHoursToWeekdays(
  hours: Record<Weekday, string>,
  from: Weekday = "monday",
): Record<Weekday, string> {
  const next = { ...hours };
  for (const day of WEEKDAYS.slice(0, 5)) next[day] = hours[from];
  return next;
}
