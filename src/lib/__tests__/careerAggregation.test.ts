import { describe, expect, it } from "vitest";
import { countCompetencyDemand, countRoleMix, deriveJobPostingStatus } from "@/lib/careerAggregation";

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
