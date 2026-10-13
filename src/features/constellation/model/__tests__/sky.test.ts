import { describe, expect, it } from "vitest";
import { buildCuratedSky } from "@/features/constellation/model/curatedSky";
import { createRng, hashString } from "@/features/constellation/model/rng";
import { starVisual, studyAmount } from "@/features/constellation/model/starVisual";
import { buildLineGeometry } from "@/features/constellation/scene/ConstellationLines";

describe("rng", () => {
  it("같은 seed는 항상 같은 수열을 만든다", () => {
    const a = createRng(123);
    const b = createRng(123);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
    expect(hashString("SQL:JOIN")).toBe(hashString("SQL:JOIN"));
  });
});

describe("curated sky", () => {
  const sky = buildCuratedSky();

  it("호출할 때마다 동일한 하늘을 만든다(결정적)", () => {
    expect(buildCuratedSky()).toEqual(sky);
  });

  it("별 id가 유일하고 모든 연결선이 존재하는 별을 가리킨다", () => {
    const ids = sky.stars.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of sky.constellations) {
      for (const [a, b] of c.edges) {
        expect(c.starIds).toContain(a);
        expect(c.starIds).toContain(b);
      }
    }
  });

  it("별끼리 너무 가깝지 않다(겹치지 않는다)", () => {
    for (let i = 0; i < sky.stars.length; i++) {
      for (let j = i + 1; j < sky.stars.length; j++) {
        const [ax, ay] = sky.stars[i].position;
        const [bx, by] = sky.stars[j].position;
        expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(4);
      }
    }
  });

  it("미학습 별이 포함되어 있다(희미하게 남는 영역)", () => {
    expect(sky.stars.some((s) => s.attemptCount === 0)).toBe(true);
  });
});

describe("starVisual", () => {
  const sky = buildCuratedSky();
  const visuals = sky.stars.map((s) => ({ star: s, v: starVisual(s) }));

  it("미학습 별은 사라지지 않고 아주 희미한 작은 점이다", () => {
    const unstudied = sky.stars.find((s) => s.attemptCount === 0)!;
    const v = starVisual(unstudied);
    expect(v.tier).toBe(1);
    expect(v.luminosity).toBeGreaterThan(0.15);
    expect(v.luminosity).toBeLessThan(0.4);
    expect(v.rayLengthH).toBe(0);
  });

  it("학습량은 광도와 광학 범위를 키우되 core는 항상 아주 작다", () => {
    expect(studyAmount(0)).toBe(0);
    expect(studyAmount(1000)).toBe(1);
    for (const { v } of visuals) {
      expect(v.coreSigma).toBeLessThanOrEqual(0.9);
      expect(v.psfRadius).toBeLessThanOrEqual(4);
      expect(v.luminosity).toBeLessThanOrEqual(1);
      expect(v.rayLengthH).toBeLessThanOrEqual(100);
      expect(v.twinkleAmp).toBeLessThanOrEqual(0.06);
    }
    const base = sky.stars.find((s) => s.attemptCount > 10)!;
    const few = starVisual({ ...base, attemptCount: 5 });
    const many = starVisual({ ...base, attemptCount: 5000 });
    expect(many.luminosity).toBeGreaterThan(few.luminosity);
    expect(many.psfRadius).toBeGreaterThan(few.psfRadius);
    expect(many.psfRadius).toBeLessThanOrEqual(4); // 극단값에서도 지나치게 커지지 않는다
  });

  it("tier 위계: 대부분 작고 조용하며 밝은 별과 Anchor는 소수다", () => {
    const n = visuals.length;
    const count = (t: number) => visuals.filter(({ v }) => v.tier === t).length;
    expect(count(1) / n).toBeGreaterThan(0.4);
    expect(count(1) + count(2)).toBeGreaterThanOrEqual(Math.ceil(n * 0.6));
    expect(count(3)).toBeGreaterThan(0);
    expect(count(3) / n).toBeLessThan(0.2);
    expect(count(4)).toBeGreaterThanOrEqual(2);
    expect(count(4)).toBeLessThanOrEqual(4);
  });

  it("회절 ray는 tier가 올라갈수록 길어지고, 대각선 ray는 Anchor에만 있다", () => {
    const maxRay = (t: number) => Math.max(0, ...visuals.filter(({ v }) => v.tier === t).map(({ v }) => v.rayLengthH));
    expect(maxRay(1)).toBe(0);
    expect(maxRay(2)).toBeGreaterThan(0);
    expect(maxRay(2)).toBeLessThan(12);
    expect(maxRay(3)).toBeGreaterThan(maxRay(2));
    expect(maxRay(4)).toBeGreaterThan(maxRay(3) * 2);
    for (const { star, v } of visuals) {
      expect(v.diagGain > 0).toBe(v.tier === 4);
      if (v.tier === 4) expect(star.mastered).toBe(true);
    }
  });

  it("ray 각도와 가로세로 비율이 별마다 다르다(모두 같은 + 모양이 아니다)", () => {
    const lit = visuals.filter(({ v }) => v.tier >= 3).map(({ v }) => v);
    expect(new Set(lit.map((v) => v.rayAngle.toFixed(3))).size).toBeGreaterThan(Math.floor(lit.length / 2));
    expect(lit.some((v) => v.rayLengthH !== v.rayLengthV)).toBe(true);
  });

  it("색온도는 대부분 중립 근처이고 아주 일부만 벗어난다", () => {
    const near = visuals.filter(({ v }) => Math.abs(v.temperature - 0.5) < 0.2).length;
    expect(near / visuals.length).toBeGreaterThan(0.7);
    for (const { v } of visuals) expect(v.temperature).toBeLessThanOrEqual(0.85);
  });

  it("정확도가 높을수록 반짝임이 안정적이고 색온도는 더 차갑다", () => {
    const base = sky.stars.find((s) => s.attemptCount > 10)!;
    const low = starVisual({ ...base, correctCount: 0, accuracy: 0.2 });
    const high = starVisual({ ...base, correctCount: base.attemptCount, accuracy: 1 });
    expect(high.twinkleAmp).toBeLessThan(low.twinkleAmp);
    expect(high.temperature).toBeGreaterThan(low.temperature);
  });
});

describe("scene data", () => {
  it("연결선 geometry는 별 중심까지 닿지 않고 끝점에서 시작한다", () => {
    const sky = buildCuratedSky();
    const g = buildLineGeometry(sky.constellations, sky.stars);
    const positionCount = g.getAttribute("position").count;
    expect(positionCount).toBeGreaterThan(0);
    expect(positionCount % 2).toBe(0);
    const a = sky.stars.find((s) => s.id === "SQL:JOIN")!.position;
    const p = g.getAttribute("position");
    for (let i = 0; i < positionCount; i++) {
      const d = Math.hypot(p.getX(i) - a[0], p.getY(i) - a[1], p.getZ(i) - a[2]);
      expect(d).toBeGreaterThan(0.5); // 별 중심과 일치하는 끝점이 없다
    }
    g.dispose();
  });
});
