"use client";

import { useState } from "react";
import Typewriter from "./Typewriter";
import { letterParagraphs, letterTitle } from "@/constants/loveLetter";

interface LetterProps {
  /** True once the bouquet's growth reveal has STARTED (typing is concurrent, not post-growth). */
  growthStarted: boolean;
  onDismiss: () => void;
  hidden: boolean;
}

/**
 * Full-screen letter stage shown over the bouquet. Typing is sequential:
 * title first, then each paragraph. Nothing types until the bouquet's
 * initial growth reveal has finished (`growthDone`).
 */
export default function Letter({ growthStarted, onDismiss, hidden }: LetterProps) {
  /** 0 = typing title; i+1 = typing paragraph i; done = everything typed. */
  const [stage, setStage] = useState(0);
  const allTyped = stage > letterParagraphs.length;

  const start = growthStarted ? 0 : -1;

  return (
    <div
      aria-hidden={hidden}
      className={`absolute inset-0 z-20 flex items-center justify-center p-4 transition-all duration-700 ${
        hidden ? "pointer-events-none translate-y-6 opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-yellow-200/20 bg-black/75 font-mono text-sm leading-relaxed text-yellow-50/90 shadow-[0_0_60px_rgba(234,179,8,0.12)] backdrop-blur-md sm:text-base">
        <div className="overflow-y-auto px-8 py-8">
          <h1 className="mb-6 text-lg font-semibold text-yellow-300 sm:text-xl">
            {start < 0 ? null : (
              <Typewriter
                text={letterTitle}
                speed={18}
                onComplete={() => setStage(1)}
              />
            )}
            {start < 0 && <span className="opacity-0">.</span>}
          </h1>
          {letterParagraphs.map((p, i) => {
            const active = stage === i + 1;
            const typed = stage > i + 1;
            return (
              <p key={i} className="mb-4 last:mb-2">
                {start < 0 ? (
                  <span className="opacity-0">{p}</span>
                ) : active ? (
                  <Typewriter
                    text={p}
                    speed={32}
                    onComplete={() => setStage(i + 2)}
                  />
                ) : typed ? (
                  p
                ) : (
                  <span className="opacity-0">{p}</span>
                )}
              </p>
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between border-t border-yellow-200/10 px-6 py-4 transition-opacity duration-500 ${
            allTyped ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-xs text-yellow-200/50">21 de septiembre</span>
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer rounded-lg border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-sm text-yellow-200 transition hover:bg-yellow-300/20 hover:text-yellow-100"
          >
            Ver las flores 🌻
          </button>
        </div>
      </div>
    </div>
  );
}
