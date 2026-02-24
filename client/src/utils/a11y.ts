/**
 * Accessibility Utilities
 * Helper functions for keyboard navigation, focus management, and ARIA attributes
 */

import { RefObject, useCallback, useEffect, useState, useRef } from "react";
import { KEYBOARD_SHORTCUTS, A11Y_CONFIG } from "@/constants/database";

// ========================
// KEYBOARD NAVIGATION
// ========================

export type KeyboardModifier = "ctrl" | "shift" | "alt" | "meta";

export interface KeyboardEventData {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Parse keyboard event from keyboard shortcut config
 */
export const parseKeyboardEvent = (
  event: React.KeyboardEvent,
): KeyboardEventData => {
  return {
    key: event.key.toLowerCase(),
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
};

/**
 * Check if keyboard event matches shortcut
 */
export const matchesShortcut = (
  event: KeyboardEventData,
  shortcut: (typeof KEYBOARD_SHORTCUTS)[keyof typeof KEYBOARD_SHORTCUTS],
): boolean => {
  return (
    (event.key === shortcut.key.toLowerCase() &&
      event.ctrl === shortcut.ctrl &&
      event.shift === shortcut.shift &&
      event.alt === (shortcut as any).alt) ??
    false
  );
};

/**
 * Hook for handling keyboard shortcuts
 */
export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  options?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    enabled?: boolean;
  },
): void => {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    enabled = true,
  } = options ?? {};

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: Event) => {
      const nativeEvent = e as unknown as KeyboardEvent;
      const eventKey = nativeEvent.key.toLowerCase();
      const matches =
        eventKey === key.toLowerCase() &&
        (nativeEvent.ctrlKey || nativeEvent.metaKey) === ctrl &&
        nativeEvent.shiftKey === shift &&
        nativeEvent.altKey === alt;

      if (matches) {
        nativeEvent.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, ctrl, shift, alt, meta, enabled]);
};

/**
 * Hook for handling Escape key to close modals
 */
export const useEscapeKey = (
  callback: () => void,
  enabled: boolean = true,
): void => {
  useKeyboardShortcut("Escape", callback, { enabled });
};

/**
 * Hook for handling Enter key confirmation
 */
export const useEnterKey = (
  callback: () => void,
  enabled: boolean = true,
): void => {
  useKeyboardShortcut("Enter", callback, { enabled });
};

/**
 * Hook for handling Tab key navigation
 */
export const useTabNavigation = (
  elements: (HTMLElement | null)[],
  onNavigate?: (index: number) => void,
): void => {
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const nativeEvent = e as unknown as KeyboardEvent;
      if (nativeEvent.key !== "Tab") return;

      const focusedElement = document.activeElement;
      const focusableElements = elements.filter((el) => el !== null);

      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.indexOf(
        focusedElement as HTMLElement,
      );
      let nextIndex: number;

      if (nativeEvent.shiftKey) {
        // Shift+Tab: move to previous
        nextIndex =
          currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      } else {
        // Tab: move to next
        nextIndex =
          currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
      }

      nativeEvent.preventDefault();
      focusableElements[nextIndex]?.focus();
      onNavigate?.(nextIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elements, onNavigate]);
};

// ========================
// FOCUS MANAGEMENT
// ========================

/**
 * Hook for managing focus on mount
 */
export const useFocusOnMount = (ref: RefObject<HTMLElement>): void => {
  useEffect(() => {
    if (ref.current) {
      const focusableElement = ref.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ) as HTMLElement;

      if (focusableElement) {
        focusableElement.focus();
      } else {
        ref.current.focus();
      }
    }
  }, [ref]);
};

/**
 * Hook for managing focus restore on unmount
 */
export const useFocusRestore = (
  isOpen: boolean,
  ref: RefObject<HTMLElement>,
): void => {
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveRef.current = document.activeElement as HTMLElement;
      useFocusOnMount(ref);
    } else {
      previousActiveRef.current?.focus();
    }
  }, [isOpen, ref]);
};

/**
 * Hook for trapping focus within an element
 */
