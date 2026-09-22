"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Pollen from "./Pollen";
import { flowerConfig } from "@/constants/flowerConfig";

interface BouquetSceneProps {
  isMobile: boolean;
  growthDone: boolean;
}

const cfg = flowerConfig;
const UP = new THREE.Vector3(0, 1, 0);
const VASE_MOUTH = new THREE.Vector3(0, -1.35, 0);

/** Teardrop petal, cupped toward the camera so the head has volume. */
function makePetalGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.bezierCurveTo(0.2, 0.12, 0.3, 0.48, 0.045, 1.02);
  shape.quadraticCurveTo(0, 1.12, -0.045, 1.02);
  shape.bezierCurveTo(-0.3, 0.48, -0.2, 0.12, 0, 0.02);
  const geo = new THREE.ShapeGeometry(shape, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    // Tip curls back; edges lift so the petal isn't a flat card.
    pos.setZ(i, -y * y * 0.22 + Math.abs(x) * 0.12);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Pointed leaf in the XY plane (tip along +Y). */
function makeLeafGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.16, 0.08, 0.28, 0.32, 0.06, 0.72);
  shape.quadraticCurveTo(0, 0.84, -0.06, 0.72);
  shape.bezierCurveTo(-0.22, 0.32, -0.12, 0.08, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 8);
  geo.computeVertexNormals();
  return geo;
}

const PETAL_GEO = makePetalGeometry();
const LEAF_GEO = makeLeafGeometry();
const SEED_GEO = new THREE.SphereGeometry(0.016, 6, 5);

function petalMaterial(seed: number): THREE.MeshStandardMaterial {
  const color = new THREE.Color(cfg.bouquet.petalColor);
  color.offsetHSL(((seed % 5) - 2) * 0.012, 0.05, ((seed % 3) - 1) * 0.035);
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    roughness: 0.58,
    metalness: 0.02,
  });
}

/** Two cupped rings of petals, a seed disk, and a ring of florets. */
function FlowerHead({ count, seed }: { count: number; seed: number }) {
  const { outer, inner, seeds, material, seedMaterial } = useMemo(() => {
    const material = petalMaterial(seed);
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: "#8a5a1c",
      roughness: 0.65,
    });
    const innerCount = Math.max(6, Math.round(count * 0.55));

    const place = (
      n: number,
      radius: number,
      scale: THREE.Vector3,
      tilt: number,
      angleOffset: number,
    ) => {
      const im = new THREE.InstancedMesh(PETAL_GEO, material, n);
      const m = new THREE.Matrix4();
      const radial = new THREE.Quaternion();
      const tiltQ = new THREE.Quaternion();
      const q = new THREE.Quaternion();
      const zAxis = new THREE.Vector3(0, 0, 1);
      const xAxis = new THREE.Vector3(1, 0, 0);
      const pos = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        const a = angleOffset + (i / n) * Math.PI * 2;
        const len = 0.9 + ((i * 17 + seed) % 7) / 35;
        radial.setFromAxisAngle(zAxis, a);
        // Positive X tilt brings the tip toward the camera (+Z).
        tiltQ.setFromAxisAngle(xAxis, tilt);
        q.copy(radial).multiply(tiltQ);
        pos.set(0, radius, 0.03).applyQuaternion(radial);
        m.compose(pos, q, new THREE.Vector3(scale.x, scale.y * len, scale.z));
        im.setMatrixAt(i, m);
      }
      im.instanceMatrix.needsUpdate = true;
      return im;
    };

    const outer = place(count, 0.1, new THREE.Vector3(0.46, 0.62, 1), 0.38, 0);
    const inner = place(
      innerCount,
      0.06,
      new THREE.Vector3(0.32, 0.4, 1),
      0.62,
      Math.PI / innerCount,
    );

    const seeds = new THREE.InstancedMesh(SEED_GEO, seedMaterial, 14);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const ring = i % 2 === 0 ? 0.1 : 0.055;
      m.compose(
        new THREE.Vector3(Math.cos(a) * ring, Math.sin(a) * ring, 0.1),
        q,
        new THREE.Vector3(1, 1, 0.7),
      );
      seeds.setMatrixAt(i, m);
    }
    seeds.instanceMatrix.needsUpdate = true;

    return { outer, inner, seeds, material, seedMaterial };
  }, [count, seed]);

  useEffect(() => {
    return () => {
      material.dispose();
      seedMaterial.dispose();
    };
  }, [material, seedMaterial]);

  return (
    <group>
      <primitive object={outer} />
      <primitive object={inner} />
      <mesh position={[0, 0, 0.045]} scale={[1, 1, 0.42]}>
        <sphereGeometry args={[0.16, 18, 12]} />
        <meshStandardMaterial color={cfg.bouquet.petalCenterColor} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, 0.09]} scale={[1, 1, 0.55]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#6b3f12" roughness={0.8} />
      </mesh>
      <primitive object={seeds} />
    </group>
  );
}

