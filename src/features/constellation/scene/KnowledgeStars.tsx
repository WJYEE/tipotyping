import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AddEquation,
  BufferAttribute,
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  OneFactor,
  ShaderMaterial,
  Vector2,
  ZeroFactor,
} from "three";
import { clampDt, damp, emphasisTarget, EMPHASIS_LAMBDA } from "@/features/constellation/model/starFocus";
import { starVisual, type StarVisual } from "@/features/constellation/model/starVisual";
import type { StarNode } from "@/features/constellation/model/types";
import { KNOWLEDGE_FRAGMENT, KNOWLEDGE_VERTEX } from "@/features/constellation/scene/knowledgeShaders";

/** quad 반폭(CSS px): PSF가 충분히 사라지는 범위와 ray 길이 중 큰 쪽. */
export function quadHalfSize(v: StarVisual): number {
  return Math.max(v.psfRadius * 4.5, Math.max(v.rayLengthH, v.rayLengthV) * 1.08, v.coreSigma * 4) + 2;
}

/** Knowledge Star 렌더링용 인스턴스 데이터. 별마다 4개 vec4 슬롯 + 위치. */
export function packKnowledgeStars(stars: StarNode[]) {
  const n = stars.length;
  const center = new Float32Array(n * 3);
  const shape = new Float32Array(n * 4);
  const ray = new Float32Array(n * 4);
  const misc = new Float32Array(n * 4);
  const size = new Float32Array(n * 2);
  stars.forEach((star, i) => {
    const v = starVisual(star);
    center.set(star.position, i * 3);
    shape.set([v.coreSigma, v.psfRadius, v.psfGain, v.luminosity], i * 4);
    ray.set([v.rayLengthH, v.rayLengthV, v.rayGain, v.rayAngle], i * 4);
    misc.set([v.diagGain, v.temperature, v.twinkleAmp, v.phase], i * 4);
    size.set([quadHalfSize(v), v.twinkleSpeed], i * 2);
  });
  return { center, shape, ray, misc, size, count: n };
}

/**
 * Knowledge Star: camera-facing quad 인스턴스 1회 draw call.
 * 합성은 RGB 가산 + framebuffer alpha 불변이다. three의 AdditiveBlending은 alpha 채널에도 SRC_ALPHA를 더해
 * quad 전체가 불투명한 검은 사각형이 되므로 쓰지 않는다(BackdropStars와 같은 방식).
 */
export function KnowledgeStars({
  stars,
  reducedMotion,
  hoveredId = null,
  selectedId = null,
}: {
  stars: StarNode[];
  reducedMotion: boolean;
  /** hover/선택 강조(선택). 둘 다 없으면 렌더 결과는 기존과 비트 단위로 같다. */
  hoveredId?: string | null;
  selectedId?: string | null;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const packed = useMemo(() => packKnowledgeStars(stars), [stars]);
  const geometry = useMemo(() => {
    const d = packed;
    const g = new InstancedBufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute("aCenter", new InstancedBufferAttribute(d.center, 3));
    g.setAttribute("aShape", new InstancedBufferAttribute(d.shape, 4));
    g.setAttribute("aRay", new InstancedBufferAttribute(d.ray, 4));
    g.setAttribute("aMisc", new InstancedBufferAttribute(d.misc, 4));
    g.setAttribute("aSize", new InstancedBufferAttribute(d.size, 2));
    g.instanceCount = d.count;
    return g;
  }, [packed]);

  // 승인된 luminosity(원본)와 현재 강조 배율. 강조는 배율 1(원본 그대로)로 되돌아가는 일시적 상태일 뿐이다.
  const baseLuminosity = useMemo(() => Float32Array.from({ length: packed.count }, (_, i) => packed.shape[i * 4 + 3]), [packed]);
  const emphasis = useRef<Float32Array>(new Float32Array(0));
  useEffect(() => {
    emphasis.current = new Float32Array(packed.count).fill(1);
  }, [packed]);
  const indexById = useMemo(() => new Map(stars.map((s, i) => [s.id, i])), [stars]);
  const hoveredIndex = hoveredId === null ? -1 : (indexById.get(hoveredId) ?? -1);
  const selectedIndex = selectedId === null ? -1 : (indexById.get(selectedId) ?? -1);
  const emphasisGoal = useRef({ hovered: -1, selected: -1 });
  useEffect(() => {
    emphasisGoal.current = { hovered: hoveredIndex, selected: selectedIndex };
    invalidate();
  }, [hoveredIndex, selectedIndex, invalidate]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: KNOWLEDGE_VERTEX,
        fragmentShader: KNOWLEDGE_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uResolution: { value: new Vector2(1, 1) } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    [],
  );

  const mesh = useMemo(() => {
    const m = new Mesh(geometry, material);
    m.frustumCulled = false;
    m.renderOrder = 2;
    return m;
  }, [geometry, material]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock, size }, delta) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uResolution.value.set(size.width, size.height);

    // hover/선택 강조: 목표 배율로 감쇠. 배율이 1로 돌아오면 원본 luminosity를 그대로 써서 외형이 변하지 않는다.
    const current = emphasis.current;
    if (current.length !== packed.count) return;
    const goal = emphasisGoal.current;
    const dt = clampDt(delta);
    let changed = false;
    let moving = false;
    for (let i = 0; i < packed.count; i++) {
      const target = emphasisTarget(i, goal.hovered, goal.selected);
      let next = reducedMotion ? target : damp(current[i], target, EMPHASIS_LAMBDA, dt);
      if (Math.abs(next - target) < 0.002) next = target;
      else moving = true;
      if (next !== current[i]) {
        current[i] = next;
        packed.shape[i * 4 + 3] = next === 1 ? baseLuminosity[i] : baseLuminosity[i] * next;
        changed = true;
      }
    }
    if (changed) {
      const attr = geometry.getAttribute("aShape") as InstancedBufferAttribute;
      attr.needsUpdate = true;
    }
    if (moving) invalidate();
  });

  return <primitive object={mesh} />;
}
