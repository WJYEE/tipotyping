// JobPosting의 고용형태/신입·경력 조건/Requirement 출처 섹션 표시용 라벨.
// JdForm/JdLibraryScreen/JdDetailScreen/JSON import 검증/ChatGPT 프롬프트가 모두 공유한다.
import type { EmploymentType, ExperienceLevel, RequirementSourceSection } from "@/types/career";

export const employmentTypeLabel: Record<EmploymentType, string> = {
  "full-time": "정규직",
  contract: "계약직",
  intern: "인턴",
  freelance: "프리랜서",
  other: "기타",
};

export const experienceLevelLabel: Record<ExperienceLevel, string> = {
  entry: "신입",
  experienced: "경력",
  any: "신입/경력 무관",
};

export const requirementSourceSectionLabel: Record<RequirementSourceSection, string> = {
  responsibility: "담당업무",
  qualification: "자격요건",
  preferred: "우대사항",
};
