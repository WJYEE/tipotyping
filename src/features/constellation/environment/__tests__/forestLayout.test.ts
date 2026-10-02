import { describe, expect, it } from "vitest";
import { FOREST_MAX_FRACTION, forestHorizon, forestScale, generateForest } from "@/features/constellation/environment/forestLayout";

describe("forest layout", () => {
  it("결정적이다", () => {
    expect(generateForest(1440, 900)).toEqual(generateForest(1440, 900));
  });

  it("높이는 화면 높이의 12%를 넘지 않고 나무는 불규칙하게 충분히 많다", () => {
    const f = generateForest(1440, 900);
    expect(f.height).toBeLessThanOrEqual(900 * FOREST_MAX_FRACTION + 5);
    expect(f.treeCount).toBeGreaterThan(40);
    expect(f.near.length).toBeGreaterThan(1000);
    expect(f.far).not.toBe(f.near);
  });

  it("모든 좌표가 숲 영역 안에 있다(위로 삐져나가지 않는다)", () => {
    const f = generateForest(1440, 900);
    const ys = [...f.near.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });

  it("세로(모바일) 화면에서는 더 낮게 제한한다", () => {
    expect(forestScale(390, 844)).toBeLessThan(forestScale(1440, 900));
    expect(generateForest(390, 844).height).toBeLessThan(844 * FOREST_MAX_FRACTION);
  });

  it("haze 기준선(숲 윗선)은 화면 아래쪽 낮은 곳이다", () => {
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      const y = forestHorizon(w, h);
      expect(y).toBeGreaterThan(0.02);
      expect(y).toBeLessThan(0.1);
    }
  });
});
