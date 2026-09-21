"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { flowerConfig } from "@/constants/flowerConfig";

interface PollenProps {
  count: number;
  size: number;
  /** Start emitting only after the growth reveal (gated per plan). */
  active: boolean;
}

const cfg = flowerConfig.pollen;

/** Deterministic PRNG (mulberry32): random-looking pollen without impure render. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pollen motes: a single Points mesh drifting upward with sinusoidal
 * side-wobble, respawning at the bottom. Normal blending + warm gold so
 * the specks read against the cream paper (additive brightening is
 * invisible on a light background).
 */
export default function Pollen({ count, size, active }: PollenProps) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { geometry, speeds, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const rand = mulberry32(0xf10ae5 + count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() * 2 - 1) * cfg.bounds.x;
      positions[i * 3 + 1] = (rand() * 2 - 1) * cfg.bounds.y;
      positions[i * 3 + 2] = (rand() * 2 - 1) * cfg.bounds.z;
      const [r0, r1] = cfg.rise;
      speeds[i] = r0 + rand() * (r1 - r0);
      phases[i] = rand() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry, speeds, phases };
  }, [count]);

  useEffect(
    () => () => geometry.dispose(),
    [geometry],
  );

  useFrame((state, delta) => {
    if (!active) return;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] += Math.sin(t * 0.8 + phases[i]) * 0.15 * dt;
      arr[ix + 1] += speeds[i] * dt;
      arr[ix + 2] += Math.cos(t * 0.6 + phases[i]) * 0.1 * dt;
      if (arr[ix + 1] > cfg.bounds.y) {
        arr[ix] = (Math.random() * 2 - 1) * cfg.bounds.x;
        arr[ix + 1] = -cfg.bounds.y;
        arr[ix + 2] = (Math.random() * 2 - 1) * cfg.bounds.z;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={active} frustumCulled={false}>
      <pointsMaterial
        size={size}
        color="#d4a94e"
        transparent
        opacity={0.95}
        blending={THREE.NormalBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
