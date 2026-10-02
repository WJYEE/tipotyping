import { describe, expect, it } from "vitest";
import { DEFAULT_SKY_PARAMS, parseSkyParams } from "@/features/constellation/scene/skyParams";

describe("parseSkyParams", () => {
  it("값이 없으면 기본값을 쓴다", () => {
    expect(parseSkyParams("")).toEqual(DEFAULT_SKY_PARAMS);
  });
  it("유효한 숫자만 덮어쓴다", () => {
    const p = parseSkyParams("?milkyWay=2.5&glow=abc&vignette=9&seed=12");
    expect(p.milkyWay).toBe(2.5);
    expect(p.glow).toBe(DEFAULT_SKY_PARAMS.glow);
    expect(p.vignette).toBe(DEFAULT_SKY_PARAMS.vignette);
    expect(parseSkyParams("?haze=2").haze).toBe(2);
    expect(p.seed).toBe(12);
  });
});
