import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { transliterate } from "transliteration";
import { useLanguage } from "@/components/LanguageSwitcher";
import TranslationAttribution from "@/components/TranslationAttribution";
import { getPublicCopyId, isBundledLanguage } from "../../../shared/public-translations";

interface ContentProps {
  children?: ReactNode;
  translate?: string;
  className?: string;
  lang?: string;
  placeholder?: string;
  title?: string;
  "aria-label"?: string;
}

// React owns every translated node. Only exact matches in the public catalogue
// are localized; input values, URLs, event handlers and unknown text are untouched.
export function useLocalizedContent(includeAttribution = true) {
  const { currentLang, translateText, machineTranslated, romanized, isNonLatinLang } = useLanguage();
  const visit = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      const text = translateText(node);
      const catalogued = getPublicCopyId(node) !== undefined;
      const native = isBundledLanguage(currentLang) && catalogued;
      if (text === node && !catalogued) return node;
      const hint = romanized && isNonLatinLang ? transliterate(text) : null;
      return (
        <span
          lang={native ? currentLang : undefined}
          dir="auto"
          translate={native ? "no" : undefined}
          className={native ? "notranslate" : undefined}
        >
          {hint && hint !== text ? (
            <>
              {text}
              <span aria-hidden="true" className="block text-xs italic opacity-80">{hint}</span>
            </>
          ) : text}
        </span>
      );
    }
    if (Array.isArray(node)) return Children.map(node, visit);
    if (!isValidElement<ContentProps>(node)) return node;
    if (node.props.translate === "no" || node.props.className?.split(/\s+/).includes("notranslate") ||
        (typeof node.type === "string" && ["script", "style", "textarea", "code", "pre", "svg"].includes(node.type))) {
      return node;
    }
    const props: Partial<ContentProps> = {};
    for (const key of ["placeholder", "title", "aria-label"] as const) {
      const value = node.props[key];
      if (typeof value === "string") props[key] = translateText(value);
    }
    if (node.type === "option" && typeof node.props.children === "string") {
      if (isBundledLanguage(currentLang) && getPublicCopyId(node.props.children) !== undefined) {
        props.translate = "no";
        props.lang = currentLang;
      }
      return cloneElement(node, props, translateText(node.props.children));
    }
    // Do not override explicit per-section source language metadata with a false
    // page-wide claim: content outside this catalogue may still use its source.
    return cloneElement(node, props, visit(node.props.children));
  };
  return (node: ReactNode): ReactNode => {
    const result = visit(node);
    if (includeAttribution && machineTranslated && isValidElement<ContentProps>(result) &&
        (result.type === "div" || result.type === "section")) {
      return cloneElement(result, {}, result.props.children, <TranslationAttribution key="translation-attribution" />);
    }
    return result;
  };
}
