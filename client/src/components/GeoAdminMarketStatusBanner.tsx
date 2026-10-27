import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getMarketAvailability } from "@/lib/geoadmin-pricing";
import { COUNTRY_CODES, getCountryMeta } from "@/utils/countryMeta";
import { localizedCountryName } from "@/utils/country-names";
import { fillTemplate } from "@shared/public-translations";

export default function GeoAdminMarketStatusBanner() {
  const { selectedCountry, setSelectedCountry, detecting } = useCountry();
  const { currentLang, translateText } = useLanguage();
  const tr = (text: string, values?: Record<string, string | number>) =>
    values ? fillTemplate(translateText(text), values) : translateText(text);
  const nameOf = (code: string) => {
    const englishName = getCountryMeta(code).name;
    return currentLang === "fr" || currentLang === "es"
      ? localizedCountryName(code, currentLang, englishName)
      : englishName;
  };

  const detectedName = selectedCountry
    ? getCountryMeta(selectedCountry).name
    : "";
  const countryName =
    detectedName === "Global"
      ? selectedCountry
      : selectedCountry
        ? nameOf(selectedCountry)
        : detectedName;
  const availability = selectedCountry
    ? getMarketAvailability(selectedCountry)
    : null;
  if (availability === true) return null;

  const classes =
    availability === false
      ? "border-amber-300/20 bg-amber-950 text-amber-100"
      : "border-sky-300/20 bg-slate-900 text-sky-100";
  const marketLabel =
    availability === false
      ? tr("COMING SOON IN {country}", {
          country: countryName.toLocaleUpperCase(),
        })
      : detecting
        ? tr("CHECKING GEOADMIN AVAILABILITY")
        : tr("SELECT YOUR COUNTRY TO CHECK GEOADMIN AVAILABILITY");

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`flex min-h-9 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide sm:text-xs ${classes}`}
    >
      <span>{marketLabel}</span>
      {availability !== null && (
        <span className="font-normal tracking-normal opacity-80">
          {tr(
            "Available markets: Canada, France, and Côte d’Ivoire. Final scope and terms are confirmed before purchase.",
          )}
        </span>
      )}
      {!selectedCountry && (
        <label className="sr-only" htmlFor="geoadmin-market-country">
          {tr("Choose your country")}
        </label>
      )}
      {!selectedCountry && (
        <select
          id="geoadmin-market-country"
          value=""
          onChange={(event) => setSelectedCountry(event.target.value)}
          className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white"
        >
          <option value="" disabled>
            {tr("Choose country")}
          </option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code} className="text-slate-900">
              {nameOf(code)}
            </option>
          ))}
        </select>
      )}
    </aside>
  );
}
