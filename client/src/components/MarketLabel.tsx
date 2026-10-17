import { useLanguage } from "@/components/LanguageSwitcher";
import { getMarketLabel } from "@/lib/terminology";

export default function MarketLabel() {
  const { currentLang } = useLanguage();

  return (
    <span className="notranslate" translate="no">
      {getMarketLabel(currentLang)}
    </span>
  );
}
