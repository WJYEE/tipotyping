import { describe, expect, it } from "vitest";
import { parseRawJdText } from "@/lib/jdTextParser";

describe("parseRawJdText", () => {
  it("명확한 한국어 섹션 헤더로 담당업무/자격요건/우대사항을 나눈다", () => {
    const text = [
      "담당업무",
      "- SQL을 활용한 데이터 추출",
      "- 대시보드 운영",
      "",
      "자격요건",
      "- SQL 3년 이상",
      "",
      "우대사항",
      "- Python 경험",
    ].join("\n");

    const result = parseRawJdText(text);
    expect(result.responsibilities).toBe("- SQL을 활용한 데이터 추출\n- 대시보드 운영");
    expect(result.qualifications).toBe("- SQL 3년 이상");
    expect(result.preferredQualifications).toBe("- Python 경험");
    expect(result.matchedSections.sort()).toEqual(["preferred", "qualification", "responsibility"]);
  });

  it("헤더 앞(회사 소개 등) 텍스트는 어느 섹션에도 넣지 않는다 — 추측하지 않는다", () => {
    const text = ["회사 소개", "저희는 좋은 회사입니다.", "", "자격요건", "- 3년 이상"].join("\n");
    const result = parseRawJdText(text);
    expect(result.qualifications).toBe("- 3년 이상");
    expect(result.responsibilities).toBe("");
    expect(result.preferredQualifications).toBe("");
    expect(result.matchedSections).toEqual(["qualification"]);
  });

  it("인식 가능한 헤더가 전혀 없으면 세 섹션 모두 비워두고 matchedSections도 빈 배열이다", () => {
    const result = parseRawJdText("그냥 평범한 공고 설명 문단입니다. 특별한 구조가 없습니다.");
    expect(result).toEqual({
      responsibilities: "",
      qualifications: "",
      preferredQualifications: "",
      matchedSections: [],
    });
  });

  it("영문 헤더도 인식한다", () => {
    const text = ["Responsibilities", "- Build dashboards", "", "Qualifications", "- 3+ years SQL"].join("\n");
    const result = parseRawJdText(text);
    expect(result.responsibilities).toBe("- Build dashboards");
    expect(result.qualifications).toBe("- 3+ years SQL");
  });

  it("불릿/대괄호로 꾸며진 헤더 줄도 인식한다", () => {
    const text = ["[자격요건]", "- SQL"].join("\n");
    const result = parseRawJdText(text);
    expect(result.qualifications).toBe("- SQL");
  });

  it("헤더 키워드를 포함하지만 긴 문장(20자 초과)은 헤더로 보지 않는다", () => {
    const text = [
      "이 포지션은 자격요건이 다소 까다로운 편이니 꼼꼼히 확인하고 지원해주시기 바랍니다",
      "SQL 3년 이상",
    ].join("\n");
    const result = parseRawJdText(text);
    expect(result.matchedSections).toEqual([]);
  });

  it("빈 문자열은 모든 섹션이 빈 상태다", () => {
    expect(parseRawJdText("")).toEqual({
      responsibilities: "",
      qualifications: "",
      preferredQualifications: "",
      matchedSections: [],
    });
  });
});
