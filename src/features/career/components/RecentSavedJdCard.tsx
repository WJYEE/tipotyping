import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@/components/ui/icons";
import { CareerCard } from "@/features/career/components/CareerCard";
import { CareerPill } from "@/features/career/components/CareerPill";
import { analysisStatusLabel, analysisStatusTone } from "@/features/career/statusLabels";
import type { JobPostingSummary } from "@/db/repositories/careerStatsRepo";

// Company는 사용자가 자유롭게 생성하므로(고정 enum 아님) 고정 팔레트를 순서대로 돌려 배정한다.
const AVATAR_CLASSES = ["bg-career-blue-soft", "bg-career-purple-soft", "bg-career-amber-soft", "bg-career-green-soft"];

interface RecentSavedJdCardProps {
  rows: JobPostingSummary[];
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
            <span className="font-body text-xs text-career-text-secondary">최근 저장 순 · 전체 {totalCount}개</span>
          </div>
        </div>
        <Link to="/career/jd-library" className="flex items-center gap-2 font-body text-[13px] font-bold text-career-text-primary">
          JD Library 전체 보기
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center font-body text-sm text-career-text-secondary">
          아직 저장한 JD가 없습니다. JD Library에서 첫 JD를 등록해보세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[220px_380px_190px_190px_1fr] gap-4 bg-career-table-header px-6 py-2">
              {["회사", "포지션", "저장", "상태", "이동"].map((h, i) => (
                <span
                  key={h}
                  className={`font-body text-[11px] tracking-wide text-career-text-secondary ${i === 4 ? "text-right" : ""}`}
                >
                  {h}
                </span>
              ))}
            </div>

            {rows.map(({ jobPosting, companyName, status }, i) => (
              <Link
                key={jobPosting.id}
                to={`/career/jd-library/${jobPosting.id}`}
                className="grid grid-cols-[220px_380px_190px_190px_1fr] items-center gap-4 border-b border-career-border px-6 py-3 last:border-b-0 hover:bg-career-bg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] font-display text-xs text-career-text-primary ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}
                  >
                    {companyName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-body text-[13px] font-bold text-career-text-primary">{companyName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-body text-[13px] font-bold text-career-text-primary">{jobPosting.positionTitle}</span>
                  <span className="font-body text-[11px] text-career-text-secondary">{jobPosting.postingTitle}</span>
                </div>
                <span className="font-body text-[13px] text-career-text-tertiary">
                  {new Date(jobPosting.createdAt).toLocaleDateString("ko-KR")}
                </span>
                <CareerPill tone={analysisStatusTone[status]} className="w-fit">
                  {analysisStatusLabel[status]}
                </CareerPill>
                <span className="flex items-center justify-end gap-2 font-body text-[13px] font-bold text-career-blue">
                  JD Detail
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </CareerCard>
  );
}
