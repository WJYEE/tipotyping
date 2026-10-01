// Career 서비스 영역의 도메인 타입. Learning(src/types/domain.ts)과는 별개 바운디드 컨텍스트.
// 설계 근거는 eager-beaming-lighthouse 계획(Career Phase 2) 참고: Role 분류는 JobPosting이 아닌
// Requirement 단위다("공고 제목이 아닌 실제 요구사항의 성격을 분류"). AI 자동 분석은 이번 단계에
// 없고, Competency/Role 태깅은 모두 수동(기존 Question tagIds의 getOrCreate 패턴과 동일).

export interface Company {
  id: string;
  name: string;
  createdAt: number;
}

export interface JobPosting {
  id: string;
  companyId: string;
  /** 공고명 (예: "2026년 상반기 신입/경력 공개채용") */
  postingTitle: string;
  /** 직무명 (예: "Business Data Analyst") */
  positionTitle: string;
  jdUrl?: string;
  responsibilities: string;
  qualifications: string;
  preferredQualifications: string;
  createdAt: number;
  updatedAt: number;
}

export type RequirementSourceSection = "responsibility" | "qualification" | "preferred";

export interface Requirement {
  id: string;
  jobPostingId: string;
  text: string;
  sourceSection?: RequirementSourceSection;
  createdAt: number;
}

export type CompetencyCategory = "data" | "business" | "product" | "tools";

export interface Competency {
  id: string;
  name: string;
  category: CompetencyCategory;
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
