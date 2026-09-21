"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe mobile detection (R-3): media queries cannot be read
 * during SSR or the first client render without risking a hydration
 * mismatch. We render the desktop tier initially and switch after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
