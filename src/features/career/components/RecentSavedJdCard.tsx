import { ArrowRightIcon, BookmarkCheckIcon } from "@/components/ui/icons";
import { CareerCard } from "@/features/career/components/CareerCard";
import { CareerPill, type CareerPillTone } from "@/features/career/components/CareerPill";
import { analysisStatusLabel, analysisStatusTone, type SavedJdRow } from "@/features/career/mockData";

// Tailwind 정적 스캔 때문에 tone별 전체 클래스를 명시적으로 나열한다 (PreparationGapCard와 동일한 이유).
const AVATAR_CLASSES: Record<CareerPillTone, string> = {
  blue: "bg-career-blue-soft",
  purple: "bg-career-purple-soft",
  amber: "bg-career-amber-soft",
  green: "bg-career-green-soft",
  red: "bg-career-red-soft",
  neutral: "bg-career-table-header",
};

interface RecentSavedJdCardProps {
  rows: SavedJdRow[];
  totalCount: number;
}

export function RecentSavedJdCard({ rows, totalCount }: RecentSavedJdCardProps) {
  return (
    <CareerCard className="flex flex-col">
      <div className="flex flex-col gap-3 px-6 py-[15px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-[11px] tracking-wide text-career-blue">Source library</span>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-bold text-career-text-primary">Recent / Saved JD</h2>
            <span className="font-body text-xs text-career-text-secondary">
              최근 저장 순 · 전체 {totalCount}개
            </span>
          </div>
        </div>
        <button type="button" className="flex items-center gap-2 font-body text-[13px] font-bold text-career-text-primary">
          JD Library 전체 보기
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[220px_380px_190px_190px_1fr] gap-4 bg-career-table-header px-6 py-2">
            {["회사", "포지션", "저장", "분석 상태", "이동"].map((h, i) => (
              <span
                key={h}
                className={`font-body text-[11px] tracking-wide text-career-text-secondary ${i === 4 ? "text-right" : ""}`}
              >
                {h}
              </span>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[220px_380px_190px_190px_1fr] items-center gap-4 border-b border-career-border px-6 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] font-display text-xs text-career-text-primary ${AVATAR_CLASSES[row.companyTone]}`}
                >
                  {row.companyInitials}
                </span>
                <span className="font-body text-[13px] font-bold text-career-text-primary">{row.companyName}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-bold text-career-text-primary">{row.positionTitle}</span>
                <span className="font-body text-[11px] text-career-text-secondary">{row.positionMeta}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookmarkCheckIcon className="h-3.5 w-3.5 text-career-blue" />
                <span className="font-body text-[13px] text-career-text-tertiary">{row.savedTime}</span>
              </div>
              <CareerPill tone={analysisStatusTone[row.status]} className="w-fit">
                {analysisStatusLabel[row.status]}
              </CareerPill>
              <button type="button" className="flex items-center justify-end gap-2 font-body text-[13px] font-bold text-career-blue">
                JD Detail
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </CareerCard>
  );
}
