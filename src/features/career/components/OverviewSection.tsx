import { AlertTriangleIcon, BookmarkIcon, LinkIcon, SearchIcon } from "@/components/ui/icons";
import type { CareerOverviewStats } from "@/db/repositories/careerStatsRepo";

interface Metric {
  icon: typeof BookmarkIcon;
  tone: "blue" | "purple" | "green" | "amber";
  label: string;
  value: number;
  note: string;
}

const TONE_CLASSES: Record<Metric["tone"], string> = {
  blue: "bg-career-blue-soft text-career-blue",
  purple: "bg-career-purple-soft text-career-purple",
  green: "bg-career-green-soft text-career-green",
  amber: "bg-career-amber-soft text-career-amber",
};

function formatLastUpdated(timestamp: number | null): string {
  if (timestamp === null) return "아직 없음";
  return new Date(timestamp).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OverviewSectionProps {
  stats: CareerOverviewStats;
}

export function OverviewSection({ stats }: OverviewSectionProps) {
  const metrics: Metric[] = [
    { icon: BookmarkIcon, tone: "blue", label: "저장 JD", value: stats.savedJdCount, note: "" },
    { icon: SearchIcon, tone: "purple", label: "연결 Competency", value: stats.extractedCompetencyCount, note: "" },
    { icon: LinkIcon, tone: "green", label: "연결 Evidence", value: stats.connectedEvidenceCount, note: "다음 단계 제공 예정" },
    { icon: AlertTriangleIcon, tone: "amber", label: "Preparation Gap", value: stats.preparationGapCount, note: "다음 단계 제공 예정" },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-6 bg-career-blue" />
            <span className="font-body text-xs tracking-wide text-career-blue">Career preparation</span>
          </div>
          <h1 className="font-display text-[34px] font-bold text-career-text-primary">
            모은 JD에서, 지금 준비할 것을 봅니다.
          </h1>
          <p className="font-body text-base text-career-text-secondary">
            저장한 JD를 기준으로 요구 Competency, Role 성향, 등록 현황을 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="font-body text-xs text-career-text-secondary">
            마지막 업데이트 · {formatLastUpdated(stats.lastUpdatedAt)}
          </span>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-career-blue" />
            <span className="font-body text-[13px] text-career-text-tertiary">등록된 JD {stats.savedJdCount}개</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-career-border border border-career-border bg-career-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <div key={metric.label} className="flex items-center gap-4 px-6 py-5">
              <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[metric.tone]}`}>
                <IconComponent className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-body text-xs text-career-text-secondary">{metric.label}</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold text-career-text-primary">{metric.value}</span>
                  {metric.note && (
                    <span className="font-body text-[11px] font-semibold text-career-text-secondary">{metric.note}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
