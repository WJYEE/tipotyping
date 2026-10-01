import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector2 } from "three";
import { createRng } from "@/features/constellation/model/rng";
import { starVisual } from "@/features/constellation/model/starVisual";
import type { StarNode } from "@/features/constellation/model/types";
import { BACKDROP_VERTEX, KNOWLEDGE_VERTEX, STAR_FRAGMENT } from "@/features/constellation/scene/starShaders";

/** 별 한 개의 렌더링 속성. 두 종류의 별(Knowledge / Backdrop)이 같은 셰이더를 공유한다. */
interface StarAttributes {
  position: Float32Array; // Knowledge: world xyz / Backdrop: ndc.x, ndc.y, layer
  core: Float32Array;
  halo: Float32Array;
  bright: Float32Array;
  temp: Float32Array;
  phase: Float32Array;
  twAmp: Float32Array;
  twSpeed: Float32Array;
  spike: Float32Array;
  count: number;
}

function allocate(count: number): StarAttributes {
  return {
    position: new Float32Array(count * 3),
    core: new Float32Array(count),
    halo: new Float32Array(count),
    bright: new Float32Array(count),
    temp: new Float32Array(count),
    phase: new Float32Array(count),
    twAmp: new Float32Array(count),
    twSpeed: new Float32Array(count),
    spike: new Float32Array(count),
    count,
  };
}

function toGeometry(a: StarAttributes): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(a.position, 3));
  g.setAttribute("aCore", new BufferAttribute(a.core, 1));
  g.setAttribute("aHalo", new BufferAttribute(a.halo, 1));
  g.setAttribute("aBright", new BufferAttribute(a.bright, 1));
  g.setAttribute("aTemp", new BufferAttribute(a.temp, 1));
  g.setAttribute("aPhase", new BufferAttribute(a.phase, 1));
  g.setAttribute("aTwAmp", new BufferAttribute(a.twAmp, 1));
  g.setAttribute("aTwSpeed", new BufferAttribute(a.twSpeed, 1));
  g.setAttribute("aSpike", new BufferAttribute(a.spike, 1));
  return g;
}

function createMaterial(vertexShader: string): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader: STAR_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMaxPoint: { value: 64 },
      uParallax: { value: new Vector2() },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
}

function useStarObjects(attrs: StarAttributes, vertexShader: string) {
  const geometry = useMemo(() => toGeometry(attrs), [attrs]);
  const material = useMemo(() => createMaterial(vertexShader), [vertexShader]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return { geometry, material };
}

function useUniformDriver(material: ShaderMaterial, reducedMotion: boolean, parallax?: { current: { x: number; y: number } }) {
  useFrame(({ clock, gl }) => {
    const u = material.uniforms;
    u.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    u.uPixelRatio.value = gl.getPixelRatio();
    if (parallax) u.uParallax.value.set(-parallax.current.x * 0.012, -parallax.current.y * 0.012);
  });
}

// ───────────── Knowledge Stars ─────────────

export function KnowledgeStars({ stars, reducedMotion }: { stars: StarNode[]; reducedMotion: boolean }) {
  const attrs = useMemo(() => {
    const a = allocate(stars.length);
    stars.forEach((star, i) => {
      const v = starVisual(star);
      a.position.set(star.position, i * 3);
      a.core[i] = v.coreRadius;
      a.halo[i] = v.haloRadius;
      a.bright[i] = v.brightness;
      a.temp[i] = v.temperature;
      a.phase[i] = v.phase;
      a.twAmp[i] = v.twinkleAmp;
      a.twSpeed[i] = v.twinkleSpeed;
      a.spike[i] = v.spike;
    });
    return a;
  }, [stars]);

  const { geometry, material } = useStarObjects(attrs, KNOWLEDGE_VERTEX);
  useUniformDriver(material, reducedMotion);
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

// ───────────── Backdrop Stars ─────────────

const BACKDROP_SEED = 20261002;

/**
 * 데이터와 무관한 배경 별. 대부분은 아주 작고 희미하며, 극소수만 눈에 띄는 halo를 가진다(실제 밤하늘의 등급 분포).
 * 밀도는 화면 면적에 비례해 일정하게 유지된다. `count`는 큰 단위로만 바뀌어 resize 때 별이 계속 바뀌지 않는다.
 */
export function generateBackdropStars(count: number): StarAttributes {
  const rng = createRng(BACKDROP_SEED);
  const a = allocate(count);
  for (let i = 0; i < count; i++) {
    const m = rng(); // "등급": 작을수록 밝다
    const bright = Math.pow(rng(), 4.2); // 대부분 어둡고, 아주 드물게 밝음
    const isBrightStar = m > 0.985;
    a.position[i * 3] = (rng() * 2 - 1) * 1.08;
    a.position[i * 3 + 1] = (rng() * 2 - 1) * 1.08;
    a.position[i * 3 + 2] = rng();
    a.core[i] = isBrightStar ? 1.05 + rng() * 0.5 : 0.42 + bright * 0.75;
    a.halo[i] = isBrightStar ? 7 + rng() * 6 : 1.6 + bright * 4.2;
    a.bright[i] = isBrightStar ? 0.55 + rng() * 0.3 : 0.1 + bright * 0.5;
    // 정규분포에 가까운 색온도 분포(대부분 중립, 일부만 따뜻/차가움)
    a.temp[i] = Math.min(1, Math.max(0, (rng() + rng() + rng()) / 3 + (rng() - 0.5) * 0.12));
    a.phase[i] = rng() * Math.PI * 2;
    a.twAmp[i] = 0.025 + rng() * 0.06;
    a.twSpeed[i] = 0.35 + rng() * 0.95;
    a.spike[i] = 0;
  }
  return a;
}

export function BackdropStars({
  count,
  reducedMotion,
  parallax,
}: {
  count: number;
  reducedMotion: boolean;
  parallax: { current: { x: number; y: number } };
}) {
  const attrs = useMemo(() => generateBackdropStars(count), [count]);
  const { geometry, material } = useStarObjects(attrs, BACKDROP_VERTEX);
  useUniformDriver(material, reducedMotion, parallax);
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={0} />;
}
