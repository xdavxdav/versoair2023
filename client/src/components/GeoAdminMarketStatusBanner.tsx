import { useCountry } from "@/contexts/CountryContext";
import { getMarketAvailability } from "@/lib/geoadmin-pricing";
import { COUNTRY_CODES, getCountryMeta } from "@/utils/countryMeta";

export default function GeoAdminMarketStatusBanner() {
  const { selectedCountry, setSelectedCountry, detecting } = useCountry();

  const detectedName = selectedCountry
    ? getCountryMeta(selectedCountry).name
    : "";
  const countryName =
    detectedName === "Global" ? selectedCountry : detectedName;
  const availability = selectedCountry
    ? getMarketAvailability(selectedCountry)
    : null;
  const classes =
    availability === true
      ? "border-emerald-300/20 bg-emerald-950 text-emerald-100"
      : availability === false
        ? "border-amber-300/20 bg-amber-950 text-amber-100"
        : "border-sky-300/20 bg-slate-900 text-sky-100";
  const marketLabel =
    availability === true
      ? `AVAILABLE IN ${countryName.toLocaleUpperCase()}`
      : availability === false
        ? `COMING SOON IN ${countryName.toLocaleUpperCase()}`
        : detecting
          ? "CHECKING GEOADMIN AVAILABILITY"
          : "SELECT YOUR COUNTRY TO CHECK GEOADMIN AVAILABILITY";

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`flex min-h-9 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide sm:text-xs ${classes}`}
    >
      <span>{marketLabel}</span>
      {availability !== null && (
        <span className="font-normal tracking-normal opacity-80">
          Available markets: Canada, France, and Côte d’Ivoire. Prices and
          terms are confirmed before purchase.
        </span>
      )}
      {!selectedCountry && (
        <label className="sr-only" htmlFor="geoadmin-market-country">
          Choose your country
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
            Choose country
          </option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code} className="text-slate-900">
              {getCountryMeta(code).name}
            </option>
          ))}
        </select>
      )}
    </aside>
  );
}
