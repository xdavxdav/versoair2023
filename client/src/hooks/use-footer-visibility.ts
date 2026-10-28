import { useEffect, useState } from "react";

export function useFooterVisibility(key: string) {
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) {
      setIsFooterVisible(false);
      return;
    }

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      });
      observer.observe(footer);
      return () => observer.disconnect();
    }

    const updateVisibility = () => {
      const rect = footer.getBoundingClientRect();
      setIsFooterVisible(rect.top < window.innerHeight && rect.bottom > 0);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [key]);

  return isFooterVisible;
}
