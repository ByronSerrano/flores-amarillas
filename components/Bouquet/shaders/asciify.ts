/**
 * ASCII post-process shaders.
 *
 * The scene is rendered into a low-res render target with exactly one
 * texel per ASCII cell. For each output cell the fragment shader reads
 * the cell's luminance, picks a glyph from the ramp (density grows with
 * light), looks it up in the atlas, and applies the CRT look (scanlines,
 * chromatic aberration, glitch bands) plus the noise-masked digital
 * growth reveal.
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
uniform vec2 uRes;         // output resolution in px
uniform float uTime;
uniform float uGrowth;     // 0..1 digital growth
uniform float uGlitch;     // 0..1 burst intensity
uniform float uScanline;   // scanline intensity
uniform float uCA;         // chromatic aberration uv offset
uniform float uRamp;       // glyph count

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;

  // Glitch: shift whole bands of rows sideways for a few frames.
  float row = floor(uv.y * uGrid.y);
  float band = floor(uTime * 18.0);
  float shift = (hash(vec2(row, band)) - 0.5) * 0.12 * uGlitch;
  uv.x = fract(uv.x + shift);

  vec2 cell = floor(uv * uGrid);
  vec2 cellUv = (cell + 0.5) / uGrid;

  // Digital growth: glyphs appear in noisy patches, never in rows.
  float n = hash(floor(cell / 6.0)) * 0.65 + hash(cell) * 0.35;
  float reveal = smoothstep(n, n + 0.25, uGrowth * 1.25);

  // Light-dependent density: brighter cells pick denser glyphs.
  // 4 taps per cell: the RT runs at 2x the grid, so this averages a
  // 2x2 texel block — thin geometry (stems) survives the sampling.
  vec2 h = 0.25 / uGrid;
  float l = (luma(texture2D(uScene, cellUv + vec2(h.x, h.y)).rgb) +
             luma(texture2D(uScene, cellUv + vec2(-h.x, h.y)).rgb) +
             luma(texture2D(uScene, cellUv + vec2(h.x, -h.y)).rgb) +
             luma(texture2D(uScene, cellUv - vec2(h.x, h.y)).rgb)) * 0.25;
  float idx = clamp(floor(pow(l, 0.8) * uRamp), 0.0, uRamp - 1.0);

  // Glyph lookup inside the cell (atlas is a single row).
  vec2 g = fract(uv * uGrid);
  float glyph = texture2D(uAtlas, vec2((idx + g.x) / uRamp, g.y)).a;

  // Chromatic aberration on the tint, sampled from the scene RT.
  vec2 ca = vec2(uCA * (1.0 + uGlitch * 6.0), 0.0);
  float r = luma(texture2D(uScene, cellUv + ca).rgb);
  float b = luma(texture2D(uScene, cellUv - ca).rgb);
  vec3 tint = vec3(r, l, b);

  // Scanlines across the output resolution.
  float scan = 1.0 - uScanline * (0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159));

  // Near-empty cells stay dark (spare glyph == empty screen).
  float gate = smoothstep(0.01, 0.05, l);

  vec3 color = tint * glyph * scan * reveal * gate;
  color = mix(color, color * vec3(1.05, 1.0, 0.75), 0.35); // warm phosphor
  gl_FragColor = vec4(color, 1.0);
}
`;
