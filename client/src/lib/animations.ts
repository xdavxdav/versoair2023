/**
 * Shared Framer Motion animation variants
 * Import these across all pages for consistent, performant animations.
 */
import type { Variants, Transition } from "framer-motion";

// ─── Timing helpers ──────────────────────────────────────────────
export const DURATIONS = {
  fast: 0.3,
  normal: 0.5,
  slow: 0.7,
  xslow: 1.0,
} as const;

export const EASE = {
  smooth: [0.25, 0.1, 0.25, 1.0] as number[],
  spring: { type: "spring", stiffness: 300, damping: 24 } as Transition,
  bounce: { type: "spring", stiffness: 400, damping: 17 } as Transition,
};

// ─── Fade variants ───────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATIONS.normal } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASE.smooth },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASE.smooth },
  },
};

// ─── Slide variants ──────────────────────────────────────────────
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATIONS.normal, ease: EASE.smooth },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATIONS.normal, ease: EASE.smooth },
  },
};

// ─── Scale variants ──────────────────────────────────────────────
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATIONS.fast, ease: EASE.smooth },
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: EASE.bounce,
  },
};

// ─── Stagger containers ─────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

// ─── Stagger item (child of stagger container) ──────────────────
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.fast, ease: EASE.smooth },
  },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATIONS.fast, ease: EASE.smooth },
  },
};

// ─── Page / Section transitions ──────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATIONS.fast, when: "beforeChildren" },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.slow, ease: EASE.smooth },
  },
};

// ─── Card hover helpers (use with whileHover) ────────────────────
export const cardHover = {
  scale: 1.03,
  y: -6,
  transition: { duration: 0.25, ease: EASE.smooth },
};

export const cardHoverSubtle = {
  scale: 1.015,
  y: -3,
  transition: { duration: 0.2, ease: EASE.smooth },
};

export const cardTap = {
  scale: 0.98,
};

// ─── Viewport trigger defaults ───────────────────────────────────
export const defaultViewport = { once: true, margin: "-80px" as any };
export const earlyViewport = { once: true, margin: "-40px" as any };
