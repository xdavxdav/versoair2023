import { useLanguage } from "@/components/LanguageSwitcher";
import {
  getPublicCopyId,
  isBundledLanguage,
} from "@shared/public-translations";

export default function LocalizedGoldHeading({ text }: { text: string }) {
  const { currentLang, translateText } = useLanguage();
  const isNativeCopy =
    isBundledLanguage(currentLang) && getPublicCopyId(text) !== undefined;

  return (
    <h2 className="gold-text mb-1 sm:mb-2 md:mb-3">
      <span
        key={currentLang}
        className="gold-text__shine"
        lang={isNativeCopy ? currentLang : undefined}
        translate={isNativeCopy ? "no" : undefined}
      >
        {translateText(text)}
      </span>
    </h2>
  );
}
