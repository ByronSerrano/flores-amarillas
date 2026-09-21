/**
 * Tuning knobs for the ASCII bouquet experience.
 * Everything visual lives here so the scene code stays readable.
 */

export const flowerConfig = {
  /** ASCII glyph ramp: dark/empty → bright/dense. Index maps to luma. */
  asciiRamp: " .·:;=+*#%@",

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

  /** Pollen particles per tier. Boosted brightness so they survive the low-res ASCII sampling (R-5). */
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
    flowers: 7,
    petalsPerFlower: 14,
    petalsPerFlowerMobile: 9,
    petalColor: "#ffd94a",
    petalCenterColor: "#9a6a10",
    stemColor: "#7fae5e",
    vaseColor: "#9a7c52",
    leafColor: "#79b062",
  },

  /** CRT / glitch look, folded into the ASCII shader. */
  crt: {
    scanlineIntensity: 0.22,
    chromaticAberration: 0.0015,
    /** Probability per second of a glitch burst, and its duration. */
    glitchChance: 0.5,
    glitchDuration: 0.12,
  },

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
