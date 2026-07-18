"use client";

import { useEffect, useState } from "react";

/**
 * Reactively track the user's `prefers-reduced-motion` setting. Returns `false`
 * on the server / first paint (matching the default no-preference), then
 * updates on mount and whenever the OS preference changes.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}
