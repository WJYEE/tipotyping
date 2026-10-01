// JobPosting의 고용형태/신입·경력 조건 표시용 라벨. JdForm/JdLibraryScreen/JSON import 검증이 공유한다.
import type { EmploymentType, ExperienceLevel } from "@/types/career";

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
