import { Card } from "@/components/ui/Card";
import { formatPercent, formatRelativeTime } from "@/lib/format";
import type { RecentSessionSummary } from "@/db/repositories/statsRepo";

export function RecentSessionsCard({ sessions }: { sessions: RecentSessionSummary[] }) {
  return (
    <Card className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-extrabold text-text-primary">🕒 최근 기록</h2>
        <span className="font-body text-[13px] text-text-secondary">최근 {sessions.length}개 세션</span>
      </div>

      {sessions.length === 0 ? (
        <p className="py-6 text-center font-body text-sm text-text-secondary">
          아직 학습 기록이 없습니다. 게임을 시작해보세요!
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-[12px] border border-border bg-surface-muted px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="font-body text-sm font-semibold text-text-primary">
                  {session.themeNames.join(", ") || "테마 없음"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="font-body text-xs text-text-secondary">
                    시도 {session.totalAttempts}개
                  </span>
                  <span className="font-display text-sm font-bold text-success">
                    {formatPercent(session.accuracy)}
                  </span>
                </div>
                <span className="font-body text-xs text-text-secondary">
                  {formatRelativeTime(session.startedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
