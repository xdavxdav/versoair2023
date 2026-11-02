import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { isPageBlocked } from "@shared/page-readiness";
import {
  getEffectiveBlockedPaths,
  isLocalDevelopmentHost,
} from "@shared/page-readiness";
import { authenticatedFetch } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

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

export interface BlockedLinkCopy {
  label: string;
  message: string;
}

interface OriginalAttributes {
  ariaDisabled: string | null;
  tabIndex: string | null;
  title: string | null;
}

const BLOCKED_SELECTOR = 'a[data-page-readiness-blocked="true"]';

// The pill borrows the link's own colour, so it stays as readable as the link on light and dark surfaces.
const BLOCKED_LINK_CSS =
  `${BLOCKED_SELECTOR}{opacity:.62!important;filter:grayscale(1);cursor:not-allowed!important}` +
  `${BLOCKED_SELECTOR}::after{content:attr(data-page-readiness-label);display:inline-block;margin-left:.5em;padding:.05em .55em;border:1px solid currentColor;border-radius:9999px;font-size:.68rem;font-style:normal;font-weight:600;letter-spacing:0;line-height:1.5;text-transform:none;white-space:nowrap;vertical-align:middle}`;

function restoreAttribute(
  anchor: HTMLAnchorElement,
  name: string,
  value: string | null,
) {
  if (value === null) anchor.removeAttribute(name);
  else anchor.setAttribute(name, value);
}

// Links to pages that are not open yet say so on screen and when clicked,
// instead of just going grey and doing nothing.
export function useDisableBlockedPageLinks(
  blockedPaths: readonly string[],
  { label, message }: BlockedLinkCopy,
) {
  useEffect(() => {
    const originalAttributes = new WeakMap<
      HTMLAnchorElement,
      OriginalAttributes
    >();
    const style = document.createElement("style");
    style.dataset.pageReadinessStyles = "true";
    style.textContent = BLOCKED_LINK_CSS;
    document.head.appendChild(style);

    const restoreLink = (anchor: HTMLAnchorElement) => {
      delete anchor.dataset.pageReadinessBlocked;
      delete anchor.dataset.pageReadinessLabel;
      const original = originalAttributes.get(anchor);
      if (!original) return;
      restoreAttribute(anchor, "aria-disabled", original.ariaDisabled);
      restoreAttribute(anchor, "tabindex", original.tabIndex);
      restoreAttribute(anchor, "title", original.title);
      originalAttributes.delete(anchor);
    };

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
        anchor.dataset.pageReadinessLabel = label;
        anchor.setAttribute("aria-disabled", "true");
        anchor.setAttribute("tabindex", "-1");
        anchor.setAttribute("title", message);
      } else if (!shouldDisable && anchor.dataset.pageReadinessBlocked) {
        restoreLink(anchor);
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

    // Capture phase on document runs before the router's own click handling.
    const explainBlockedClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(BLOCKED_SELECTOR)) return;
      event.preventDefault();
      event.stopPropagation();
      toast({ title: label, description: message });
    };
    document.addEventListener("click", explainBlockedClick, true);

    return () => {
      document.removeEventListener("click", explainBlockedClick, true);
      observer.disconnect();
      document
        .querySelectorAll<HTMLAnchorElement>(BLOCKED_SELECTOR)
        .forEach(restoreLink);
      style.remove();
    };
  }, [blockedPaths, label, message]);
}
