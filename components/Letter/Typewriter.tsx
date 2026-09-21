"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  text: string;
  /** Characters per second. */
  speed?: number;
  /** Called once the full text is visible. */
  onComplete?: () => void;
  className?: string;
}

/**
 * Character-by-character reveal driven by rAF. Slicing by code points
 * (Array.from) keeps accented chars and emoji from splitting mid-grapheme.
 */
export default function Typewriter({
  text,
  speed = 28,
  onComplete,
  className,
}: TypewriterProps) {
  const [visible, setVisible] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Keep the latest callback without re-subscribing the rAF loop.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const total = Array.from(text).length;
    if (total === 0) return;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let count = 0;
    let first = true;

    const tick = (now: number) => {
      if (first) {
        // Reset stale `visible` from a previous text inside the rAF
        // callback (never synchronously in the effect body).
        first = false;
        setVisible(0);
      }
      acc += ((now - last) / 1000) * speed;
      last = now;
      if (acc >= 1) {
        const step = Math.floor(acc);
        acc -= step;
        count = Math.min(total, count + step);
        setVisible(count);
        if (count >= total) return; // done — stop the loop
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, speed]);

  const chars = Array.from(text);
  const done = visible >= chars.length;

  useEffect(() => {
    if (done) onCompleteRef.current?.();
  }, [done]);

  return (
    <span className={className}>
      {chars.slice(0, visible).join("")}
      {!done && <span className="animate-pulse">▌</span>}
    </span>
  );
}
