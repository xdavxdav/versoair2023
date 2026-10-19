import { useLanguage } from "@/components/LanguageSwitcher";

export default function TranslationAttribution() {
  const { machineTranslated } = useLanguage();
  if (!machineTranslated) return null;
  return (
    <aside translate="no" className="notranslate mx-2 my-3 flex flex-wrap items-center justify-center gap-2 text-xs">
      <span className="rounded bg-white px-2 py-1 text-slate-800">
        Automatic translation by Google Translate
      </span>
      <a
        href="https://translate.google.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Automatic translation by Google Translate"
        className="inline-flex min-h-11 items-center rounded bg-white px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
      >
        <img
          src="/images/google-translate-attribution.png"
          width="176"
          height="16"
          alt="Powered by Google Translate"
        />
      </a>
    </aside>
  );
}
