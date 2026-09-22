"use client";

import { useState } from "react";
import { Flower2 } from "lucide-react";
import Typewriter from "./Typewriter";
import PaperButton from "./PaperButton";
import { letterParagraphs, letterTitle } from "@/constants/loveLetter";

interface LetterProps {
  /** True once the bouquet's growth reveal has STARTED (typing is concurrent, not post-growth). */
  growthStarted: boolean;
  onDismiss: () => void;
  hidden: boolean;
}

/**
 * Paper letter over the bouquet. Typing is sequential: title first, then
 * each paragraph. Nothing types until growth has started.
 */
export default function Letter({ growthStarted, onDismiss, hidden }: LetterProps) {
  /** 0 = typing title; i+1 = typing paragraph i; done = everything typed. */
  const [stage, setStage] = useState(0);
  const allTyped = stage > letterParagraphs.length;

  const start = growthStarted ? 0 : -1;

  return (
    <div
      aria-hidden={hidden}
      className={`absolute inset-0 z-20 flex items-center justify-center p-4 ${
        hidden ? "pointer-events-none" : ""
      }`}
    >
      <div
        className={`absolute inset-0 bg-[#3a3226]/10 transition-opacity duration-700 ${
          hidden ? "opacity-0" : "opacity-100"
        }`}
      />

      <div
        className={`letter-stack relative w-full max-w-xl ${
          hidden ? "translate-y-10 opacity-0" : "letter-rise translate-y-0 opacity-100"
        }`}
      >
        <div className="relative z-10 flex max-h-[86vh] flex-col overflow-hidden rounded-sm border border-[#eadfce] bg-[#fffdf8] text-sm leading-relaxed text-[#3a3226] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_18px_50px_rgba(58,50,38,0.12)] sm:text-base">
          <div className="overflow-y-auto px-6 py-8 font-mono sm:px-10 sm:py-10">
            <p className="mb-6 text-right text-xs tracking-wide text-[#a89880]">
              21 de septiembre
            </p>
            <h1 className="text-lg text-[#6b4a1e] sm:text-xl">
              {start < 0 ? null : (
                <Typewriter
                  text={letterTitle}
                  speed={18}
                  onComplete={() => setStage(1)}
                />
              )}
              {start < 0 && <span className="opacity-0">.</span>}
            </h1>
            <div className="my-5 h-px bg-[#eadfce]" />
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
            className={`flex justify-center px-6 pb-8 transition-opacity duration-500 ${
              allTyped ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <PaperButton onClick={onDismiss}>
              <Flower2 size={16} strokeWidth={1.5} />
              Ver las flores
            </PaperButton>
          </div>
        </div>
      </div>
    </div>
  );
}
