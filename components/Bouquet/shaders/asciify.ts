/**
 * ASCII post-process shaders (light mode).
 *
 * The scene is rendered into a low-res render target with exactly one
 * texel per ASCII cell. For each output cell the fragment shader reads
 * the cell's luminance, picks a glyph from the ramp (density grows with
 * DARKNESS — the paper background stays empty, the bouquet blooms),
 * looks it up in the atlas, and composites ink over paper with the
 * noise-masked tender growth reveal. The quad then fades out (uFade
 * 0→1) over the crisp 3D scene rendered behind it on screen, dissolving
 * the glyphs into the real bouquet.
 *
 * The v1 CRT look (scanlines, chromatic aberration, glitch bands,
 * phosphor tint) was removed entirely, not zeroed.
 */

export const asciifyVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const asciifyFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uScene;  // low-res RT: 1 texel per cell
uniform sampler2D uAtlas;  // single-row glyph atlas
uniform vec2 uGrid;        // (columns, rows)
uniform float uGrowth;     // 0..1 tender growth
uniform float uRamp;       // glyph count
uniform vec3 uPaper;       // paper color for empty cells
uniform vec3 uInk;         // warm ink color
uniform float uInkDarken;  // 0 = keep scene tint, 1 = flat ink
uniform float uFade;       // 0 = ASCII entry (opaque quad), 1 = crisp bouquet revealed

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;

  vec2 cell = floor(uv * uGrid);
  vec2 cellUv = (cell + 0.5) / uGrid;

  // Tender growth: glyphs appear in noisy patches, never in rows.
  float n = hash(floor(cell / 6.0)) * 0.65 + hash(cell) * 0.35;
  float reveal = smoothstep(n, n + 0.25, uGrowth * 1.25);

  // Darkness-dependent density: darker cells pick denser glyphs, so the
  // cream background (bright) stays empty and the bouquet blooms.
  // Exponent retuned for the inverted mapping (v1 used pow(l, 0.8) on
  // brightness); expect one visual tuning pass.
  // 4 taps per cell: the RT runs at 2x the grid, so this averages a
  // 2x2 texel block — thin geometry (stems) survives the sampling.
  vec2 h = 0.25 / uGrid;
  float l = (luma(texture2D(uScene, cellUv + vec2(h.x, h.y)).rgb) +
             luma(texture2D(uScene, cellUv + vec2(-h.x, h.y)).rgb) +
             luma(texture2D(uScene, cellUv + vec2(h.x, -h.y)).rgb) +
             luma(texture2D(uScene, cellUv - vec2(h.x, h.y)).rgb)) * 0.25;
  float idx = clamp(floor(pow(1.0 - l, 0.7) * uRamp), 0.0, uRamp - 1.0);

  // Glyph lookup inside the cell (atlas is a single row).
  vec2 g = fract(uv * uGrid);
  float glyph = texture2D(uAtlas, vec2((idx + g.x) / uRamp, g.y)).a;

  // Ink derives from the cell's own tint, darkened toward the warm ink
  // color so it keeps contrast against the cream paper.
  vec3 tint = texture2D(uScene, cellUv).rgb;
  vec3 ink = mix(tint, uInk, uInkDarken);

  // Near-empty (bright) cells show pure paper.
  float gate = smoothstep(0.02, 0.10, 1.0 - l);

  vec3 color = mix(uPaper, ink, glyph * reveal * gate);
  // Cross-fade: the crisp 3D scene renders to the screen behind this
  // quad, so fading the quad's alpha dissolves the glyphs into the
  // real bouquet. At uFade = 0 the quad is fully opaque (entry unchanged).
  gl_FragColor = vec4(color, 1.0 - uFade);
}
`;
