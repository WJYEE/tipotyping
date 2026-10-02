import { describe, expect, it } from "vitest";
import { isStellationPath, legacySkyLabRedirectTarget, LEGACY_SKY_LAB_PATH, STELLATION_PATH } from "@/lib/routes";

describe("Stellation routes", () => {
  it("정식 route는 /stellation", () => {
    expect(STELLATION_PATH).toBe("/stellation");
    expect(isStellationPath("/stellation")).toBe(true);
  });

  it("기존 /constellation-lab도 몰입형 화면으로 취급하고 /stellation으로 redirect한다", () => {
    expect(LEGACY_SKY_LAB_PATH).toBe("/constellation-lab");
    expect(isStellationPath("/constellation-lab")).toBe(true);
    expect(legacySkyLabRedirectTarget("", "")).toBe("/stellation");
  });

  it("redirect는 개발용 query와 hash를 보존한다", () => {
    expect(legacySkyLabRedirectTarget("?milkyWay=2&glow=1.5", "#x")).toBe("/stellation?milkyWay=2&glow=1.5#x");
  });

  it("다른 영역은 영향받지 않는다", () => {
    for (const p of ["/", "/play", "/career", "/career/jd-library", "/questions"]) expect(isStellationPath(p)).toBe(false);
  });
});
