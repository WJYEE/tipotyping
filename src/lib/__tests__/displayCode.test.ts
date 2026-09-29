import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_PREFIXES, generateDisplayCode, getThemePrefix } from "@/lib/displayCode";

describe("getThemePrefix", () => {
  it("기본 제공 Theme은 고정 매핑을 그대로 쓴다 (한글/영문 모두)", () => {
    expect(getThemePrefix({ id: "t1", name: "SQL" })).toBe("SQL");
    expect(getThemePrefix({ id: "t1", name: "A/B Test" })).toBe("AB");
    expect(getThemePrefix({ id: "t1", name: "자료구조" })).toBe("DS");
    expect(getThemePrefix({ id: "t1", name: "통계" })).toBe("STAT");
    expect(getThemePrefix({ id: "t1", name: "AI 기초" })).toBe("AIBASIC");
  });

  it("고정 매핑에 없는 영문/숫자 테마명은 대문자 ASCII만 남긴다 (사용자 추가 Theme)", () => {
    expect(getThemePrefix({ id: "t1", name: "React 심화" })).toBe("REACT");
  });

  it("고정 매핑에도 없고 ASCII도 전혀 없으면 theme id 기반 코드로 대체한다 (사용자 추가 Theme)", () => {
    const prefix = getThemePrefix({ id: "abcdef12-3456-7890", name: "고급 중국어" });
    expect(prefix).toBe("ABCDEF");
    expect(prefix).not.toMatch(/[^A-Z0-9]/);
  });

  it("42개 기본 Theme 접두어는 서로 중복되지 않는다", () => {
    const prefixes = Object.values(DEFAULT_THEME_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe("generateDisplayCode", () => {
  it("빈 테마는 0001부터 시작한다", () => {
    expect(generateDisplayCode({ id: "t1", name: "SQL" }, [])).toBe("SQL-0001");
  });

  it("기존 코드 중 가장 큰 번호 다음 값을 부여한다", () => {
    const existing = [{ displayCode: "SQL-0001" }, { displayCode: "SQL-0003" }, { displayCode: "SQL-0002" }];
    expect(generateDisplayCode({ id: "t1", name: "SQL" }, existing)).toBe("SQL-0004");
  });

  it("접두어가 다른 코드는 번호 계산에서 무시한다", () => {
    const existing = [{ displayCode: "SQL-0001" }, { displayCode: "PY-0099" }];
    expect(generateDisplayCode({ id: "t1", name: "SQL" }, existing)).toBe("SQL-0002");
  });

  it("displayCode가 없는 항목은 무시한다", () => {
    const existing = [{ displayCode: "SQL-0001" }, { displayCode: undefined as unknown as string }];
    expect(generateDisplayCode({ id: "t1", name: "SQL" }, existing)).toBe("SQL-0002");
  });
});
