// Career JD JSON Import: 단일 객체 또는 배열을 모두 받고, schema validation 후 저장한다.
// importQuestions.ts와 같은 모양(ImportRow/ImportResult, parse는 구조만 검증하고 던지고,
// 행 단위 검증/중복 판정은 import 단계에서 모아서 보고한다)을 그대로 따른다.
import { companyRepo } from "@/db/repositories/companyRepo";
import { jobPostingRepo } from "@/db/repositories/jobPostingRepo";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  type EmploymentType,
  type ExperienceLevel,
  type JobPosting,
} from "@/types/career";

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
    await jobPostingRepo.create(data);
    existingSignatures.add(sig);
    result.imported++;
  }

  return result;
}
