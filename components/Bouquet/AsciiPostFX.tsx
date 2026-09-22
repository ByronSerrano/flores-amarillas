"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { asciifyFragment, asciifyVertex } from "./shaders/asciify";
import { buildGlyphAtlas } from "./shaders/glyphAtlas";
import { flowerConfig } from "@/constants/flowerConfig";

interface AsciiPostFXProps {
  growthRef: React.MutableRefObject<number>;
  /** Eased 0→1 ASCII→bouquet cross-fade (starts when growth completes). */
  fadeRef: React.MutableRefObject<number>;
  isMobile: boolean;
  /** Resolved font-family string used to draw the glyph atlas. */
  fontFamily: string;
}

const cfg = flowerConfig;

/**
 * ASCII post-process (R-1, manual render pipeline):
 *
 * R3F owns the default render loop, so this component takes over: a
 * `useFrame` with priority >= 1 disables auto-render and manually
 *   1. renders the live scene into a low-res WebGLRenderTarget
 *      (one texel per ASCII cell) — the glyph-sampling source,
 *   2. renders the live scene straight to the screen (crisp bouquet,
 *      hidden behind the opaque quad while uFade = 0), then
 *   3. renders a full-screen quad with the asciify ShaderMaterial
 *      (tender glyphs + growth, ink composited over paper) whose alpha
 *      is `1 - uFade`, so the cross-fade dissolves the glyphs into the
 *      crisp bouquet underneath.
 *
 * Once the fade completes (uFade = 1) steps 1 and 3 are skipped: the
 * resting frame is a single crisp scene render at full resolution.
 */
export default function AsciiPostFX({
  growthRef,
  fadeRef,
  isMobile,
  fontFamily,
}: AsciiPostFXProps) {
  const size = useThree((s) => s.size);

  // Grid derived from container size + cell metrics (R-4): no fixed dims.
  const { cols, rows } = useMemo(() => {
    const cellW = isMobile ? cfg.ascii.mobile.cellWidthPx : cfg.ascii.desktop.cellWidthPx;
    const cellH = cellW / cfg.ascii.cellAspect;
    return {
      cols: Math.max(32, Math.floor(size.width / cellW)),
      rows: Math.max(20, Math.floor(size.height / cellH)),
    };
  }, [size.width, size.height, isMobile]);

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      }),
    [],
  );
  // 2x the grid: thin geometry survives the per-cell 4-tap average.
  useEffect(() => rt.setSize(cols * 2, rows * 2), [rt, cols, rows]);
  useEffect(() => () => rt.dispose(), [rt]);

  const atlas = useMemo(() => buildGlyphAtlas(cfg.asciiRamp, fontFamily), [fontFamily]);
  useEffect(() => () => atlas.texture.dispose(), [atlas]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: asciifyVertex,
        fragmentShader: asciifyFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uScene: { value: rt.texture },
          uAtlas: { value: atlas.texture },
          uGrid: { value: new THREE.Vector2(1, 1) },
          uGrowth: { value: 0 },
          uRamp: { value: atlas.count },
          uPaper: { value: new THREE.Color(cfg.paper) },
          uInk: { value: new THREE.Color(cfg.inkColor) },
          uInkDarken: { value: cfg.inkDarken },
          uFade: { value: 0 },
        },
      }),
    [rt, atlas],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Grid is updated here, not in the useMemo above (R-4).
  useEffect(() => {
    material.uniforms.uGrid.value.set(cols, rows);
  }, [material, cols, rows]);

  // The render loop mutates uniforms; go through a ref set in an effect
  // so the hooks immutability rule sees no render-phase capture.
  const materialRef = useRef(material);
  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  // Full-screen quad in NDC (vertex shader ignores camera anyway).
  const quadScene = useMemo(() => {
    const s = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    s.add(mesh);
    return s;
  }, [material]);
  useEffect(() => {
    return () => {
      quadScene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    };
  }, [quadScene]);

  const quadCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uGrowth.value = growthRef.current;
    material.uniforms.uFade.value = fadeRef.current;

    // Crisp bouquet on screen: always (it hides behind the opaque quad
    // during the entry, and IS the resting state once the fade completes).
    state.gl.setRenderTarget(null);
    state.gl.render(state.scene, state.camera);

    if (material.uniforms.uFade.value >= 1) return; // resting: glyphs gone

    // 1) scene -> low-res RT (glyph sampling source)
    state.gl.setRenderTarget(rt);
    state.gl.render(state.scene, state.camera);
    // 2) ascii quad (alpha 1 - uFade) alpha-blends over the crisp scene.
    // autoClear stays OFF for this pass: the default clear would wipe the
    // bouquet just rendered to the framebuffer beneath the quad.
    state.gl.setRenderTarget(null);
    state.gl.autoClear = false;
    state.gl.render(quadScene, quadCam);
    state.gl.autoClear = true;
  }, 1);

  return null;
}
