import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageSwitcher";
import {
  FicheSectionId,
  Sector,
  SECTION_LABELS,
  Tier,
  getVisibleSections,
} from "@/lib/fiche-technique-config";

type AnyRecord = Record<string, any>;

type BusinessInput = {
  id: number | string;
  name: string;
  description?: string | null;
  address?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  rating?: number | string | null;
  employee_count?: number | null;
  annual_revenue?: number | null;
  opening_hours?: Record<string, string> | string | null;
  social_links?: Record<string, string> | string | null;
  tags?: string[] | string | null;
  category_name?: string | null;
  categoryName?: string | null;
  tier?: string | null;
  subscription_tier?: string | null;
  sector_data?: AnyRecord | string | null;
  sectorData?: AnyRecord | string | null;
  attributes?: AnyRecord;
  [key: string]: any;
};

function parseMaybeJsonObject(value: unknown): AnyRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AnyRecord;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      if (value.includes(",")) {
        return value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
      if (value.trim()) return [value.trim()];
    }
  }
  return [];
}

function parseHours(value: unknown): Record<string, string> {
  const obj = parseMaybeJsonObject(value);
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k] = String(v);
    return acc;
  }, {});
}

function normalizeTier(value: string | null | undefined): Tier {
  const t = (value || "").toLowerCase();
  if (t === "enterprise" || t === "max") return "enterprise";
  if (t === "premium" || t === "verified" || t === "essential") {
    return "premium";
  }
  return "free";
}

function inferSector(categoryName: string, sectorData: AnyRecord): Sector {
  const explicit = String(
    sectorData.sector || sectorData.business_type || sectorData.type || "",
  ).toLowerCase();

  if (
    explicit === "convenience_store" ||
    explicit === "ad_agency" ||
    explicit === "finance" ||
    explicit === "restaurant" ||
    explicit === "ecommerce" ||
    explicit === "commerce" ||
    explicit === "hotellerie" ||
    explicit === "batiment" ||
    explicit === "automobile" ||
    explicit === "divertissement"
  ) {
    return explicit as Sector;
  }

  const c = categoryName.toLowerCase();
  if (c.includes("finance")) return "finance";
  if (c.includes("hôtel") || c.includes("hotel") || c.includes("hotellerie")) {
    return "hotellerie";
  }
  if (c.includes("batiment") || c.includes("construction")) return "batiment";
  if (c.includes("auto")) return "automobile";
  if (c.includes("divert") || c.includes("entertain")) return "divertissement";
  if (
    c.includes("commerce") ||
    c.includes("retail") ||
    c.includes("boutique")
  ) {
    return "commerce";
  }
  return "other";
}

function getLabel(section: FicheSectionId, isFr: boolean): string {
  return isFr ? SECTION_LABELS[section].fr : SECTION_LABELS[section].en;
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="fiche-section rounded-xl border border-white/10 bg-white/5 p-4 print:border-slate-300 print:bg-white">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-300 print:text-slate-900">
        {title}
      </h3>
      <div className="mt-2 text-sm text-slate-200 print:text-slate-800 space-y-2">
        {children}
      </div>
    </section>
  );
}

