"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DigitalGrowth {
  /** Eased 0→1 progress, read per-frame (e.g. shader uniform) without re-renders. */
  growthRef: React.MutableRefObject<number>;
  /** True during an active/finished reveal, false while replaying. */
  done: boolean;
  /** True once any reveal has ever finished (stays true across replays). */
  everDone: boolean;
  /** Kick off the reveal (called once fonts are ready). */
  start: () => void;
  /** Re-run the reveal from 0. */
  replay: () => void;
}

/**
 * Digital-growth driver: eased 0→1 over `duration` seconds, animated in
 * its own rAF loop so both the shader (via growthRef) and the UI (via
 * `done`) can consume it. The glyph-level "patches" look comes from the
 * noise mask in the ASCII shader; this only supplies the eased value.
 */
export function useDigitalGrowth(duration: number): DigitalGrowth {
  const growthRef = useRef(0);
  const rafRef = useRef(0);
  const [done, setDone] = useState(false);
  const [everDone, setEverDone] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const start = useCallback(() => {
    stop();
    setDone(false);
    growthRef.current = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / (duration * 1000));
      growthRef.current = 1 - Math.pow(1 - t, 3); // ease-out cubic
      if (t >= 1) {
        setDone(true);
        setEverDone(true);
        return; // loop ends
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop, duration]);

  useEffect(() => stop, [stop]);

  return { growthRef, done, everDone, start, replay: start };
}
