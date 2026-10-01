import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { companyRepo, competencyRepo, jobPostingRepo, requirementRepo } from "@/db/repositories";
import { importJobPostings, parseJdImportJson } from "@/lib/importJobPostings";

async function clearAllTables() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

describe("parseJdImportJson", () => {
  it("배열은 그대로 돌려준다 (복수 JD)", () => {
    const rows = parseJdImportJson(JSON.stringify([{ a: 1 }, { a: 2 }]));
    expect(rows).toHaveLength(2);
  });

  it("객체 하나는 배열로 감싼다 (단일 JD)", () => {
    const rows = parseJdImportJson(JSON.stringify({ a: 1 }));
    expect(rows).toEqual([{ a: 1 }]);
  });

  it("JSON이 아니면 던진다", () => {
    expect(() => parseJdImportJson("이건 JSON이 아님")).toThrow();
  });

  it("문자열/숫자/null처럼 객체도 배열도 아니면 던진다", () => {
    expect(() => parseJdImportJson("1")).toThrow();
    expect(() => parseJdImportJson("null")).toThrow();
  });
});

describe("importJobPostings", () => {
  function validRow(overrides: Record<string, unknown> = {}) {
    return {
      companyName: "Toss",
      postingTitle: "2026 상반기 공채",
      positionTitle: "Business Data Analyst",
      ...overrides,
    };
  }

  it("유효한 행을 저장하고 imported를 센다", async () => {
    const result = await importJobPostings([validRow()]);
    expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
    expect(await jobPostingRepo.list()).toHaveLength(1);
  });

  it("필수 필드(companyName/postingTitle/positionTitle)가 없으면 해당 행만 오류로 기록하고 계속 진행한다", async () => {
    const result = await importJobPostings([validRow(), { companyName: "Kurly" }, validRow({ positionTitle: "PM" })]);
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
  });

  it("같은 회사명+공고명+직무명 조합은 중복으로 보고 저장하지 않는다 (기존 DB 데이터 기준)", async () => {
    const company = await companyRepo.getOrCreate("Toss");
    await jobPostingRepo.create({
      companyId: company.id,
      postingTitle: "2026 상반기 공채",
      positionTitle: "Business Data Analyst",
      responsibilities: "",
      qualifications: "",
      preferredQualifications: "",
    });

    const result = await importJobPostings([validRow()]);
    expect(result).toEqual({ imported: 0, duplicates: 1, errors: [] });
  });

  it("같은 파일 안에서도 같은 조합이 두 번 있으면 두 번째는 중복으로 처리한다", async () => {
    const result = await importJobPostings([validRow(), validRow()]);
    expect(result).toEqual({ imported: 1, duplicates: 1, errors: [] });
  });

  it("날짜 형식이 YYYY-MM-DD가 아니면 오류로 기록한다", async () => {
    const result = await importJobPostings([validRow({ applicationEndDate: "2026/01/01" })]);
    expect(result.imported).toBe(0);
    expect(result.errors[0].reason).toContain("YYYY-MM-DD");
  });

  it("employmentType/experienceLevel이 허용값이 아니면 오류로 기록한다", async () => {
    const result = await importJobPostings([validRow({ employmentType: "정규직" })]);
    expect(result.imported).toBe(0);
    expect(result.errors[0].reason).toContain("employmentType");
  });

  it("허용된 선택 필드는 그대로 저장한다", async () => {
    await importJobPostings([
      validRow({
        jdUrl: "https://example.com/jd",
        applicationStartDate: "2026-01-01",
        applicationEndDate: "2026-01-31",
        employmentType: "full-time",
        experienceLevel: "entry",
        workLocation: "서울 강남구",
      }),
    ]);
    const [saved] = await jobPostingRepo.list();
    expect(saved.jdUrl).toBe("https://example.com/jd");
    expect(saved.applicationStartDate).toBe("2026-01-01");
    expect(saved.employmentType).toBe("full-time");
    expect(saved.experienceLevel).toBe("entry");
    expect(saved.workLocation).toBe("서울 강남구");
  });

  it("같은 회사명이면 Company를 재사용한다(중복 생성 안 함)", async () => {
    await importJobPostings([validRow({ positionTitle: "A" }), validRow({ positionTitle: "B" })]);
    expect(await companyRepo.list()).toHaveLength(1);
  });

  describe("requirements (Requirement/Competency 표준화 구조 확장)", () => {
    it("requirements와 그 안의 competencies까지 함께 가져와 연결한다", async () => {
      const result = await importJobPostings([
        validRow({
          requirements: [
            {
              rawText: "진행 중인 A/B Test 지표 주기적 점검",
              normalizedLabel: "A/B Testing 수행",
              sourceSection: "responsibility",
              competencies: [{ name: "A/B Testing", category: "product", learningThemeKey: "AB_TEST" }],
            },
          ],
        }),
      ]);

      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [jobPosting] = await jobPostingRepo.list();
      const [requirement] = await requirementRepo.listByJobPosting(jobPosting.id);
      expect(requirement.rawText).toBe("진행 중인 A/B Test 지표 주기적 점검");
      expect(requirement.normalizedLabel).toBe("A/B Testing 수행");
      const [competency] = await requirementRepo.listCompetencies(requirement.id);
      expect(competency.name).toBe("A/B Testing");
      expect(competency.learningThemeKey).toBe("AB_TEST");
    });

    it("서로 다른 JD에서 같은 Competency 이름을 쓰면 하나로 통합된다(재사용)", async () => {
      await importJobPostings([
        validRow({
          positionTitle: "A",
          requirements: [{ rawText: "A/B Test 수행", competencies: [{ name: "A/B Testing", category: "product" }] }],
        }),
        validRow({
          positionTitle: "B",
          requirements: [
            { rawText: "진행 중인 A/B Test 지표 주기적 점검", competencies: [{ name: "A/B Testing", category: "product" }] },
          ],
        }),
      ]);

      const competencies = await competencyRepo.list();
      expect(competencies).toHaveLength(1);
      const trace = await competencyRepo.getDemandTrace(competencies[0].id);
      expect(trace).toHaveLength(2);
    });

    it("requirements 중 하나라도 형식이 틀리면(rawText 없음) JD 행 전체를 오류 처리한다", async () => {
      const result = await importJobPostings([validRow({ requirements: [{ normalizedLabel: "라벨만 있음" }] })]);
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain("rawText");
      expect(await jobPostingRepo.list()).toHaveLength(0);
    });

    it("competencies 항목의 category가 허용값이 아니면 JD 행 전체를 오류 처리한다", async () => {
      const result = await importJobPostings([
        validRow({
          requirements: [{ rawText: "SQL", competencies: [{ name: "SQL", category: "잘못된값" }] }],
        }),
      ]);
      expect(result.imported).toBe(0);
      expect(result.errors[0].reason).toContain("category");
    });

    it("requirements가 없으면 기존처럼 JD만 저장한다(하위 호환)", async () => {
      const result = await importJobPostings([validRow()]);
      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [jobPosting] = await jobPostingRepo.list();
      expect(await requirementRepo.listByJobPosting(jobPosting.id)).toHaveLength(0);
    });
  });
});
