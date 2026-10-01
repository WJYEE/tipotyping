// JobPostingStatus(careerAggregation.ts)의 표시용 라벨/색상. JD Library와 Dashboard가 공유한다.
import type { CareerPillTone } from "@/features/career/components/CareerPill";
import type { JobPostingStatus } from "@/lib/careerAggregation";

export const analysisStatusLabel: Record<JobPostingStatus, string> = {
  "not-started": "요구사항 입력 전",
  "in-progress": "요구사항 정리 중",
  complete: "정리 완료",
};

export const analysisStatusTone: Record<JobPostingStatus, CareerPillTone> = {
  "not-started": "neutral",
  "in-progress": "blue",
  complete: "green",
};
