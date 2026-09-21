/**
 * Tuning knobs for the ASCII bouquet experience.
 * Everything visual lives here so the scene code stays readable.
 */

export const flowerConfig = {
  /** ASCII glyph ramp: sparse/empty → dense/tender. Index maps to density
   *  (darker scene pixel = denser glyph). Composite lives in asciify.ts. */
  asciiRamp: " ·∘○◌♡✿❀❁❤",

  /**
   * ASCII grid sizing (R-4): the grid is derived from the container size
   * and the monospace cell aspect, NOT fixed dimensions, so glyphs never
   * stretch across viewports. `cellWidthPx` sets on-screen glyph size;
   * rows follow from the container aspect automatically.
   */
  ascii: {
    /** Approx. monospace cell height/width ratio (Geist Mono ≈ 0.6). */
    cellAspect: 0.6,
    // Mobile uses LARGER cells so narrow viewports render FEWER cells
    // (e.g. ~32×42 at 390×844 vs ~142×55 at 1280×800) — the tier reduces
    // the grid, it never increases it.
    desktop: { cellWidthPx: 9 },
    mobile: { cellWidthPx: 12 },
  },

  /** Digital growth: seconds from 0 → 1 when (re)triggered. */
  growthDuration: 2.5,

  /** Sway: frequency (rad/s) range and max rotation per flower group. */
  sway: { minFreq: 0.6, maxFreq: 1.2, maxTilt: 0.06 },

  /** Pointer interaction. */
  pointer: {
    /** Camera parallax travel, in world units. */
    parallax: 0.9,
    /** Distance (world units) under which a flower tilts toward the pointer. */
    proximity: 2.2,
    /** Max extra tilt (radians) from proximity. */
    proximityTilt: 0.18,
  },

  /** Pollen particles per tier. */
  pollen: {
    desktop: { count: 180, size: 0.04 },
    mobile: { count: 100, size: 0.045 },
    /** World-space drift box, hugging the bouquet (not the whole frustum). */
    bounds: { x: 2.4, y: 2.2, z: 1.2 },
    /** Rise speed range (units/s). */
    rise: [0.25, 0.7] as const,
  },

  /** Bouquet shape. `petalsPerFlower` is scaled down on mobile. */
  bouquet: {
    flowers: 9,
    petalsPerFlower: 18,
    petalsPerFlowerMobile: 12,
    petalColor: "#ffc857",
    petalCenterColor: "#a8721d",
    stemColor: "#7fae5e",
    vaseColor: "#9a7c52",
    leafColor: "#79b062",
  },

  /** Light-mode paper & ink. `paper` must stay in sync with `--background`
   *  in app/globals.css (no TS→CSS import exists). */
  paper: "#fdf6ec",
  /** How strongly dense glyphs darken toward the warm ink color
   *  (0 = keep scene tint, 1 = flat ink color). */
  inkDarken: 0.6,
  inkColor: "#3a3226",

  /** Render tuning. `cameraZMobile` + bouquet scale keep the fan in frame on portrait. */
  render: {
    dpr: [1, 1.5] as [number, number],
    cameraZ: 7,
    cameraZMobile: 7,
    cameraY: -0.4,
    fov: 45,
    fovMobile: 52,
    mobileBouquetScale: 0.8,
  },
} as const;
