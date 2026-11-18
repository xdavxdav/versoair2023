import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Set when the title contains a proper name browser translation must not rewrite. */
  noTranslateTitle?: boolean;
};

const SITE_URL = "https://www.versoair.com";
const DEFAULT_IMAGE = "/Logo-page.png";

function toAbsoluteUrl(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return `${SITE_URL}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

export function SeoHead({
  title,
  description,
  canonicalPath = "/",
  image = DEFAULT_IMAGE,
  jsonLd,
  noTranslateTitle = false,
}: SeoHeadProps) {
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const imageUrl = toAbsoluteUrl(image);

  useEffect(() => {
    if (!noTranslateTitle) return;

    const preserveTitle = () => {
      if (document.title !== title) document.title = title;
    };

    preserveTitle();
    const observer = new MutationObserver(preserveTitle);
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [noTranslateTitle, title]);

  return (
    <Helmet
      defer={false}
      titleAttributes={
        noTranslateTitle
          ? { translate: "no", class: "notranslate" }
          : undefined
      }
    >
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="VersoAir" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
