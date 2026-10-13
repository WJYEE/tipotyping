import { describe, expect, it } from "vitest";
import { FIELD_HALF_HEIGHT, FIELD_HALF_WIDTH, generateBackdropStars } from "@/features/constellation/model/backdropStars";

describe("generateBackdropStars", () => {
  const a = generateBackdropStars();

  it("결정적이다(새로고침해도 같은 하늘)", () => {
    const b = generateBackdropStars();
    expect(Array.from(a.position.slice(0, 60))).toEqual(Array.from(b.position.slice(0, 60)));
    expect(a.count).toBe(b.count);
  });

  it("밝기 등급이 피라미드 모양이다: 대부분 sub-pixel급, 밝은 별은 극소수", () => {
    const tiers = [0, 0, 0];
    for (let i = 0; i < a.count; i++) tiers[a.tier[i]]++;
    expect(tiers[0] / a.count).toBeGreaterThan(0.75);
    expect(tiers[2] / a.count).toBeLessThan(0.03);
    expect(tiers[2]).toBeGreaterThan(5);
  });

  it("회절 ray는 가장 밝은 등급의 일부에만 있다", () => {
    let spiky = 0;
    for (let i = 0; i < a.count; i++) {
      if (a.spike[i] > 0) {
        spiky++;
        expect(a.tier[i]).toBe(2);
      }
    }
    expect(spiky).toBeGreaterThan(0);
    expect(spiky / a.count).toBeLessThan(0.012);
  });

  it("작은 별에는 glow가 없고 모든 값이 절제된 범위에 있다", () => {
    for (let i = 0; i < a.count; i++) {
      if (a.tier[i] === 0) expect(a.glow[i]).toBe(0);
      expect(a.sigma[i]).toBeLessThan(1.1);
      expect(a.bright[i]).toBeLessThanOrEqual(0.95);
      expect(a.glow[i]).toBeLessThanOrEqual(0.16);
      expect(a.twinkle[i]).toBeLessThanOrEqual(0.05);
    }
  });

  it("밀도가 균일하지 않다: 거의 빈 공간과 밀집 영역이 함께 있다", () => {
    const cols = 12;
    const rows = 7;
    const grid = new Array<number>(cols * rows).fill(0);
    for (let i = 0; i < a.count; i++) {
      const x = a.position[i * 3];
      const y = a.position[i * 3 + 1];
      const cx = Math.floor(((x + FIELD_HALF_WIDTH) / (2 * FIELD_HALF_WIDTH)) * cols);
      const cy = Math.floor(((y + FIELD_HALF_HEIGHT) / (2 * FIELD_HALF_HEIGHT)) * rows);
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) grid[cy * cols + cx]++;
    }
    const mean = grid.reduce((s, v) => s + v, 0) / grid.length;
    const sparse = grid.filter((v) => v < mean * 0.25).length;
    const dense = grid.filter((v) => v > mean * 1.6).length;
    expect(sparse / grid.length).toBeGreaterThan(0.05);
    expect(dense).toBeGreaterThan(0);
  });
});
