import { StatTile } from "@/components/ui/StatTile";
import { BookOpenIcon, CheckIcon, ClockIcon, TargetIcon, XIcon } from "@/components/ui/icons";
import { formatDuration, formatPercent } from "@/lib/format";
import type { OverallStats } from "@/db/repositories/statsRepo";

const ICON_CLASS = "h-5 w-5 text-text-primary";

export function StatsRow({ stats }: { stats: OverallStats }) {
  return (
    <div className="flex flex-wrap gap-4">
      <StatTile
        tone="info"
        icon={<ClockIcon className={ICON_CLASS} />}
        label="학습시간"
        value={formatDuration(stats.totalDurationMs)}
      />
      <StatTile
        tone="success"
        icon={<BookOpenIcon className={ICON_CLASS} />}
        label="푼 문제"
        value={`${stats.totalAttempts}개`}
      />
      <StatTile
        tone="warning"
        icon={<CheckIcon className={ICON_CLASS} />}
        label="정답"
        value={`${stats.correctCount}개`}
      />
      <StatTile
        tone="danger"
        icon={<XIcon className={ICON_CLASS} />}
        label="오답"
        value={`${stats.wrongCount}개`}
      />
      <StatTile
        tone="accent"
        icon={<TargetIcon className={ICON_CLASS} />}
        label="정확도"
        value={formatPercent(stats.accuracy)}
      />
    </div>
  );
}