export const useFocusTrap = (
  ref: RefObject<HTMLElement>,
  enabled: boolean = true,
): void => {
  useEffect(() => {
    if (!enabled || !ref.current) return;

    const handleKeyDown = (e: Event) => {
      const nativeEvent = e as unknown as KeyboardEvent;
      if (nativeEvent.key !== "Tab") return;

      const focusableElements = Array.from(
        ref.current!.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ) as HTMLElement[];

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const focusedElement = document.activeElement as HTMLElement;

      if (nativeEvent.shiftKey) {
        // Shift+Tab on first element: focus last
        if (focusedElement === firstElement) {
          nativeEvent.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab on last element: focus first
        if (focusedElement === lastElement) {
          nativeEvent.preventDefault();
          firstElement.focus();
        }
      }
    };

    ref.current.addEventListener("keydown", handleKeyDown);
    return () => ref.current?.removeEventListener("keydown", handleKeyDown);
  }, [ref, enabled]);
};

// ========================
// ARIA ATTRIBUTES
// ========================

/**
 * Generate aria-label for button
 */
export const generateAriaLabel = (
  action: string,
  target?: string,
  state?: string,
): string => {
  const parts = [action];
  if (target) parts.push(target);
  if (state) parts.push(`(${state})`);
  return parts.join(" ");
};

/**
 * Generate aria-describedby for form fields
 */
export const generateAriaDescribedBy = (
  baseId: string,
  hasError: boolean,
  hasHint: boolean,
): string => {
  const ids = [];
  if (hasError) ids.push(`${baseId}-error`);
  if (hasHint) ids.push(`${baseId}-hint`);
  return ids.join(" ");
};

/**
 * Get accessible label for status
 */
export const getStatusLabel = (status: string, details?: string): string => {
  const statusMap: Record<string, string> = {
    connecting: "Connecting to database",
    connected: "Connected to database",
    disconnected: "Disconnected from database",
    error: "Database connection error",
    loading: "Loading data",
    success: "Operation successful",
    failure: "Operation failed",
  };

  const label = statusMap[status] || status;
  return details ? `${label}: ${details}` : label;
};

// ========================
// ANNOUNCEMENT & ALERTS
// ========================

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: "polite" | "assertive" = "polite",
): void => {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only"; // Hidden from visual display
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    announcement.remove();
  }, 1000);
};

/**
 * Hook for announcing changes
 */
export const useAnnouncement = (
  message: string,
  priority: "polite" | "assertive" = "polite",
): void => {
  useEffect(() => {
    if (message) {
      announceToScreenReader(message, priority);
    }
  }, [message, priority]);
};

// ========================
// FORM ACCESSIBILITY
// ========================

/**
 * Get accessible error message for form field
 */
export const getFieldErrorMessage = (
  fieldName: string,
  error: string | undefined,
): string => {
  if (!error) return "";
  return `${fieldName}: ${error}`;
};

/**
 * Hook for managing form field focus on error
 */
export const useFormFieldFocusOnError = (
  hasError: boolean,
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
): void => {
  useEffect(() => {
    if (hasError && ref.current) {
      ref.current.focus();
      ref.current.setAttribute("aria-invalid", "true");
    } else if (ref.current) {
      ref.current.setAttribute("aria-invalid", "false");
    }
  }, [hasError, ref]);
};

// ========================
// MODAL ACCESSIBILITY
// ========================

/**
 * Hook for managing modal focus and backdrop click
 */
export const useModalAccessibility = (
  isOpen: boolean,
  ref: RefObject<HTMLElement>,
  onClose: () => void,
): void => {
  useFocusRestore(isOpen, ref);
  useFocusTrap(ref, isOpen);
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Backdrop click
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === ref.current) {
        onClose();
      }
    };

    ref.current.addEventListener("click", handleBackdropClick);
    return () => ref.current?.removeEventListener("click", handleBackdropClick);
  }, [isOpen, ref, onClose]);
};

// ========================
// SKIP LINKS
// ========================

/**
 * Generate skip link for keyboard navigation
 */
export const createSkipLink = (): HTMLElement => {
  const link = document.createElement("a");
  link.href = `#${A11Y_CONFIG.MAIN_CONTENT_ID}`;
  link.className = "sr-only focus:not-sr-only";
  link.textContent = "Skip to main content";
  return link;
};

// ========================
// SCREEN READER HELPERS
// ========================

/**
 * Hide element from screen readers
 */
export const hideFromScreenReaders = (element: HTMLElement): void => {
  element.setAttribute("aria-hidden", "true");
};

/**
 * Show element to screen readers
 */
export const showToScreenReaders = (element: HTMLElement): void => {
  element.removeAttribute("aria-hidden");
};

/**
 * Check if element is hidden from screen readers
 */
export const isHiddenFromScreenReaders = (element: HTMLElement): boolean => {
  return element.getAttribute("aria-hidden") === "true";
};

// ========================
// EXPORTS
// ========================

export const a11yUtils = {
  parseKeyboardEvent,
  matchesShortcut,
  generateAriaLabel,
  generateAriaDescribedBy,
  getStatusLabel,
  getFieldErrorMessage,
  announceToScreenReader,
  createSkipLink,
  hideFromScreenReaders,
  showToScreenReaders,
  isHiddenFromScreenReaders,
} as const;
