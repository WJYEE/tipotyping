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

export interface Requirement {
  id: string;
  jobPostingId: string;
  /** JD 원문 그대로. 회사마다 표현이 달라도 이 값은 절대 고치지 않는다 — 표준화는 별도 필드로 관리한다. */
  rawText: string;
  /** 사람이 보기 좋게 정리한 표준화 표현 (선택, 수동 입력). AI로 추측해 채우지 않는다. */
  normalizedLabel?: string;
  sourceSection?: RequirementSourceSection;
  createdAt: number;
}

export type CompetencyCategory = "data" | "business" | "product" | "tools";

export const COMPETENCY_CATEGORIES: CompetencyCategory[] = ["data", "business", "product", "tools"];

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
