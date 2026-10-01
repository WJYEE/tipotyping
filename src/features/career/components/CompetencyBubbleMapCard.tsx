import { CareerCard } from "@/features/career/components/CareerCard";
import { COMPETENCY_CATEGORIES, competencyCategoryLabel } from "@/features/career/competencyLabels";
import type { CompetencyBubbleStat } from "@/db/repositories/careerStatsRepo";
import type { CompetencyCategory } from "@/types/career";

const CATEGORY_CLASSES: Record<CompetencyCategory, { dot: string; bubble: string; text: string }> = {
  data: { dot: "bg-career-blue", bubble: "border-career-blue bg-career-blue-soft", text: "text-career-blue" },
  business: { dot: "bg-career-green", bubble: "border-career-green bg-career-green-soft", text: "text-career-green" },
  product: { dot: "bg-career-purple", bubble: "border-career-purple bg-career-purple-soft", text: "text-career-purple" },
  tools: { dot: "bg-career-amber", bubble: "border-career-amber bg-career-amber-soft", text: "text-career-amber" },
};

// 버블 지름(px): demandCount/최댓값 비율을 이 범위로 매핑한다.
const MIN_SIZE = 72;
const MAX_SIZE = 148;

interface CompetencyBubbleMapCardProps {
  bubbles: CompetencyBubbleStat[];
}

export function CompetencyBubbleMapCard({ bubbles }: CompetencyBubbleMapCardProps) {
  const maxDemand = Math.max(1, ...bubbles.map((b) => b.demandCount));

  return (
    <CareerCard className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-career-border px-6 py-[18px] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] tracking-wide text-career-blue">Demand landscape</span>
          <h2 className="font-display text-xl font-bold text-career-text-primary">Competency Bubble Map</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {COMPETENCY_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_CLASSES[category].dot}`} />
              <span className="font-body text-xs text-career-text-secondary">{competencyCategoryLabel[category]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-6">
        {bubbles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="font-body text-sm text-career-text-secondary">아직 연결된 Competency가 없습니다.</p>
            <p className="font-body text-xs text-career-text-muted">
              JD Detail에서 Requirement에 Competency를 연결하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-4 py-4">
              {bubbles.map((bubble) => {
                const cls = CATEGORY_CLASSES[bubble.competency.category];
                const size = Math.round(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * (bubble.demandCount / maxDemand));
                return (
                  <div
                    key={bubble.competency.id}
                    className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border p-2 text-center ${cls.bubble}`}
                    style={{ width: size, height: size }}
                  >
                    <span className="font-body text-[11px] leading-tight text-career-text-primary">
                      {bubble.competency.name}
                    </span>
                    <span className={`font-display text-[13px] font-bold ${cls.text}`}>
                      {bubble.demandCount} / {bubble.totalJd}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-center font-body text-[11px] text-career-text-muted">
              버블 크기 = 요구 JD 빈도 · 저장 JD {bubbles[0]?.totalJd ?? 0}개 기준
            </p>
          </>
        )}
      </div>
    </CareerCard>
  );
}
