import { describe, expect, it } from "vitest";
import {
  competencyBubbleSize,
  competencyDemandPercent,
  countCompetencyDemand,
  countRoleMix,
  deriveJobPostingStatus,
  filterAndLimitCompetencyBubbles,
} from "@/lib/careerAggregation";

describe("deriveJobPostingStatus", () => {
  it("Requirement가 0개면 입력 전", () => {
    expect(deriveJobPostingStatus(0, 0)).toBe("not-started");
  });

  it("Requirement는 있지만 전부 태깅되지 않았으면 정리 중", () => {
    expect(deriveJobPostingStatus(3, 1)).toBe("in-progress");
    expect(deriveJobPostingStatus(3, 0)).toBe("in-progress");
  });

  it("전부 태깅됐으면 완료", () => {
    expect(deriveJobPostingStatus(3, 3)).toBe("complete");
  });
});

describe("countCompetencyDemand", () => {
  it("같은 Competency를 요구하는 서로 다른 JobPosting 수를 센다", () => {
    const links = [
      { competencyId: "sql", jobPostingId: "jd1" },
      { competencyId: "sql", jobPostingId: "jd2" },
      { competencyId: "python", jobPostingId: "jd1" },
    ];
    const result = countCompetencyDemand(links);
    expect(result.get("sql")).toBe(2);
    expect(result.get("python")).toBe(1);
  });

  it("같은 JD 안에서 같은 Competency가 여러 Requirement에 중복 연결돼도 1개로 센다", () => {
    const links = [
      { competencyId: "sql", jobPostingId: "jd1" },
      { competencyId: "sql", jobPostingId: "jd1" },
    ];
    expect(countCompetencyDemand(links).get("sql")).toBe(1);
  });

  it("링크가 없으면 빈 Map", () => {
    expect(countCompetencyDemand([]).size).toBe(0);
  });
});

describe("countRoleMix", () => {
  it("role별 Requirement 개수와 비율(%)을 계산하고 개수 내림차순으로 정렬한다", () => {
    const result = countRoleMix(["pm", "da", "da", "da", "pm"]);
    expect(result).toEqual([
      { roleId: "da", count: 3, percent: 60 },
      { roleId: "pm", count: 2, percent: 40 },
    ]);
  });

  it("비어있으면 빈 배열(0으로 나누지 않는다)", () => {
    expect(countRoleMix([])).toEqual([]);
  });
});

describe("filterAndLimitCompetencyBubbles", () => {
  const bubbles = [
    { competency: { category: "data" as const }, demandCount: 5 },
    { competency: { category: "business" as const }, demandCount: 4 },
    { competency: { category: "data" as const }, demandCount: 3 },
    { competency: { category: "soft-skill" as const }, demandCount: 2 },
  ];

  it("category가 all이면 거르지 않고 상위 N개만 남긴다(기존 순서 유지)", () => {
    expect(filterAndLimitCompetencyBubbles(bubbles, "all", 2)).toEqual([bubbles[0], bubbles[1]]);
  });

  it("category를 지정하면 그 category 안에서만 상위 N개를 남긴다", () => {
    expect(filterAndLimitCompetencyBubbles(bubbles, "data", 1)).toEqual([bubbles[0]]);
    expect(filterAndLimitCompetencyBubbles(bubbles, "soft-skill", 10)).toEqual([bubbles[3]]);
  });

  it("limit이 전체 개수보다 크면 전부 반환한다(전체 보기)", () => {
    expect(filterAndLimitCompetencyBubbles(bubbles, "all", Infinity)).toEqual(bubbles);
  });
});

describe("competencyBubbleSize", () => {
  it("demandCount가 maxDemand와 같으면(1위) maxSize를 반환한다", () => {
    expect(competencyBubbleSize(5, 5, 56, 172)).toBe(172);
  });

  it("demandCount가 0이면 minSize를 반환한다", () => {
    expect(competencyBubbleSize(0, 5, 56, 172)).toBe(56);
  });

  it("maxDemand가 0이어도 0으로 나누지 않고 minSize를 반환한다", () => {
    expect(competencyBubbleSize(0, 0, 56, 172)).toBe(56);
  });

  it("빈도가 낮을수록 선형 비례보다 더 작게(차이가 더 뚜렷하게) 줄어든다", () => {
    const linear = 56 + (172 - 56) * 0.2;
    expect(competencyBubbleSize(1, 5, 56, 172)).toBeLessThan(linear);
  });
});

describe("competencyDemandPercent", () => {
  it("demandCount/totalJd를 반올림한 퍼센트로 계산한다", () => {
    expect(competencyDemandPercent(2, 5)).toBe(40);
    expect(competencyDemandPercent(1, 3)).toBe(33);
  });

  it("totalJd가 0이면 0으로 나누지 않고 0을 반환한다", () => {
    expect(competencyDemandPercent(0, 0)).toBe(0);
  });
});
