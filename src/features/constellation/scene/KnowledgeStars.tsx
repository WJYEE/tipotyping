import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
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
export function KnowledgeStars({ stars, reducedMotion }: { stars: StarNode[]; reducedMotion: boolean }) {
  const geometry = useMemo(() => {
    const d = packKnowledgeStars(stars);
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
  }, [stars]);

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

  useFrame(({ clock, size }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uResolution.value.set(size.width, size.height);
  });

  return <primitive object={mesh} />;
}
