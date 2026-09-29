import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { ThemeStatRow } from "@/db/repositories/statsRepo";

export function ThemeStatsCard({ rows }: { rows: ThemeStatRow[] }) {
  return (
    <Card className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-extrabold text-text-primary">📊 테마별 현황</h2>
        <span className="font-body text-[13px] text-text-secondary">정확도</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center font-body text-sm text-text-secondary">
          아직 테마별 학습 기록이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <div key={row.themeId} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="font-body text-sm font-semibold text-text-primary">
                  {row.themeName}
                </span>
                <span className="font-display text-xs font-bold text-text-secondary">
                  {formatPercent(row.accuracy)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-[13px] text-text-secondary">오늘 풀이 수</span>
                <span className="font-display text-sm font-bold text-text-primary">
                  {row.todayAttempts}개
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
