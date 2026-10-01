import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { companyRepo, competencyRepo, jobPostingRepo, requirementRepo, roleRepo } from "@/db/repositories";
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

  it("employmentType/experienceLevel이 canonical 값도, 지원하는 한국어 alias도 아니면 오류로 기록한다 (임의 추론하지 않는다)", async () => {
    const result = await importJobPostings([validRow({ employmentType: "파트타임" })]);
    expect(result.imported).toBe(0);
    expect(result.errors[0].reason).toContain("employmentType");
  });

  it("experienceLevel이 지원하지 않는 값이면 오류로 기록한다", async () => {
    const result = await importJobPostings([validRow({ experienceLevel: "주니어" })]);
    expect(result.imported).toBe(0);
    expect(result.errors[0].reason).toContain("experienceLevel");
  });

  describe("enum alias normalization (한국어/영어 입력 모두 허용 → canonical로 저장)", () => {
    const employmentCases: [string, string][] = [
      ["정규직", "full-time"],
      ["full-time", "full-time"],
      ["FULL-TIME", "full-time"], // 대소문자 무시
      ["  정규직  ", "full-time"], // 앞뒤 공백 무시
      ["계약직", "contract"],
      ["contract", "contract"],
      ["인턴", "intern"],
      ["intern", "intern"],
      ["프리랜서", "freelance"],
      ["freelance", "freelance"],
      ["기타", "other"],
      ["other", "other"],
    ];
    for (const [input, canonical] of employmentCases) {
      it(`employmentType "${input}" → "${canonical}"으로 normalize해 저장한다`, async () => {
        const result = await importJobPostings([validRow({ employmentType: input })]);
        expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
        const [saved] = await jobPostingRepo.list();
        expect(saved.employmentType).toBe(canonical);
      });
    }

    const experienceCases: [string, string][] = [
      ["신입", "entry"],
      ["entry", "entry"],
      ["ENTRY", "entry"], // 대소문자 무시
      ["경력", "experienced"],
      ["experienced", "experienced"],
      ["무관", "any"],
      ["신입/경력 무관", "any"], // 기존 UI 라벨 그대로도 허용
      ["any", "any"],
      [" any ", "any"], // 앞뒤 공백 무시
    ];
    for (const [input, canonical] of experienceCases) {
      it(`experienceLevel "${input}" → "${canonical}"으로 normalize해 저장한다`, async () => {
        const result = await importJobPostings([validRow({ experienceLevel: input })]);
        expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
        const [saved] = await jobPostingRepo.list();
        expect(saved.experienceLevel).toBe(canonical);
      });
    }

    it("원티드랩 JSON의 \"employmentType\": \"인턴\"이 정상 Import되어 canonical \"intern\"으로 저장된다", async () => {
      const result = await importJobPostings([
        {
          companyName: "원티드랩",
          postingTitle: "데이터 분석가 인턴 [AI기술팀]",
          positionTitle: "데이터 분석가 인턴 [AI기술팀]",
          employmentType: "인턴",
          workLocation: "서울 송파구 올림픽로 300, 35층",
        },
      ]);
      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [saved] = await jobPostingRepo.list();
      expect(saved.employmentType).toBe("intern");
    });
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

  describe("requirements (sourceSection/rawText/competencies/roles만 받는 단순화된 구조)", () => {
    it("requirements와 그 안의 competencies/roles까지 함께 가져와 연결한다", async () => {
      const result = await importJobPostings([
        validRow({
          requirements: [
            {
              rawText: "진행 중인 A/B Test 지표 주기적 점검",
              sourceSection: "responsibility",
              competencies: [{ name: "A/B Testing", category: "product" }],
              roles: ["Business DA"],
            },
          ],
        }),
      ]);

      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [jobPosting] = await jobPostingRepo.list();
      const [requirement] = await requirementRepo.listByJobPosting(jobPosting.id);
      expect(requirement.rawText).toBe("진행 중인 A/B Test 지표 주기적 점검");
      const [competency] = await requirementRepo.listCompetencies(requirement.id);
      expect(competency.name).toBe("A/B Testing");
      const [role] = await requirementRepo.listRoles(requirement.id);
      expect(role.name).toBe("Business DA");
    });

    it("서로 다른 JD에서 같은 Competency/Role 이름을 쓰면 하나로 통합된다(재사용)", async () => {
      await importJobPostings([
        validRow({
          positionTitle: "A",
          requirements: [
            { rawText: "A/B Test 수행", competencies: [{ name: "A/B Testing", category: "product" }], roles: ["PM"] },
          ],
        }),
        validRow({
          positionTitle: "B",
          requirements: [
            {
              rawText: "진행 중인 A/B Test 지표 주기적 점검",
              competencies: [{ name: "A/B Testing", category: "product" }],
              roles: ["PM"],
            },
          ],
        }),
      ]);

      const competencies = await competencyRepo.list();
      expect(competencies).toHaveLength(1);
      const trace = await competencyRepo.getDemandTrace(competencies[0].id);
      expect(trace).toHaveLength(2);
      expect(await roleRepo.list()).toHaveLength(1);
    });

    it("requirements 중 하나라도 형식이 틀리면(rawText 없음) JD 행 전체를 오류 처리한다", async () => {
      const result = await importJobPostings([validRow({ requirements: [{ sourceSection: "qualification" }] })]);
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

    it('competencies 항목의 category로 "soft-skill"을 받아 저장한다(도메인 지식이 아닌 범용 역량)', async () => {
      const result = await importJobPostings([
        validRow({
          requirements: [{ rawText: "이해관계자와 우선순위를 조율", competencies: [{ name: "커뮤니케이션", category: "soft-skill" }] }],
        }),
      ]);
      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [competency] = await competencyRepo.list();
      expect(competency.category).toBe("soft-skill");
    });

    it("roles 항목이 문자열이 아니면 JD 행 전체를 오류 처리한다", async () => {
      const result = await importJobPostings([validRow({ requirements: [{ rawText: "SQL", roles: [123] }] })]);
      expect(result.imported).toBe(0);
      expect(result.errors[0].reason).toContain("roles");
    });

    it("requirements에 알 수 없는 필드(예: 예전 normalizedLabel)가 섞여 있어도 무시하고 저장한다 (호환성 유지)", async () => {
      const result = await importJobPostings([
        validRow({
          requirements: [
            {
              rawText: "SQL 능숙",
              normalizedLabel: "예전 버전 필드 — 이제는 무시됨",
              competencies: [{ name: "SQL", category: "data", learningThemeKey: "예전 필드도 무시됨" }],
            },
          ],
        }),
      ]);
      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [jobPosting] = await jobPostingRepo.list();
      const [requirement] = await requirementRepo.listByJobPosting(jobPosting.id);
      expect(requirement.rawText).toBe("SQL 능숙");
      expect((requirement as unknown as Record<string, unknown>).normalizedLabel).toBeUndefined();
    });

    it("requirements가 없으면 기존처럼 JD만 저장한다(하위 호환)", async () => {
      const result = await importJobPostings([validRow()]);
      expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
      const [jobPosting] = await jobPostingRepo.list();
      expect(await requirementRepo.listByJobPosting(jobPosting.id)).toHaveLength(0);
    });

    describe("sourceSection alias normalization (영문 단/복수형 모두 허용 → canonical로 저장)", () => {
      const sourceSectionCases: [string, string][] = [
        ["responsibility", "responsibility"],
        ["responsibilities", "responsibility"], // 원티드랩 JSON처럼 복수형으로 들어오는 경우
        ["RESPONSIBILITIES", "responsibility"], // 대소문자 무시
        ["  responsibilities  ", "responsibility"], // 앞뒤 공백 무시
        ["qualification", "qualification"],
        ["qualifications", "qualification"],
        ["preferred", "preferred"],
        ["preferredQualification", "preferred"],
        ["preferredQualifications", "preferred"],
      ];
      for (const [input, canonical] of sourceSectionCases) {
        it(`sourceSection "${input}" → "${canonical}"으로 normalize해 저장한다`, async () => {
          const result = await importJobPostings([
            validRow({ requirements: [{ rawText: "텍스트", sourceSection: input }] }),
          ]);
          expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
          const [jobPosting] = await jobPostingRepo.list();
          const [requirement] = await requirementRepo.listByJobPosting(jobPosting.id);
          expect(requirement.sourceSection).toBe(canonical);
        });
      }

      it("canonical/alias 어느 쪽이 아니면 오류로 기록한다 (임의 추론하지 않는다)", async () => {
        const result = await importJobPostings([
          validRow({ requirements: [{ rawText: "텍스트", sourceSection: "intro" }] }),
        ]);
        expect(result.imported).toBe(0);
        expect(result.errors[0].reason).toContain("sourceSection");
      });

      it('원티드랩 JSON처럼 sourceSection이 "responsibilities"로 들어와도 정상 Import된다', async () => {
        const result = await importJobPostings([
          {
            companyName: "원티드랩",
            postingTitle: "데이터 분석가 인턴 [AI기술팀]",
            positionTitle: "데이터 분석가 인턴 [AI기술팀]",
            requirements: [
              {
                rawText: "진행 중인 A/B 테스트의 지표 상태를 주기적으로 점검하고 이상 신호를 정리",
                sourceSection: "responsibilities",
                competencies: [{ name: "A/B Testing", category: "product" }],
              },
            ],
          },
        ]);
        expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
        const [jobPosting] = await jobPostingRepo.list();
        const [requirement] = await requirementRepo.listByJobPosting(jobPosting.id);
        expect(requirement.sourceSection).toBe("responsibility");
      });
    });
  });
});
