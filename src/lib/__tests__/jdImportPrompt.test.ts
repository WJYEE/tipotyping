// JD_IMPORT_PROMPT("ChatGPT용 프롬프트 복사")가 실제 importer(importJobPostings.ts)/
// 스펙(JD_IMPORT_SPEC.md)과 어긋나지 않는지 검증한다. 두 가지를 확인한다:
// 1) 프롬프트 문자열이 canonical enum 값/한국어 라벨을 전부 언급하는지(정적 대조).
// 2) 프롬프트가 "이렇게 쓰면 된다"고 알려주는 값들을 실제로 importJobPostings()에 넣었을 때
//    정말로 성공하는지(동작 대조 — 프롬프트만 바뀌고 구현이 안 바뀌거나 그 반대인 경우를 잡는다).
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { jobPostingRepo } from "@/db/repositories";
import { competencyCategoryLabel } from "@/features/career/competencyLabels";
import { JD_IMPORT_PROMPT } from "@/features/career/jdImportPrompt";
import { employmentTypeLabel, experienceLevelLabel, requirementSourceSectionLabel } from "@/features/career/jobPostingLabels";
import { importJobPostings } from "@/lib/importJobPostings";
import {
  COMPETENCY_CATEGORIES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  REQUIREMENT_SOURCE_SECTIONS,
} from "@/types/career";

async function clearAllTables() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

describe("JD_IMPORT_PROMPT — 정적 대조 (canonical 값을 전부 언급하는가)", () => {
  it("employmentType의 canonical 키와 한국어 라벨을 모두 포함한다", () => {
    for (const value of EMPLOYMENT_TYPES) {
      expect(JD_IMPORT_PROMPT).toContain(value);
      expect(JD_IMPORT_PROMPT).toContain(employmentTypeLabel[value]);
    }
  });

  it("experienceLevel의 canonical 키와 한국어 라벨을 모두 포함한다", () => {
    for (const value of EXPERIENCE_LEVELS) {
      expect(JD_IMPORT_PROMPT).toContain(value);
      expect(JD_IMPORT_PROMPT).toContain(experienceLevelLabel[value]);
    }
  });

  it("sourceSection의 canonical 키와 한국어 라벨을 모두 포함한다", () => {
    for (const value of REQUIREMENT_SOURCE_SECTIONS) {
      expect(JD_IMPORT_PROMPT).toContain(value);
      expect(JD_IMPORT_PROMPT).toContain(requirementSourceSectionLabel[value]);
    }
  });

  it("Competency category의 canonical 키와 한국어 라벨을 모두 포함한다", () => {
    for (const value of COMPETENCY_CATEGORIES) {
      expect(JD_IMPORT_PROMPT).toContain(value);
      expect(JD_IMPORT_PROMPT).toContain(competencyCategoryLabel[value]);
    }
  });

  it("Requirement의 4개 필드 이름을 모두 언급한다(그 외 필드를 새로 지어내지 않았는지 확인용)", () => {
    for (const field of ["rawText", "sourceSection", "competencies", "roles"]) {
      expect(JD_IMPORT_PROMPT).toContain(field);
    }
  });

  it("JD 최상위 필드 이름을 모두 언급한다", () => {
    for (const field of [
      "companyName",
      "postingTitle",
      "positionTitle",
      "jdUrl",
      "responsibilities",
      "qualifications",
      "preferredQualifications",
      "applicationStartDate",
      "applicationEndDate",
      "employmentType",
      "experienceLevel",
      "workLocation",
      "requirements",
    ]) {
      expect(JD_IMPORT_PROMPT).toContain(field);
    }
  });

  it("단일 JD와 JD 배열을 모두 허용한다는 내용을 담고 있다", () => {
    expect(JD_IMPORT_PROMPT).toContain("배열");
  });

  it("JSON만 출력하라는 지시와 '추측하지 않는다'는 원칙을 담고 있다", () => {
    expect(JD_IMPORT_PROMPT).toMatch(/JSON만/);
    expect(JD_IMPORT_PROMPT).toMatch(/추측/);
  });
});

describe("JD_IMPORT_PROMPT — 동작 대조 (프롬프트가 알려주는 값이 실제로 importer를 통과하는가)", () => {
  it("프롬프트가 말하는 employmentType 한국어 라벨이 전부 실제로 Import된다", async () => {
    for (const value of EMPLOYMENT_TYPES) {
      await clearAllTables();
      const result = await importJobPostings([
        { companyName: "A", postingTitle: "P", positionTitle: "T", employmentType: employmentTypeLabel[value] },
      ]);
      expect(result.errors).toEqual([]);
      const [saved] = await jobPostingRepo.list();
      expect(saved.employmentType).toBe(value);
    }
  });

  it("프롬프트가 말하는 experienceLevel 한국어 라벨이 전부 실제로 Import된다", async () => {
    for (const value of EXPERIENCE_LEVELS) {
      await clearAllTables();
      const result = await importJobPostings([
        { companyName: "A", postingTitle: "P", positionTitle: "T", experienceLevel: experienceLevelLabel[value] },
      ]);
      expect(result.errors).toEqual([]);
      const [saved] = await jobPostingRepo.list();
      expect(saved.experienceLevel).toBe(value);
    }
  });

  it("프롬프트가 말하는 sourceSection 값이 전부 실제로 Import된다", async () => {
    for (const value of REQUIREMENT_SOURCE_SECTIONS) {
      await clearAllTables();
      const result = await importJobPostings([
        {
          companyName: "A",
          postingTitle: "P",
          positionTitle: "T",
          requirements: [{ rawText: "텍스트", sourceSection: value }],
        },
      ]);
      expect(result.errors).toEqual([]);
    }
  });

  it("프롬프트가 말하는 Competency category 값이 전부 실제로 Import된다", async () => {
    for (const value of COMPETENCY_CATEGORIES) {
      await clearAllTables();
      const result = await importJobPostings([
        {
          companyName: "A",
          postingTitle: "P",
          positionTitle: "T",
          requirements: [{ rawText: "텍스트", competencies: [{ name: "키워드", category: value }] }],
        },
      ]);
      expect(result.errors).toEqual([]);
    }
  });

  it("프롬프트가 언급하는 Requirement 예시 구조(rawText+sourceSection+competencies+roles)가 한 번에 Import된다", async () => {
    const result = await importJobPostings([
      {
        companyName: "원티드랩",
        postingTitle: "데이터 분석가 인턴",
        positionTitle: "데이터 분석가 인턴",
        requirements: [
          {
            rawText: "진행 중인 A/B 테스트의 지표 상태를 주기적으로 점검",
            sourceSection: "responsibility",
            competencies: [{ name: "A/B Testing", category: "product" }],
            roles: ["Business DA"],
          },
        ],
      },
    ]);
    expect(result).toEqual({ imported: 1, duplicates: 0, errors: [] });
  });
});
