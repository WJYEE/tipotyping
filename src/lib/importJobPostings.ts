// Career JD JSON Import: 단일 객체 또는 배열을 모두 받고, schema validation 후 저장한다.
// importQuestions.ts와 같은 모양(ImportRow/ImportResult, parse는 구조만 검증하고 던지고,
// 행 단위 검증/중복 판정은 import 단계에서 모아서 보고한다)을 그대로 따른다.
//
// Requirement는 sourceSection/rawText/competencies/roles 네 가지만 받는다. ChatGPT/Claude 등
// 외부 도구가 JD를 읽고 이미 정제된 표준 Competency/Role 키워드를 JSON으로 넘겨준다는 전제라서,
// 이 앱은 자연어를 분석하거나 표준화 라벨을 생성하지 않는다 — 들어온 값을 그대로 신뢰하고 저장할
// 뿐이다. 한 요구사항이라도 형식이 틀리면 그 JD 행 전체를 오류로 처리한다(일부만 저장되는 혼란 방지).
import { companyRepo } from "@/db/repositories/companyRepo";
import { competencyRepo } from "@/db/repositories/competencyRepo";
import { jobPostingRepo } from "@/db/repositories/jobPostingRepo";
import { requirementRepo } from "@/db/repositories/requirementRepo";
import { roleRepo } from "@/db/repositories/roleRepo";
import {
  COMPETENCY_CATEGORIES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  REQUIREMENT_SOURCE_SECTIONS,
  type CompetencyCategory,
  type EmploymentType,
  type ExperienceLevel,
  type JobPosting,
  type RequirementSourceSection,
} from "@/types/career";

export interface JdImportRequirementCompetency {
  name: string;
  category: CompetencyCategory;
}

export interface JdImportRequirement {
  rawText: string;
  sourceSection?: RequirementSourceSection;
  /** 표준화된 키워드 목록(예: "SQL", "A/B Testing"). 자연어 문장이 아니다 — 그대로 Competency 사전에서 재사용/생성한다. */
  competencies?: JdImportRequirementCompetency[];
  /** 표준화된 Role 이름 목록(예: "Business DA"). 그대로 Role 사전에서 재사용/생성한다. */
  roles?: string[];
}

export interface JdImportRow {
  companyName: string;
  postingTitle: string;
  positionTitle: string;
  jdUrl?: string;
  responsibilities?: string;
  qualifications?: string;
  preferredQualifications?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  workLocation?: string;
  requirements?: JdImportRequirement[];
}

export interface JdImportResult {
  imported: number;
  duplicates: number;
  errors: { index: number; reason: string }[];
}

/** JSON 텍스트를 파싱한다. 객체 하나면 배열로 감싼다(단일/복수 JD 모두 지원). 구조가 틀리면 던진다. */
export function parseJdImportJson(text: string): unknown[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 형식이 아닙니다.");
  }
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  throw new Error("JSON은 JD 객체 하나 또는 JD 배열([...]) 형식이어야 합니다.");
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateCompetencyRef(raw: unknown): { competency: JdImportRequirementCompetency } | { reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { reason: "competencies 항목은 객체여야 합니다." };
  }
  const c = raw as Record<string, unknown>;
  if (typeof c.name !== "string" || !c.name.trim()) {
    return { reason: "competencies 항목의 name은 필수 문자열입니다." };
  }
  if (!COMPETENCY_CATEGORIES.includes(c.category as CompetencyCategory)) {
    return { reason: `competencies 항목의 category는 ${COMPETENCY_CATEGORIES.join("/")} 중 하나여야 합니다.` };
  }
  return { competency: { name: c.name.trim(), category: c.category as CompetencyCategory } };
}

function validateRequirement(raw: unknown, index: number): { requirement: JdImportRequirement } | { reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { reason: `requirements[${index}]는 객체여야 합니다.` };
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.rawText !== "string" || !r.rawText.trim()) {
    return { reason: `requirements[${index}].rawText는 필수 문자열입니다.` };
  }
  if (r.sourceSection !== undefined && !REQUIREMENT_SOURCE_SECTIONS.includes(r.sourceSection as RequirementSourceSection)) {
    return { reason: `requirements[${index}].sourceSection은 ${REQUIREMENT_SOURCE_SECTIONS.join("/")} 중 하나여야 합니다.` };
  }

  const competencies: JdImportRequirementCompetency[] = [];
  if (r.competencies !== undefined) {
    if (!Array.isArray(r.competencies)) {
      return { reason: `requirements[${index}].competencies는 배열이어야 합니다.` };
    }
    for (const c of r.competencies) {
      const validated = validateCompetencyRef(c);
      if ("reason" in validated) return { reason: `requirements[${index}].${validated.reason}` };
      competencies.push(validated.competency);
    }
  }

  const roles: string[] = [];
  if (r.roles !== undefined) {
    if (!Array.isArray(r.roles)) {
      return { reason: `requirements[${index}].roles는 배열이어야 합니다.` };
    }
    for (const roleName of r.roles) {
      if (typeof roleName !== "string" || !roleName.trim()) {
        return { reason: `requirements[${index}].roles 항목은 문자열이어야 합니다.` };
      }
      roles.push(roleName.trim());
    }
  }

  return {
    requirement: {
      rawText: r.rawText.trim(),
      sourceSection: r.sourceSection as RequirementSourceSection | undefined,
      competencies,
      roles,
    },
  };
}

