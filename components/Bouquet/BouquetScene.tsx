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

/** Oval petal laid out radially via instancing (imperative for strict TS). */
function FlowerHead({ count }: { count: number }) {
  const mesh = useMemo(() => {
    const geo = new THREE.CircleGeometry(0.15, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.bouquet.petalColor,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    const im = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3(0.9, 2.2, 1);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      q.setFromAxisAngle(zAxis, a);
      pos.set(0, 0.2, 0).applyQuaternion(q);
      m.compose(pos, q, scale);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
    return im;
  }, [count]);

  useEffect(() => {
    return () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    };
  }, [mesh]);

  return (
    <group>
      <primitive object={mesh} />
      <mesh position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={cfg.bouquet.petalCenterColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Straight stem from the vase mouth to a flower head, plus an optional leaf. */
function Stem({ to, withLeaf }: { to: THREE.Vector3; withLeaf: boolean }) {
  const { geo, mid, quat } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, VASE_MOUTH);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.03, 0.05, len, 8);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    const mid = new THREE.Vector3().addVectors(to, VASE_MOUTH).multiplyScalar(0.5);
    return { geo, mid, quat };
  }, [to]);

  useEffect(() => {
    return () => geo.dispose();
  }, [geo]);

  const leaf = useMemo(() => {
    if (!withLeaf) return null;
    const pos = new THREE.Vector3().lerpVectors(VASE_MOUTH, to, 0.45);
    pos.x += to.x > 0 ? 0.18 : -0.18;
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, to.x > 0 ? -0.5 : 0.5 + Math.PI),
    );
    return { pos, quat };
  }, [to, withLeaf]);

  return (
    <group>
      <mesh geometry={geo} position={mid} quaternion={quat}>
        <meshStandardMaterial color={cfg.bouquet.stemColor} roughness={0.9} />
      </mesh>
      {leaf && (
        <mesh position={leaf.pos} quaternion={leaf.quat}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color={cfg.bouquet.leafColor} roughness={0.9} />
        </mesh>
      )}
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

  // Vase profile (lathe).
  const vaseGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.5, 0.02),
      new THREE.Vector2(0.58, 0.35),
      new THREE.Vector2(0.42, 0.85),
      new THREE.Vector2(0.5, 1.0),
      new THREE.Vector2(0.54, 1.05),
    ];
    return new THREE.LatheGeometry(pts, 24);
  }, []);
  useEffect(() => () => vaseGeo.dispose(), [vaseGeo]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const camera = state.camera;

    // Camera parallax toward the pointer (manual lerp, no OrbitControls).
    const p = cfg.pointer.parallax;
    camera.position.x += (state.pointer.x * p - camera.position.x) * 0.04;
    camera.position.y +=
      (cfg.render.cameraY + state.pointer.y * p * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, cfg.render.cameraY, 0);

    // Pointer projected onto the bouquet plane for proximity tilt.
    raycaster.setFromCamera(state.pointer, camera);
    raycaster.ray.intersectPlane(planeZ0, pointerWorld);

    const group = bouquetRef.current;
    if (!group) return;
    for (const child of group.children) {
      const ud = child.userData as { phase: number; freq: number; hx: number; hy: number };
      const sway = Math.sin(t * ud.freq + ud.phase) * cfg.sway.maxTilt;

      // Extra lean toward a nearby pointer.
      const dx = pointerWorld.x - ud.hx;
      const dy = pointerWorld.y - ud.hy;
      const dist = Math.hypot(dx, dy);
      const fall = Math.max(0, 1 - dist / cfg.pointer.proximity);
      const tilt = fall * fall * cfg.pointer.proximityTilt * Math.sign(dx || 1);

      child.rotation.z = sway - tilt;
      child.rotation.x = Math.sin(t * ud.freq * 0.7 + ud.phase) * cfg.sway.maxTilt * 0.4;
    }
  });

  return (
    <>
      <ambientLight intensity={1.0} />
      <pointLight position={[3, 4, 5]} intensity={140} color="#fff2c4" />
      <pointLight position={[-4, 1, 2]} intensity={50} color="#9db8ff" />

      <group scale={isMobile ? cfg.render.mobileBouquetScale : 1}>
        {/* Vase */}
        <mesh geometry={vaseGeo} position={[0, -2.35, 0]}>
          <meshStandardMaterial color={cfg.bouquet.vaseColor} roughness={0.7} />
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
                }}
              >
                <Stem to={f.local} withLeaf={i % 2 === 0} />
                <group position={f.local} rotation={[0, (i % 3) * 0.25 - 0.25, 0]}>
                  <FlowerHead count={petals} />
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