export function FicheTechnique({ business }: { business: BusinessInput }) {
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";

  const categoryName = business.category_name || business.categoryName || "";
  const sectorData =
    parseMaybeJsonObject(business.sectorData) ||
    parseMaybeJsonObject(business.sector_data) ||
    parseMaybeJsonObject(business.attributes?.sectorData) ||
    parseMaybeJsonObject(business.attributes?.sector_data);

  const socialLinks = parseMaybeJsonObject(business.social_links);
  const openingHours = parseHours(business.opening_hours);
  const tags = parseStringArray(business.tags);

  const services = parseStringArray(
    sectorData.services ??
      sectorData.offerings ??
      business.attributes?.services,
  );
  const products = parseStringArray(sectorData.products ?? sectorData.brands);
  const kpis = Array.isArray(sectorData.kpis) ? sectorData.kpis : [];
  const techStack = parseStringArray(sectorData.tech_stack ?? sectorData.tools);
  const caseStudies = Array.isArray(sectorData.case_studies)
    ? sectorData.case_studies
    : [];
  const analytics = Array.isArray(sectorData.analytics)
    ? sectorData.analytics
    : [];

  const tier = normalizeTier(
    (business.tier as string) || (business.subscription_tier as string),
  );
  const sector = inferSector(categoryName, sectorData);
  const sections = getVisibleSections(tier, sector);

  const formattedRevenue =
    typeof business.annual_revenue === "number"
      ? new Intl.NumberFormat(isFr ? "fr-FR" : "en-US", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(business.annual_revenue)
      : null;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl print:shadow-none print:border-slate-300 fiche-technique">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-slate-100 print:text-slate-900">
              {isFr ? "Fiche technique" : "Technical Profile"}
            </CardTitle>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              {isFr
                ? `Niveau: ${tier} • Secteur: ${sector}`
                : `Tier: ${tier} • Sector: ${sector}`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="print:hidden border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
            onClick={() => window.print()}
          >
            {isFr ? "Imprimer / PDF" : "Print / PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.includes("basic") && (
          <SectionBlock title={getLabel("basic", isFr)}>
            {business.description && <p>{business.description}</p>}
            <ul className="space-y-1">
              {business.address && (
                <li>
                  <strong>{isFr ? "Adresse" : "Address"}:</strong>{" "}
                  {business.address}
                </li>
              )}
              {business.location && (
                <li>
                  <strong>{isFr ? "Localisation" : "Location"}:</strong>{" "}
                  {business.location}
                </li>
              )}
              {business.phone && (
                <li>
                  <strong>{isFr ? "Téléphone" : "Phone"}:</strong>{" "}
                  {business.phone}
                </li>
              )}
              {business.email && (
                <li>
                  <strong>Email:</strong> {business.email}
                </li>
              )}
              {typeof business.employee_count === "number" && (
                <li>
                  <strong>{isFr ? "Employés" : "Employees"}:</strong>{" "}
                  {business.employee_count}
                </li>
              )}
              {formattedRevenue && (
                <li>
                  <strong>{isFr ? "CA annuel" : "Annual revenue"}:</strong>{" "}
                  {formattedRevenue}
                </li>
              )}
              {business.rating != null && (
                <li>
                  <strong>{isFr ? "Note" : "Rating"}:</strong>{" "}
                  {String(business.rating)}/5
                </li>
              )}
            </ul>
          </SectionBlock>
        )}

        {sections.includes("services") &&
          (services.length > 0 || products.length > 0) && (
            <SectionBlock title={getLabel("services", isFr)}>
              {services.length > 0 && (
                <div>
                  <p className="font-medium">
                    {isFr ? "Services" : "Services"}
                  </p>
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    {services.map((s) => (
                      <li key={`svc-${s}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {products.length > 0 && (
                <div>
                  <p className="font-medium">
                    {isFr ? "Produits" : "Products"}
                  </p>
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    {products.map((p) => (
                      <li key={`prd-${p}`}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionBlock>
          )}

        {sections.includes("team") &&
          (sectorData.team || sectorData.equipe) && (
            <SectionBlock title={getLabel("team", isFr)}>
              <p>{String(sectorData.team || sectorData.equipe)}</p>
            </SectionBlock>
          )}

        {sections.includes("kpis") && kpis.length > 0 && (
          <SectionBlock title={getLabel("kpis", isFr)}>
            <ul className="space-y-1">
              {kpis.map((k: AnyRecord, idx: number) => (
                <li key={`kpi-${idx}`}>
                  <strong>
                    {String(k.label || k.metric || `KPI ${idx + 1}`)}:
                  </strong>{" "}
                  {String(k.value ?? "—")}
                </li>
              ))}
            </ul>
          </SectionBlock>
        )}

        {sections.includes("legal") &&
          (sectorData.legal || sectorData.rgpd || sectorData.terms) && (
            <SectionBlock title={getLabel("legal", isFr)}>
              {sectorData.legal && <p>{String(sectorData.legal)}</p>}
              {sectorData.rgpd && (
                <p>
                  <strong>RGPD:</strong> {String(sectorData.rgpd)}
                </p>
              )}
              {sectorData.terms && (
                <p>
                  <strong>{isFr ? "CGV" : "Terms"}:</strong>{" "}
                  {String(sectorData.terms)}
                </p>
              )}
            </SectionBlock>
          )}

        {sections.includes("social") &&
          (Object.keys(socialLinks).length > 0 ||
            Object.keys(openingHours).length > 0 ||
            tags.length > 0) && (
            <SectionBlock title={getLabel("social", isFr)}>
              {Object.keys(socialLinks).length > 0 && (
                <ul className="space-y-1">
                  {Object.entries(socialLinks).map(([network, url]) => (
                    <li key={network}>
                      <strong>{network}:</strong> {String(url)}
                    </li>
                  ))}
                </ul>
              )}
              {Object.keys(openingHours).length > 0 && (
                <p>
                  <strong>{isFr ? "Horaires" : "Opening hours"}:</strong>{" "}
                  {Object.entries(openingHours)
                    .map(([day, hours]) => `${day}: ${hours}`)
                    .join(" · ")}
                </p>
              )}
              {tags.length > 0 && (
                <p>
                  <strong>{isFr ? "Tags" : "Tags"}:</strong> {tags.join(", ")}
                </p>
              )}
            </SectionBlock>
          )}

        {sections.includes("strategy") &&
          (sectorData.strategy ||
            sectorData.mission ||
            sectorData.vision ||
            sectorData.proposition_valeur) && (
            <SectionBlock title={getLabel("strategy", isFr)}>
              {sectorData.mission && (
                <p>
                  <strong>{isFr ? "Mission" : "Mission"}:</strong>{" "}
                  {String(sectorData.mission)}
                </p>
              )}
              {sectorData.vision && (
                <p>
                  <strong>{isFr ? "Vision" : "Vision"}:</strong>{" "}
                  {String(sectorData.vision)}
                </p>
              )}
              {sectorData.proposition_valeur && (
                <p>
                  <strong>
                    {isFr ? "Proposition de valeur" : "Value proposition"}:
                  </strong>{" "}
                  {String(sectorData.proposition_valeur)}
                </p>
              )}
              {sectorData.strategy && <p>{String(sectorData.strategy)}</p>}
            </SectionBlock>
          )}

        {sections.includes("techStack") && techStack.length > 0 && (
          <SectionBlock title={getLabel("techStack", isFr)}>
            <p>{techStack.join(" • ")}</p>
          </SectionBlock>
        )}

        {sections.includes("caseStudies") && caseStudies.length > 0 && (
          <SectionBlock title={getLabel("caseStudies", isFr)}>
            <ul className="space-y-2">
              {caseStudies.map((c: AnyRecord, idx: number) => (
                <li key={`case-${idx}`}>
                  <strong>
                    {String(c.title || c.nom || `Case ${idx + 1}`)}
                  </strong>
                  {(c.summary || c.result) && (
                    <p className="text-slate-300 print:text-slate-700">
                      {String(c.summary || c.result)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </SectionBlock>
        )}

        {sections.includes("analytics") && analytics.length > 0 && (
          <SectionBlock title={getLabel("analytics", isFr)}>
            <ul className="space-y-1">
              {analytics.map((a: AnyRecord, idx: number) => (
                <li key={`analytics-${idx}`}>
                  <strong>
                    {String(a.metric || a.label || `Metric ${idx + 1}`)}:
                  </strong>{" "}
                  {String(a.value ?? "—")}
                </li>
              ))}
            </ul>
          </SectionBlock>
        )}
      </CardContent>
    </Card>
  );
}
