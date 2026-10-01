// Career 서비스 영역의 도메인 타입. Learning(src/types/domain.ts)과는 별개 바운디드 컨텍스트.
// 설계 근거는 eager-beaming-lighthouse 계획(Career Phase 2) 참고: Role 분류는 JobPosting이 아닌
// Requirement 단위다("공고 제목이 아닌 실제 요구사항의 성격을 분류"). AI 자동 분석은 이번 단계에
// 없고, Competency/Role 태깅은 모두 수동(기존 Question tagIds의 getOrCreate 패턴과 동일).

export interface Company {
  id: string;
  name: string;
  createdAt: number;
}

export type EmploymentType = "full-time" | "contract" | "intern" | "freelance" | "other";

export const EMPLOYMENT_TYPES: EmploymentType[] = ["full-time", "contract", "intern", "freelance", "other"];

export type ExperienceLevel = "entry" | "experienced" | "any";

export const EXPERIENCE_LEVELS: ExperienceLevel[] = ["entry", "experienced", "any"];

export interface JobPosting {
  id: string;
  companyId: string;
  /** 공고명 (예: "2026년 상반기 신입/경력 공개채용") */
  postingTitle: string;
  /** 직무명 (예: "Business Data Analyst") */
  positionTitle: string;
  /** 원본 JD 출처 저장 및 이동 용도로만 쓴다 — 크롤링/자동 수집은 하지 않는다. */
  jdUrl?: string;
  responsibilities: string;
  qualifications: string;
  preferredQualifications: string;
  /** "YYYY-MM-DD" (input type=date 값 그대로) */
  applicationStartDate?: string;
  applicationEndDate?: string;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  workLocation?: string;
  createdAt: number;
  updatedAt: number;
}

export type RequirementSourceSection = "responsibility" | "qualification" | "preferred";

export const REQUIREMENT_SOURCE_SECTIONS: RequirementSourceSection[] = ["responsibility", "qualification", "preferred"];

/**
 * sourceSection/rawText/competencies/roles 네 가지만 갖는다(competencies/roles는 관계 테이블로 연결).
 * rawText는 JD 원문 그대로 — 회사마다 표현이 달라도 절대 고치지 않는다. 표준화는 이 앱이 직접
 * 자연어를 분석해서 만들지 않고, Competency/Role이라는 이미 정제된 키워드를 그대로 연결하는 것으로
 * 끝난다(예: ChatGPT/Claude 같은 외부 도구가 JD를 읽고 표준 키워드를 JSON으로 제공).
 */
export interface Requirement {
  id: string;
  jobPostingId: string;
  rawText: string;
  sourceSection?: RequirementSourceSection;
  createdAt: number;
}

export type CompetencyCategory = "data" | "business" | "product" | "tools" | "soft-skill";

export const COMPETENCY_CATEGORIES: CompetencyCategory[] = [
  "data",
  "business",
  "product",
  "tools",
  "soft-skill",
];

export interface Competency {
  id: string;
  name: string;
  category: CompetencyCategory;
  /** 향후 TipoTyping Theme 연결용 키(Theme.seedKey 등과 매칭 예정). 지금은 저장만 하고 실제 이동 기능은 없다. */
  learningThemeKey?: string;
  createdAt: number;
}

export interface Role {
  id: string;
  name: string;
  createdAt: number;
}

export interface RequirementCompetency {
  id: string;
  requirementId: string;
  competencyId: string;
}

export interface RequirementRole {
  id: string;
  requirementId: string;
  roleId: string;
}
