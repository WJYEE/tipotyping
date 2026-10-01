import { AlertTriangleIcon, BookmarkIcon, LinkIcon, SearchIcon } from "@/components/ui/icons";
import type { OverviewMetric } from "@/features/career/mockData";

const ICONS = {
  bookmark: BookmarkIcon,
  "scan-search": SearchIcon,
  link: LinkIcon,
  "alert-triangle": AlertTriangleIcon,
};

const TONE_CLASSES: Record<OverviewMetric["tone"], string> = {
  blue: "bg-career-blue-soft text-career-blue",
  purple: "bg-career-purple-soft text-career-purple",
  green: "bg-career-green-soft text-career-green",
  amber: "bg-career-amber-soft text-career-amber",
};

interface OverviewSectionProps {
  lastAnalyzedAt: string;
  metrics: OverviewMetric[];
}

export function OverviewSection({ lastAnalyzedAt, metrics }: OverviewSectionProps) {
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
            저장한 공고 14개를 기준으로 요구 역량, 내 경험의 근거, 준비 격차를 한 흐름으로 분석했습니다.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="font-body text-xs text-career-text-secondary">마지막 분석 · {lastAnalyzedAt}</span>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-career-green" />
            <span className="font-body text-[13px] text-career-text-tertiary">전체 JD 분석 완료</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-career-border border border-career-border bg-career-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {metrics.map((metric) => {
          const IconComponent = ICONS[metric.icon];
          return (
            <div key={metric.id} className="flex items-center gap-4 px-6 py-5">
              <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[metric.tone]}`}>
                <IconComponent className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-body text-xs text-career-text-secondary">{metric.label}</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold text-career-text-primary">{metric.value}</span>
                  <span className="font-body text-[11px] font-semibold text-career-text-secondary">{metric.note}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
