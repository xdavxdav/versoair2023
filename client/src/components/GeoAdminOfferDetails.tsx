import { GEOADMIN_PLAN_DETAILS, GEOADMIN_PREMIUM_NOTICE, type GeoAdminOfferKey } from "@/lib/geoadmin-pricing";
import { useLocalizedContent } from "@/hooks/use-localized-content";

export default function GeoAdminOfferDetails({ offer }: { offer: GeoAdminOfferKey }) {
  const localize = useLocalizedContent(false);
  const details = GEOADMIN_PLAN_DETAILS[offer];
  return localize(
    <div className="mt-4 space-y-4 text-sm leading-relaxed">
      {offer === "premium" && <p className="font-semibold">{GEOADMIN_PREMIUM_NOTICE}</p>}
      <div>
        <h4 className="font-semibold">Proposed platform scope</h4>
        <ul className="mt-2 list-disc space-y-2 pl-4">
          {details.platform.map(text => <li key={text}>{text}</li>)}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold">Proposed services — written confirmation required</h4>
        <ul className="mt-2 list-disc space-y-2 pl-4">
          {details.services.map(text => <li key={text}>{text}</li>)}
        </ul>
      </div>
    </div>,
  );
}
