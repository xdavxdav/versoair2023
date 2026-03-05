import { useEffect, useRef } from "react";

/**
 * Locks page scroll when `locked` is true.
 * Safe to call from multiple components — uses a counter so nested
 * overlays don't unlock prematurely.
 *
 * Uses position:fixed on body (the only approach that works reliably
 * on iOS Safari) and saves/restores scroll position.
 */
let lockCount = 0;
let savedScrollY = 0;

export function useScrollLock(locked: boolean) {
  // Track whether THIS instance currently holds a lock
  const holds = useRef(false);

  useEffect(() => {
    if (locked && !holds.current) {
      // --- acquire lock ---
      holds.current = true;
      if (lockCount === 0) {
        savedScrollY = window.scrollY;
        const scrollbarWidth =
          window.innerWidth - document.documentElement.clientWidth;

        document.documentElement.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.overflow = "hidden";
        // prevent layout shift from vanishing scrollbar
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      lockCount++;
    }

    if (!locked && holds.current) {
      // --- release lock ---
      holds.current = false;
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.documentElement.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        window.scrollTo(0, savedScrollY);
      }
    }

    // cleanup on unmount while still locked
    return () => {
      if (holds.current) {
        holds.current = false;
        lockCount--;
        if (lockCount <= 0) {
          lockCount = 0;
          document.documentElement.style.overflow = "";
          document.body.style.position = "";
          document.body.style.top = "";
          document.body.style.left = "";
          document.body.style.right = "";
          document.body.style.overflow = "";
          document.body.style.paddingRight = "";
          window.scrollTo(0, savedScrollY);
        }
      }
    };
  }, [locked]);
}
