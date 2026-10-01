import { useState } from "react";
import { CareerCard } from "@/features/career/components/CareerCard";
import { COMPETENCY_CATEGORIES, competencyCategoryLabel } from "@/features/career/competencyLabels";
import { competencyBubbleSize, competencyDemandPercent, filterAndLimitCompetencyBubbles } from "@/lib/careerAggregation";
import type { CompetencyBubbleStat } from "@/db/repositories/careerStatsRepo";
import type { CompetencyCategory } from "@/types/career";

const CATEGORY_CLASSES: Record<CompetencyCategory, { dot: string; bubble: string; text: string }> = {
  data: { dot: "bg-career-blue", bubble: "border-career-blue bg-career-blue-soft", text: "text-career-blue" },
  business: { dot: "bg-career-green", bubble: "border-career-green bg-career-green-soft", text: "text-career-green" },
  product: { dot: "bg-career-purple", bubble: "border-career-purple bg-career-purple-soft", text: "text-career-purple" },
  tools: { dot: "bg-career-amber", bubble: "border-career-amber bg-career-amber-soft", text: "text-career-amber" },
  "soft-skill": { dot: "bg-career-red", bubble: "border-career-red bg-career-red-soft", text: "text-career-red" },
};

type CategoryFilter = CompetencyCategory | "all";

// 버블 지름(px): demandCount/최댓값 비율을 이 범위로 매핑한다(competencyBubbleSize가 비선형으로 키운다).
const MIN_SIZE = 56;
const MAX_SIZE = 172;
const DEFAULT_LIMIT = 15;

interface CompetencyBubbleMapCardProps {
  bubbles: CompetencyBubbleStat[];
  onSelectCompetency?: (competencyId: string) => void;
}

export function CompetencyBubbleMapCard({ bubbles, onSelectCompetency }: CompetencyBubbleMapCardProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const categoryFiltered = filterAndLimitCompetencyBubbles(bubbles, category, Infinity);
  const visible = showAll ? categoryFiltered : filterAndLimitCompetencyBubbles(bubbles, category, DEFAULT_LIMIT);
  const maxDemand = Math.max(1, ...categoryFiltered.map((b) => b.demandCount));
  const hiddenCount = categoryFiltered.length - visible.length;

  function handleSelectCategory(next: CategoryFilter) {
    setCategory(next);
    setShowAll(false);
  }

  return (
    <CareerCard className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-career-border px-6 py-[18px] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] tracking-wide text-career-blue">Demand landscape</span>
          <h2 className="font-display text-xl font-bold text-career-text-primary">Competency Bubble Map</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectCategory("all")}
            className={`rounded-full border px-2.5 py-1 font-body text-xs ${
              category === "all"
                ? "border-career-text-primary font-semibold text-career-text-primary"
                : "border-career-border text-career-text-secondary"
            }`}
          >
            All
          </button>
          {COMPETENCY_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectCategory(c)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-xs ${
                category === c
                  ? "border-career-text-primary font-semibold text-career-text-primary"
                  : "border-career-border text-career-text-secondary"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CATEGORY_CLASSES[c].dot}`} />
              {competencyCategoryLabel[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-6">
        {categoryFiltered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="font-body text-sm text-career-text-secondary">아직 연결된 Competency가 없습니다.</p>
            <p className="font-body text-xs text-career-text-muted">
              JD Detail에서 Requirement에 Competency를 연결하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-4 py-4">
              {visible.map((bubble) => {
                const cls = CATEGORY_CLASSES[bubble.competency.category];
                const size = competencyBubbleSize(bubble.demandCount, maxDemand, MIN_SIZE, MAX_SIZE);
                const percent = competencyDemandPercent(bubble.demandCount, bubble.totalJd);
                return (
                  <button
                    key={bubble.competency.id}
                    type="button"
                    title={`${bubble.demandCount} / ${bubble.totalJd} JDs`}
                    onClick={() => onSelectCompetency?.(bubble.competency.id)}
                    className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border p-2 text-center ${cls.bubble}`}
                    style={{ width: size, height: size }}
                  >
                    <span className="font-body text-[11px] leading-tight text-career-text-primary">
                      {bubble.competency.name}
                    </span>
                    <span className={`font-display text-[13px] font-bold ${cls.text}`}>{percent}%</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <p className="text-center font-body text-[11px] text-career-text-muted">
                버블 크기·비율(%) = 요구 JD 빈도 · 저장 JD {bubbles[0]?.totalJd ?? 0}개 기준
              </p>
              {(hiddenCount > 0 || showAll) && categoryFiltered.length > DEFAULT_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="font-body text-xs font-semibold text-career-blue"
                >
                  {showAll ? "Top 15만 보기" : `전체 보기 (${categoryFiltered.length}개 중 ${visible.length}개 표시 중)`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </CareerCard>
  );
}
