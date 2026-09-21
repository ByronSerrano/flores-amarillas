"use client";

import * as THREE from "three";

export interface GlyphAtlas {
  texture: THREE.CanvasTexture;
  /** Number of glyphs in the ramp (atlas is a single row). */
  count: number;
}

/**
 * Wait until the webfont is actually loaded before drawing the atlas (R-2):
 * drawing too early silently uses the fallback font and the glyph metrics
 * no longer match the shader's UV math.
 */
export async function whenFontsReady(fontFamily: string): Promise<void> {
  try {
    if (typeof document === "undefined") return;
    await Promise.all([document.fonts.load(`64px ${fontFamily}`), document.fonts.ready]);
  } catch {
    // Fall back to whatever mono font is available.
  }
}

/**
 * Symbol-font fallbacks appended to the primary mono font: Geist Mono may lack
 * the tender glyphs (♡ ✿ ❀), and Canvas2D does per-glyph fallback at raster
 * time. Note: `document.fonts.load` only validates the FIRST family, so a
 * visual atlas check (no `.notdef` boxes) is required after building.
 */
export const ATLAS_FONT_FALLBACKS =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", monospace';

/**
 * Builds a single-row glyph atlas on a Canvas2D surface: `ramp.length`
 * cells, one glyph each, white on transparent. The shader reads each
 * cell's alpha channel as the glyph mask.
 */
export function buildGlyphAtlas(ramp: string, fontFamily: string, cellPx = 64): GlyphAtlas {
  const count = Array.from(ramp).length;
  const canvas = document.createElement("canvas");
  canvas.width = cellPx * count;
  canvas.height = cellPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for glyph atlas");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(cellPx * 0.85)}px ${fontFamily}, ${ATLAS_FONT_FALLBACKS}`;
  Array.from(ramp).forEach((ch, i) => {
    ctx.fillText(ch, i * cellPx + cellPx / 2, cellPx / 2 + cellPx * 0.03);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  return { texture, count };
}
