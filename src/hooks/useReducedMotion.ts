import { useReducedMotion as useMotionReducedMotion } from "motion/react";

/**
 * Hook to detect whether the user has requested the system to minimize
 * the amount of non-essential motion it uses.
 */
export function useReducedMotion(): boolean {
  return !!useMotionReducedMotion();
}

/**
 * Standard accessible motion presets aligned with DESIGN.md
 */
export const MOTION_PRESETS = {
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2, ease: "easeOut" },
  },
  modal: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
  drawer: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: { type: "spring", stiffness: 320, damping: 30 },
  },
  reduced: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.05 },
  },
};
