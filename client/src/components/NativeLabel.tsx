import { useLanguage } from "@/components/LanguageSwitcher";
import { getPublicCopyId, isBundledLanguage } from "@shared/public-translations";

// Renders a catalogued navigation label in the visitor's own language and keeps
// Google Translate from re-translating it. Other languages and uncatalogued
// text pass through untouched so Google Translate keeps handling them.
export function NativeLabel({ text }: { text: string }) {
  const { currentLang, translateText } = useLanguage();
  if (!isBundledLanguage(currentLang) || getPublicCopyId(text) === undefined) {
    return <>{text}</>;
  }
  return (
    <span translate="no" className="notranslate">
      {translateText(text)}
    </span>
  );
}
