import { describe, expect, it } from "vitest";
import { buildCuratedSky } from "@/features/constellation/model/curatedSky";
import { createRng, hashString } from "@/features/constellation/model/rng";
import { starVisual, studyAmount } from "@/features/constellation/model/starVisual";
import { buildLineGeometry } from "@/features/constellation/scene/ConstellationLines";
import { generateBackdropStars } from "@/features/constellation/scene/StarPoints";

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

  it("미학습 별은 사라지지 않고 아주 희미하다", () => {
    const unstudied = sky.stars.find((s) => s.attemptCount === 0)!;
    const v = starVisual(unstudied);
    expect(v.brightness).toBeGreaterThan(0.05);
    expect(v.brightness).toBeLessThan(0.25);
    expect(v.spike).toBe(0);
  });

  it("학습량은 밝기를 올리되 크기는 크게 키우지 않는다", () => {
    expect(studyAmount(0)).toBe(0);
    expect(studyAmount(1000)).toBe(1);
    for (const star of sky.stars) {
      const v = starVisual(star);
      expect(v.coreRadius).toBeLessThanOrEqual(2.2);
      expect(v.haloRadius).toBeLessThanOrEqual(20);
      expect(v.brightness).toBeLessThanOrEqual(1);
      expect(v.twinkleAmp).toBeLessThanOrEqual(0.08);
    }
  });

  it("회절 스파이크는 소수의 숙달된 별에만 있다", () => {
    const spiky = sky.stars.filter((s) => starVisual(s).spike > 0);
    expect(spiky.length).toBeGreaterThan(0);
    expect(spiky.length).toBeLessThanOrEqual(Math.ceil(sky.stars.length * 0.15));
    expect(spiky.every((s) => s.mastered)).toBe(true);
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

  it("배경 별은 개수와 무관하게 결정적이며 대부분 희미하다", () => {
    const a = generateBackdropStars(800);
    const b = generateBackdropStars(800);
    expect(Array.from(a.position.slice(0, 30))).toEqual(Array.from(b.position.slice(0, 30)));
    let dim = 0;
    for (let i = 0; i < a.count; i++) if (a.bright[i] < 0.35) dim++;
    expect(dim / a.count).toBeGreaterThan(0.8);
  });
});
