import { CareerCard } from "@/features/career/components/CareerCard";
import {
  competencyCategoryLabel,
  competencyMapInsight,
  competencyMapSizeGuide,
  type CompetencyBubble,
  type CompetencyCategory,
} from "@/features/career/mockData";

const CATEGORY_CLASSES: Record<CompetencyCategory, { dot: string; bubble: string; text: string }> = {
  data: { dot: "bg-career-blue", bubble: "border-career-blue bg-career-blue-soft", text: "text-career-blue" },
  business: { dot: "bg-career-green", bubble: "border-career-green bg-career-green-soft", text: "text-career-green" },
  product: { dot: "bg-career-purple", bubble: "border-career-purple bg-career-purple-soft", text: "text-career-purple" },
  tools: { dot: "bg-career-amber", bubble: "border-career-amber bg-career-amber-soft", text: "text-career-amber" },
};

const CATEGORIES: CompetencyCategory[] = ["data", "business", "product", "tools"];

interface CompetencyBubbleMapCardProps {
  bubbles: CompetencyBubble[];
}

export function CompetencyBubbleMapCard({ bubbles }: CompetencyBubbleMapCardProps) {
  return (
    <CareerCard className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-career-border px-6 py-[18px] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] tracking-wide text-career-blue">Demand landscape</span>
          <h2 className="font-display text-xl font-bold text-career-text-primary">Competency Bubble Map</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_CLASSES[category].dot}`} />
              <span className="font-body text-xs text-career-text-secondary">{competencyCategoryLabel[category]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative min-h-[360px] flex-1 px-6 py-6">
        <div className="relative h-[320px] w-full">
          {bubbles.map((bubble) => {
            const cls = CATEGORY_CLASSES[bubble.category];
            return (
              <div
                key={bubble.id}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border p-2 text-center ${cls.bubble}`}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  width: `${bubble.size}%`,
                  aspectRatio: "1 / 1",
                  maxWidth: 140,
                  maxHeight: 140,
                }}
              >
                <span className="font-body text-[11px] leading-tight text-career-text-primary">{bubble.name}</span>
                <span className={`font-display text-[13px] font-bold ${cls.text}`}>
                  {bubble.demandCount} / {bubble.totalJd}
                </span>
              </div>
            );
          })}

          <div className="absolute bottom-0 right-0 flex max-w-[180px] items-start gap-2 rounded-[6px] border border-career-border-strong bg-career-surface p-2.5">
            <span className="mt-0.5 h-[45px] w-0.5 shrink-0 bg-career-blue" />
            <p className="font-body text-[11px] font-semibold leading-snug text-career-text-tertiary">
              {competencyMapInsight}
            </p>
          </div>
        </div>
        <p className="mt-4 font-body text-[11px] text-career-text-muted">{competencyMapSizeGuide}</p>
      </div>
    </CareerCard>
  );
}
