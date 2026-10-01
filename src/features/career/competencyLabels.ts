// Competency.category(CompetencyCategory)의 표시용 라벨/색상. JD Detail 태깅 UI와
// Dashboard의 Bubble Map이 공유한다. Figma Bubble Map 범례와 같은 고정 4분류다.
import type { CareerPillTone } from "@/features/career/components/CareerPill";
import type { CompetencyCategory } from "@/types/career";

export const COMPETENCY_CATEGORIES: CompetencyCategory[] = ["data", "business", "product", "tools"];

export const competencyCategoryLabel: Record<CompetencyCategory, string> = {
  data: "Data",
  business: "Business",
  product: "Product",
  tools: "Tools",
};

export const competencyCategoryTone: Record<CompetencyCategory, CareerPillTone> = {
  data: "blue",
  business: "green",
  product: "purple",
  tools: "amber",
};
