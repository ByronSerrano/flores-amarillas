"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import BouquetScene from "./BouquetScene";
import AsciiPostFX from "./AsciiPostFX";
import { whenFontsReady } from "./shaders/glyphAtlas";
import Letter from "@/components/Letter/Letter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDigitalGrowth } from "@/hooks/useDigitalGrowth";
import { flowerConfig } from "@/constants/flowerConfig";

/**
 * Client shell for the whole experience: Canvas + ASCII pass + letter
 * stage. Everything is 'use client'; the R3F tree mounts only after the
 * mono font is ready so the glyph atlas is drawn with the right metrics.
 */
export default function Bouquet() {
  const isMobile = useIsMobile();
  /** Resolved only after the mono webfont has actually loaded (R-2). */
  const [font, setFont] = useState<{ ready: boolean; family: string }>({
    ready: false,
    family: "monospace",
  });
  const [letterHidden, setLetterHidden] = useState(false);
  const { growthRef, done, start, replay } = useDigitalGrowth(
    flowerConfig.growthDuration,
  );

  useEffect(() => {
    let cancelled = false;
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-geist-mono")
        .trim() || '"Geist Mono", ui-monospace, monospace';
    whenFontsReady(family).then(() => {
      if (cancelled) return;
      setFont({ ready: true, family });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (font.ready) start();
  }, [font.ready, start]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <Canvas
        dpr={flowerConfig.render.dpr}
        camera={{
          position: [
            0,
            flowerConfig.render.cameraY,
            isMobile ? flowerConfig.render.cameraZMobile : flowerConfig.render.cameraZ,
          ],
          fov: isMobile ? flowerConfig.render.fovMobile : flowerConfig.render.fov,
        }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[flowerConfig.paper]} />
        {font.ready && (
          <>
            <BouquetScene isMobile={isMobile} growthDone={done} />
            <AsciiPostFX
              growthRef={growthRef}
              isMobile={isMobile}
              fontFamily={font.family}
            />
          </>
        )}
        <AdaptiveDpr pixelated />
      </Canvas>

      <Letter
        growthStarted={font.ready}
        hidden={letterHidden}
        onDismiss={() => setLetterHidden(true)}
      />

      {/* Restore letter — only visible once the letter stage is dismissed */}
      <div
        className={`absolute right-4 bottom-4 z-30 transition-opacity duration-500 ${
          letterHidden ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setLetterHidden(false)}
          className="cursor-pointer rounded-lg border border-stone-300 bg-white/70 px-4 py-2 text-sm text-stone-600 backdrop-blur transition hover:border-stone-400 hover:text-stone-800"
        >
          Ver la carta ✉️
        </button>
      </div>

      {/* Replay the digital-growth reveal */}
      <button
        type="button"
        onClick={replay}
        aria-label="Repetir animación"
        className="absolute top-4 right-4 z-30 cursor-pointer rounded-lg border border-stone-300 bg-white/70 px-3 py-1.5 text-xs text-stone-600 backdrop-blur transition hover:border-stone-400 hover:text-stone-800"
      >
        replay ✨
      </button>
    </div>
  );
}
