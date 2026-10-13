import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";
import type { ConstellationNode, StarNode } from "@/features/constellation/model/types";
import { LINE_FRAGMENT, LINE_VERTEX } from "@/features/constellation/scene/starShaders";

/** 별 중심에서 선이 시작되지 않도록 비우는 길이(월드 단위). 별빛 halo 바깥에서 선이 시작된다. */
const END_GAP = 1.15;
/** 연결선 기본 밝기. 별보다 먼저 눈에 띄지 않도록 아주 낮게 둔다. */
const LINE_ALPHA = 0.1;
const UNSTUDIED_ALPHA = 0.045;

export function buildLineGeometry(constellations: ConstellationNode[], stars: StarNode[]): BufferGeometry {
  const byId = new Map(stars.map((s) => [s.id, s]));
  const positions: number[] = [];
  const t: number[] = [];
  const alpha: number[] = [];

  for (const c of constellations) {
    for (const [aId, bId] of c.edges) {
      const a = byId.get(aId);
      const b = byId.get(bId);
      if (!a || !b) continue;
      const [ax, ay, az] = a.position;
      const [bx, by, bz] = b.position;
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const len = Math.hypot(dx, dy, dz);
      if (len < END_GAP * 2.5) continue;
      const k = END_GAP / len;
      positions.push(ax + dx * k, ay + dy * k, az + dz * k, bx - dx * k, by - dy * k, bz - dz * k);
      t.push(0, 1);
      // 학습하지 않은 별로 이어진 선은 더 희미하게
      const a01 = a.attemptCount > 0 && b.attemptCount > 0 ? LINE_ALPHA : UNSTUDIED_ALPHA;
      alpha.push(a01, a01);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute("aT", new BufferAttribute(new Float32Array(t), 1));
  g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(alpha), 1));
  return g;
}

export function ConstellationLines({ constellations, stars }: { constellations: ConstellationNode[]; stars: StarNode[] }) {
  const geometry = useMemo(() => buildLineGeometry(constellations, stars), [constellations, stars]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: LINE_VERTEX,
        fragmentShader: LINE_FRAGMENT,
        uniforms: { uColor: { value: new Color(0.62, 0.7, 0.85) } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
