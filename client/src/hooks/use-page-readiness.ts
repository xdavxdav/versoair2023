import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { isPageBlocked } from "@shared/page-readiness";
import {
  getEffectiveBlockedPaths,
  isLocalDevelopmentHost,
} from "@shared/page-readiness";
import { authenticatedFetch } from "@/lib/auth";

interface PublicPageReadiness {
  blockedPaths: string[];
}

const PUBLIC_QUERY_KEY = ["/api/page-readiness"];

async function loadPublicPageReadiness(): Promise<PublicPageReadiness> {
  const response = await fetch("/api/page-readiness", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }
  return response.json();
}

export function usePageReadiness() {
  return useQuery({
    queryKey: PUBLIC_QUERY_KEY,
    queryFn: loadPublicPageReadiness,
    staleTime: 30_000,
  });
}

export { isPageBlocked };

export function getClientBlockedPaths(blockedPaths: readonly string[]) {
  const localPreview =
    import.meta.env.DEV && isLocalDevelopmentHost(window.location.hostname);
  return getEffectiveBlockedPaths(blockedPaths, localPreview);
}

export function useDisableBlockedPageLinks(blockedPaths: readonly string[]) {
  useEffect(() => {
    const originalAttributes = new WeakMap<
      HTMLAnchorElement,
      { ariaDisabled: string | null; tabIndex: string | null; title: string | null }
    >();
    const style = document.createElement("style");
    style.dataset.pageReadinessStyles = "true";
    style.textContent =
      'a[data-page-readiness-blocked="true"]{pointer-events:none!important;opacity:.42!important;filter:grayscale(1);cursor:not-allowed!important}';
    document.head.appendChild(style);

    const updateLink = (anchor: HTMLAnchorElement) => {
      let target: URL;
      try {
        target = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      const shouldDisable =
        target.origin === window.location.origin &&
        isPageBlocked(target.pathname, blockedPaths);

      if (shouldDisable && !anchor.dataset.pageReadinessBlocked) {
        originalAttributes.set(anchor, {
          ariaDisabled: anchor.getAttribute("aria-disabled"),
          tabIndex: anchor.getAttribute("tabindex"),
          title: anchor.getAttribute("title"),
        });
        anchor.dataset.pageReadinessBlocked = "true";
        anchor.setAttribute("aria-disabled", "true");
        anchor.setAttribute("tabindex", "-1");
        anchor.setAttribute("title", "This page is not available yet.");
      } else if (!shouldDisable && anchor.dataset.pageReadinessBlocked) {
        delete anchor.dataset.pageReadinessBlocked;
        const original = originalAttributes.get(anchor);
        if (original) {
          if (original.ariaDisabled === null) anchor.removeAttribute("aria-disabled");
          else anchor.setAttribute("aria-disabled", original.ariaDisabled);
          if (original.tabIndex === null) anchor.removeAttribute("tabindex");
          else anchor.setAttribute("tabindex", original.tabIndex);
          if (original.title === null) anchor.removeAttribute("title");
          else anchor.setAttribute("title", original.title);
          originalAttributes.delete(anchor);
        }
      }
    };

    const updateLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(updateLink);
    };
    updateLinks();
    const observer = new MutationObserver(updateLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    return () => {
      observer.disconnect();
      document
        .querySelectorAll<HTMLAnchorElement>(
          'a[data-page-readiness-blocked="true"]',
        )
        .forEach((anchor) => {
          delete anchor.dataset.pageReadinessBlocked;
          const original = originalAttributes.get(anchor);
          if (!original) return;
          if (original.ariaDisabled === null) anchor.removeAttribute("aria-disabled");
          else anchor.setAttribute("aria-disabled", original.ariaDisabled);
          if (original.tabIndex === null) anchor.removeAttribute("tabindex");
          else anchor.setAttribute("tabindex", original.tabIndex);
          if (original.title === null) anchor.removeAttribute("title");
          else anchor.setAttribute("title", original.title);
        });
      style.remove();
    };
  }, [blockedPaths]);
}
