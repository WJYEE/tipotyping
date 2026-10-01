import { ArrowUpRightIcon } from "@/components/ui/icons";
import { CareerCard } from "@/features/career/components/CareerCard";
import { CareerPill, type CareerPillTone } from "@/features/career/components/CareerPill";
import {
  gapTypeLabel,
  gapTypeTone,
  type GapType,
  type PreparationGapRow,
} from "@/features/career/mockData";

const GAP_TYPES: GapType[] = ["knowledge", "experience", "evidence", "qualification"];

// Tailwind는 클래스 문자열을 정적으로 스캔하므로 `bg-career-${tone}` 같은 동적 조합은 빌드에
// 포함되지 않는다 — tone별 전체 클래스를 명시적으로 나열해 둔다.
const STATUS_DOT_CLASSES: Record<CareerPillTone, string> = {
  blue: "bg-career-blue",
  purple: "bg-career-purple",
  amber: "bg-career-amber",
  green: "bg-career-green",
  red: "bg-career-red",
  neutral: "bg-career-text-muted",
};

interface PreparationGapCardProps {
  rows: PreparationGapRow[];
}

export function PreparationGapCard({ rows }: PreparationGapCardProps) {
  const priorityCount = rows.filter((r) => r.evidenceStatus.tone === "red").length;

  return (
    <CareerCard className="flex flex-col border-career-border-strong">
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] tracking-wide text-career-amber">Priority worklist</span>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-bold text-career-text-primary">Preparation Gap</h2>
            <span className="font-body text-xs text-career-text-secondary">
              우선 확인 {priorityCount}개 · 전체 Gap {rows.length}개
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {GAP_TYPES.map((type) => (
            <CareerPill key={type} tone={gapTypeTone[type]}>
              {gapTypeLabel[type]}
            </CareerPill>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[320px_150px_220px_190px_1fr] gap-4 bg-career-table-header px-6 py-2.5">
            {["Competency", "요구 JD 수", "Evidence 상태", "Gap 유형", "다음 준비"].map((h) => (
              <span key={h} className="font-body text-[11px] tracking-wide text-career-text-secondary">
                {h}
              </span>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[320px_150px_220px_190px_1fr] items-center gap-4 border-b border-career-border px-6 py-3.5 last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-bold text-career-text-primary">{row.competency}</span>
                <span className="font-body text-[11px] text-career-text-secondary">{row.category}</span>
              </div>
              <span className="font-display text-[13px] font-bold text-career-text-primary">
                {row.demandCount} / {row.totalJd} JD
              </span>
              <div className="flex items-center gap-2">
                <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT_CLASSES[row.evidenceStatus.tone]}`} />
                <span className="font-body text-[13px] font-semibold text-career-text-tertiary">
                  {row.evidenceStatus.label}
                </span>
              </div>
              <CareerPill tone={gapTypeTone[row.gapType]} className="w-fit">
                {gapTypeLabel[row.gapType]}
              </CareerPill>
              <div className="flex items-center gap-2.5">
                <span className="font-body text-[13px] text-career-text-tertiary">{row.recommendedAction}</span>
                <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-career-blue" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CareerCard>
  );
}
