"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { Mail, RotateCcw } from "lucide-react";
import BouquetScene from "./BouquetScene";
import AsciiPostFX from "./AsciiPostFX";
import { whenFontsReady } from "./shaders/glyphAtlas";
import Letter from "@/components/Letter/Letter";
import PaperButton from "@/components/Letter/PaperButton";
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
  const { growthRef, fadeRef, done, start, replay } = useDigitalGrowth(
    flowerConfig.growthDuration,
    flowerConfig.fadeDuration,
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
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[flowerConfig.paper]} />
        {font.ready && (
          <>
            <BouquetScene isMobile={isMobile} growthDone={done} />
            <AsciiPostFX
              growthRef={growthRef}
              fadeRef={fadeRef}
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

      <div
        className={`absolute right-4 bottom-4 z-30 transition-all duration-500 ease-out ${
          letterHidden
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <PaperButton onClick={() => setLetterHidden(false)}>
          <Mail size={16} strokeWidth={1.5} />
          Ver la carta
        </PaperButton>
      </div>

      <PaperButton
        shape="circle"
        onClick={replay}
        aria-label="Repetir animación"
        className="absolute top-4 right-4 z-30"
      >
        <RotateCcw size={16} strokeWidth={1.5} />
      </PaperButton>
    </div>
  );
}
