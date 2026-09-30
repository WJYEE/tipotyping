import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PREFIXES,
  generateDisplayCode,
  getFixedThemePrefix,
  getThemePrefix,
  planCustomThemeRecode,
} from "@/lib/displayCode";

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

  it("고정 매핑에도 없고 ASCII도 전혀 없으면 theme id가 아닌 CUSTOM을 쓴다 (사용자 추가 Theme)", () => {
    const prefix = getThemePrefix({ id: "abcdef12-3456-7890", name: "고급 중국어", isCustom: true });
    expect(prefix).toBe("CUSTOM");
    expect(prefix).not.toContain("ABCDEF");
  });

  it("사용자 Theme은 기본 Theme과 이름이 같아도 고정 접두어를 쓰지 않는다", () => {
    expect(getFixedThemePrefix({ id: "t1", name: "SQL", isCustom: true })).toBeNull();
    expect(getFixedThemePrefix({ id: "t1", name: "SQL", isCustom: false })).toBe("SQL");
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

  it("사용자 Theme 접두어가 기본 Theme/다른 Theme과 겹치면 숫자를 붙여 피한다", () => {
    const custom = { id: "u1", name: "SQL 심화", isCustom: true };
    expect(generateDisplayCode(custom, [])).toBe("SQL2-0001");
    const korean = { id: "u2", name: "고급 중국어", isCustom: true };
    expect(generateDisplayCode(korean, [], ["CUSTOM"])).toBe("CUSTOM2-0001");
  });

  it("사용자 Theme이 이미 쓰는 fallback 접두어는 유지한다 (다른 Theme이 나중에 생겨도 흔들리지 않음)", () => {
    const korean = { id: "u2", name: "고급 중국어", isCustom: true };
    expect(generateDisplayCode(korean, [{ displayCode: "CUSTOM2-0003" }], ["CUSTOM"])).toBe("CUSTOM2-0004");
  });

  it("displayCode가 없는 항목은 무시한다", () => {
    const existing = [{ displayCode: "SQL-0001" }, { displayCode: undefined as unknown as string }];
    expect(generateDisplayCode({ id: "t1", name: "SQL" }, existing)).toBe("SQL-0002");
  });
});

describe("planCustomThemeRecode (v4 마이그레이션)", () => {
  const themes = [
    { id: "t-sql", name: "SQL", isCustom: false },
    { id: "abcdef12-3456", name: "고급 중국어", isCustom: true },
    { id: "u-sql", name: "SQL 심화", isCustom: true },
  ];

  it("id 기반/충돌 접두어만 번호를 유지한 채 바꾸고 기본 Theme은 건드리지 않는다", () => {
    const updates = planCustomThemeRecode(themes, [
      { id: "q1", themeId: "t-sql", displayCode: "SQL-0001", createdAt: 1 },
      { id: "q2", themeId: "abcdef12-3456", displayCode: "ABCDEF-0001", createdAt: 2 },
      { id: "q3", themeId: "abcdef12-3456", displayCode: "ABCDEF-0002", createdAt: 3 },
      { id: "q4", themeId: "u-sql", displayCode: "SQL-0001", createdAt: 4 },
    ]);
    expect(updates).toEqual([
      { id: "q2", displayCode: "CUSTOM-0001" },
      { id: "q3", displayCode: "CUSTOM-0002" },
      { id: "q4", displayCode: "SQL2-0001" },
    ]);
  });

  it("이미 규칙에 맞는 코드는 변경 목록에 포함하지 않는다", () => {
    const updates = planCustomThemeRecode(themes, [
      { id: "q2", themeId: "abcdef12-3456", displayCode: "CUSTOM-0001", createdAt: 2 },
    ]);
    expect(updates).toEqual([]);
  });
});