function validateRow(raw: unknown): { row: JdImportRow } | { reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { reason: "JD 객체가 아닙니다." };
  }
  const r = raw as Record<string, unknown>;

  for (const field of ["companyName", "postingTitle", "positionTitle"] as const) {
    if (typeof r[field] !== "string" || !r[field].trim()) {
      return { reason: `"${field}"는 필수 문자열입니다.` };
    }
  }

  for (const field of [
    "jdUrl",
    "responsibilities",
    "qualifications",
    "preferredQualifications",
    "workLocation",
  ] as const) {
    if (r[field] !== undefined && typeof r[field] !== "string") {
      return { reason: `"${field}"는 문자열이어야 합니다.` };
    }
  }

  for (const field of ["applicationStartDate", "applicationEndDate"] as const) {
    if (r[field] !== undefined && (typeof r[field] !== "string" || !DATE_PATTERN.test(r[field] as string))) {
      return { reason: `"${field}"는 "YYYY-MM-DD" 형식이어야 합니다.` };
    }
  }

  if (r.employmentType !== undefined && !EMPLOYMENT_TYPES.includes(r.employmentType as EmploymentType)) {
    return { reason: `"employmentType"은 ${EMPLOYMENT_TYPES.join("/")} 중 하나여야 합니다.` };
  }
  if (r.experienceLevel !== undefined && !EXPERIENCE_LEVELS.includes(r.experienceLevel as ExperienceLevel)) {
    return { reason: `"experienceLevel"은 ${EXPERIENCE_LEVELS.join("/")} 중 하나여야 합니다.` };
  }

  const requirements: JdImportRequirement[] = [];
  if (r.requirements !== undefined) {
    if (!Array.isArray(r.requirements)) {
      return { reason: '"requirements"는 배열이어야 합니다.' };
    }
    for (let i = 0; i < r.requirements.length; i++) {
      const validated = validateRequirement(r.requirements[i], i);
      if ("reason" in validated) return { reason: validated.reason };
      requirements.push(validated.requirement);
    }
  }

  return {
    row: {
      companyName: (r.companyName as string).trim(),
      postingTitle: (r.postingTitle as string).trim(),
      positionTitle: (r.positionTitle as string).trim(),
      jdUrl: r.jdUrl as string | undefined,
      responsibilities: (r.responsibilities as string | undefined) ?? "",
      qualifications: (r.qualifications as string | undefined) ?? "",
      preferredQualifications: (r.preferredQualifications as string | undefined) ?? "",
      applicationStartDate: r.applicationStartDate as string | undefined,
      applicationEndDate: r.applicationEndDate as string | undefined,
      employmentType: r.employmentType as EmploymentType | undefined,
      experienceLevel: r.experienceLevel as ExperienceLevel | undefined,
      workLocation: r.workLocation as string | undefined,
      requirements,
    },
  };
}

function signature(companyName: string, postingTitle: string, positionTitle: string): string {
  const norm = (s: string) => s.trim().toLowerCase();
  return `${norm(companyName)}|${norm(postingTitle)}|${norm(positionTitle)}`;
}

/** 행 단위로 검증/중복 판정/저장하고, 성공/중복/오류를 모아서 보고한다(한 행의 실패가 전체를 막지 않는다). */
export async function importJobPostings(rawRows: unknown[]): Promise<JdImportResult> {
  const existing = await jobPostingRepo.list();
  const companies = await companyRepo.list();
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
  const existingSignatures = new Set(
    existing.map((jp) => signature(companyNameById.get(jp.companyId) ?? "", jp.postingTitle, jp.positionTitle)),
  );

  const result: JdImportResult = { imported: 0, duplicates: 0, errors: [] };

  for (let i = 0; i < rawRows.length; i++) {
    const validated = validateRow(rawRows[i]);
    if ("reason" in validated) {
      result.errors.push({ index: i, reason: validated.reason });
      continue;
    }
    const { row } = validated;
    const sig = signature(row.companyName, row.postingTitle, row.positionTitle);
    if (existingSignatures.has(sig)) {
      result.duplicates++;
      continue;
    }

    const company = await companyRepo.getOrCreate(row.companyName);
    const data: Omit<JobPosting, "id" | "createdAt" | "updatedAt"> = {
      companyId: company.id,
      postingTitle: row.postingTitle,
      positionTitle: row.positionTitle,
      jdUrl: row.jdUrl,
      responsibilities: row.responsibilities ?? "",
      qualifications: row.qualifications ?? "",
      preferredQualifications: row.preferredQualifications ?? "",
      applicationStartDate: row.applicationStartDate,
      applicationEndDate: row.applicationEndDate,
      employmentType: row.employmentType,
      experienceLevel: row.experienceLevel,
      workLocation: row.workLocation,
    };
    const jobPosting = await jobPostingRepo.create(data);

    for (const reqRow of row.requirements ?? []) {
      // rawText → Requirement, competencies/roles → 기존 사전 재사용 또는 신규 생성 후 관계 테이블 연결.
      const requirement = await requirementRepo.create({
        jobPostingId: jobPosting.id,
        rawText: reqRow.rawText,
        sourceSection: reqRow.sourceSection,
      });
      for (const c of reqRow.competencies ?? []) {
        const competency = await competencyRepo.getOrCreate(c.name, c.category);
        await requirementRepo.linkCompetency(requirement.id, competency.id);
      }
      for (const roleName of reqRow.roles ?? []) {
        const role = await roleRepo.getOrCreate(roleName);
        await requirementRepo.linkRole(requirement.id, role.id);
      }
    }

    existingSignatures.add(sig);
    result.imported++;
  }

  return result;
}
