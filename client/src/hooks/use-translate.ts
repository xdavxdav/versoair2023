import { useLanguage } from "@/components/LanguageSwitcher";
import { fillTemplate } from "@shared/public-translations";

/** Translates catalogued English copy and fills {placeholders}; other text is left as is. */
export function useTranslate() {
  const { translateText } = useLanguage();
  return (text: string, values?: Record<string, string | number>) =>
    values ? fillTemplate(translateText(text), values) : translateText(text);
}