/** Gently curved stem from the vase mouth, with a pair of real leaves. */
function Stem({ to }: { to: THREE.Vector3 }) {
  const built = useMemo(() => {
    const end = to.clone();
    const ctrl = end.clone().multiplyScalar(0.5);
    ctrl.x += Math.sign(end.x || 1) * 0.22;
    ctrl.z += 0.16;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), ctrl, end);
    const geo = new THREE.TubeGeometry(curve, 14, 0.026, 6, false);

    const leaves = [0.4, 0.6].map((t, i) => {
      const sign = i === 0 ? 1 : -1;
      const pos = curve.getPoint(t);
      const out = new THREE.Vector3(sign, -0.42, sign * 0.25).normalize();
      pos.addScaledVector(out, 0.04);
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, out);
      const leafGeo = LEAF_GEO.clone();
      return { pos, quat, leafGeo, scale: i === 0 ? 0.42 : 0.32 };
    });

    return { geo, leaves };
  }, [to]);

  useEffect(() => {
    return () => {
      built.geo.dispose();
      for (const leaf of built.leaves) leaf.leafGeo.dispose();
    };
  }, [built]);

  return (
    <group>
      <mesh geometry={built.geo}>
        <meshStandardMaterial color={cfg.bouquet.stemColor} roughness={0.78} />
      </mesh>
      {built.leaves.map((leaf, i) => (
        <mesh
          key={i}
          geometry={leaf.leafGeo}
          position={leaf.pos}
          quaternion={leaf.quat}
          scale={leaf.scale}
        >
          <meshStandardMaterial
            color={cfg.bouquet.leafColor}
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Fan of flowers around the vase mouth with per-flower sway params. */
function useFlowerLayout() {
  return useMemo(() => {
    const n: number = cfg.bouquet.flowers;
    return Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
      const angle = t * 2.1; // spread ±~60°
      const r = 1.5 + (i % 2) * 0.35;
      const head = new THREE.Vector3(
        Math.sin(angle) * r,
        0.1 + Math.cos(angle) * 0.95 + (i % 3) * 0.12,
        (i % 2 === 0 ? 0.25 : -0.25) + t * 0.3,
      );
      return {
        head,
        // Stable per-flower local offset (head relative to the vase mouth);
        // computed once so Stem's geometry memo never rebuilds on re-renders.
        local: head.clone().sub(VASE_MOUTH),
        phase: i * 1.7,
        bloom: 0.86 + (i % 4) * 0.07,
        freq:
          cfg.sway.minFreq +
          (i / Math.max(1, n - 1)) * (cfg.sway.maxFreq - cfg.sway.minFreq),
      };
    });
  }, []);
}

export default function BouquetScene({ isMobile, growthDone }: BouquetSceneProps) {
  const layout = useFlowerLayout();
  const bouquetRef = useRef<THREE.Group>(null!);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const planeZ0 = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const pointerWorld = useMemo(() => new THREE.Vector3(), []);

  const petals = isMobile
    ? cfg.bouquet.petalsPerFlowerMobile
    : cfg.bouquet.petalsPerFlower;
  const pollen = isMobile ? cfg.pollen.mobile : cfg.pollen.desktop;
  const scale = isMobile ? cfg.render.mobileBouquetScale : 1;

  // Ceramic vase: belly, neck, and a lip.
  const vaseGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.38, 0.01),
      new THREE.Vector2(0.56, 0.1),
      new THREE.Vector2(0.64, 0.32),
      new THREE.Vector2(0.6, 0.55),
      new THREE.Vector2(0.46, 0.78),
      new THREE.Vector2(0.38, 0.94),
      new THREE.Vector2(0.46, 1.02),
      new THREE.Vector2(0.56, 1.08),
      new THREE.Vector2(0.5, 1.12),
    ];
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  useEffect(() => () => vaseGeo.dispose(), [vaseGeo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const camera = state.camera;
    const dt = Math.min(delta, 0.05);

    // Camera parallax toward the pointer (manual lerp, no OrbitControls).
    // Frame-rate independent so 60 Hz and 144 Hz ease over the same time.
    const p = cfg.pointer.parallax;
    const camBlend = 1 - Math.exp(-dt / cfg.pointer.cameraSmooth);
    camera.position.x += (state.pointer.x * p - camera.position.x) * camBlend;
    camera.position.y +=
      (cfg.render.cameraY + state.pointer.y * p * 0.6 - camera.position.y) * camBlend;
    camera.lookAt(0, cfg.render.cameraY, 0);

    // Pointer projected onto the bouquet plane for proximity tilt.
    raycaster.setFromCamera(state.pointer, camera);
    raycaster.ray.intersectPlane(planeZ0, pointerWorld);

    const group = bouquetRef.current;
    if (!group) return;
    const leanBlend = 1 - Math.exp(-dt / cfg.pointer.leanSmooth);
    for (const child of group.children) {
      const ud = child.userData as {
        phase: number;
        freq: number;
        hx: number;
        hy: number;
        leanZ: number;
        leanX: number;
      };
      const sway = Math.sin(t * ud.freq + ud.phase) * cfg.sway.maxTilt;

      // Proportional lean: a flower under the cursor barely moves, so passing
      // over it no longer flips it from one side to the other.
      const dx = pointerWorld.x - ud.hx;
      const dy = pointerWorld.y - ud.hy;
      const dist = Math.hypot(dx, dy);
      let targetZ = 0;
      let targetX = 0;
      if (dist < cfg.pointer.proximity) {
        const fall = 1 - dist / cfg.pointer.proximity;
        const max = cfg.pointer.proximityTilt;
        targetZ = THREE.MathUtils.clamp(dx / cfg.pointer.leanReach, -1, 1) * max * fall;
        targetX = THREE.MathUtils.clamp(dy / cfg.pointer.leanReach, -1, 1) * max * 0.45 * fall;
      }
      ud.leanZ = (ud.leanZ || 0) + (targetZ - (ud.leanZ || 0)) * leanBlend;
      ud.leanX = (ud.leanX || 0) + (targetX - (ud.leanX || 0)) * leanBlend;

      child.rotation.z = sway - ud.leanZ;
      child.rotation.x =
        Math.sin(t * ud.freq * 0.7 + ud.phase) * cfg.sway.maxTilt * 0.4 + ud.leanX;
    }
  });

  return (
    <>
      <hemisphereLight args={["#fff8ee", "#e6d3b4", 0.5]} />
      <ambientLight intensity={0.32} />
      <pointLight position={[2.4, 3.8, 4.2]} intensity={110} color="#fff2c4" />
      <pointLight position={[-3.4, 1.4, 2.2]} intensity={36} color="#ffe9b3" />
      {/* Rim from behind so petals separate from the cream paper. */}
      <pointLight position={[0.2, 2.4, -3.6]} intensity={22} color="#fff6dc" />

      <group scale={isMobile ? cfg.render.mobileBouquetScale : 1}>
        {/* Soft contact shadow — no shadow map, reads on paper. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.34, 0.05]}>
          <circleGeometry args={[0.95, 28]} />
          <meshBasicMaterial color="#c9b59a" transparent opacity={0.38} depthWrite={false} />
        </mesh>

        <mesh geometry={vaseGeo} position={[0, -2.35, 0]}>
          <meshStandardMaterial color={cfg.bouquet.vaseColor} roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh position={[0, -1.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.028, 8, 28]} />
          <meshStandardMaterial color="#7a6040" roughness={0.45} />
        </mesh>

        {/* Flowers: each group pivots at the vase mouth so sway looks rooted */}
        <group ref={bouquetRef} position={VASE_MOUTH}>
          {layout.map((f, i) => {
            return (
              <group
                key={i}
                userData={{
                  phase: f.phase,
                  freq: f.freq,
                  hx: f.head.x * scale,
                  hy: f.head.y * scale,
                  leanZ: 0,
                  leanX: 0,
                }}
              >
                <Stem to={f.local} />
                <group
                  position={f.local}
                  scale={f.bloom}
                  rotation={[0.12, (i % 5) * 0.22 - 0.44, (i % 2) * 0.06]}
                >
                  <FlowerHead count={petals} seed={i} />
                </group>
              </group>
            );
          })}
        </group>
      </group>

      <Pollen count={pollen.count} size={pollen.size} active={growthDone} />
    </>
  );
}
