import { CareerCard } from "@/features/career/components/CareerCard";
import type { RoleMixStat } from "@/db/repositories/careerStatsRepo";

// Role은 사용자가 자유롭게 생성하므로(고정 enum 아님) 고정 팔레트를 순서대로 돌려 배정한다.
const COLOR_CYCLE = [
  "var(--color-career-blue)",
  "var(--color-career-purple)",
  "var(--color-career-amber)",
  "var(--color-career-green)",
  "var(--color-career-navy)",
  "var(--color-career-text-secondary)",
];

interface RoleMixCardProps {
  stats: RoleMixStat[];
  /**
   * Role Mix 항목 drill-down 지점. 아직 근거 Requirement/Competency → JD 원문 화면이 없어
   * 지금은 연결하지 않고 자리만 잡아둔다 — Phase 3에서 이 prop에 실제 네비게이션을 붙이면 된다.
   */
  onSelectRole?: (stat: RoleMixStat) => void;
}

export function RoleMixCard({ stats, onSelectRole }: RoleMixCardProps) {
  const topRole = stats[0];

  return (
    <CareerCard className="flex w-full flex-col lg:w-[478px] lg:shrink-0">
      <div className="flex flex-col gap-1 border-b border-career-border px-6 py-[18px]">
        <span className="font-body text-[11px] tracking-wide text-career-purple">Actual work character</span>
        <h2 className="font-display text-xl font-bold text-career-text-primary">Role Mix</h2>
        <p className="font-body text-xs text-career-text-secondary">
          공고 제목이 아닌 실제 요구사항의 성격을 분류했습니다.
        </p>
      </div>

      {stats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="font-body text-sm text-career-text-secondary">아직 연결된 Role이 없습니다.</p>
          <p className="font-body text-xs text-career-text-muted">
            JD Detail에서 Requirement에 Role을 연결하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex h-[14px] w-full overflow-hidden rounded-[2px]">
            {stats.map((stat, i) => (
              <span
                key={stat.role.id}
                style={{ width: `${stat.percent}%`, backgroundColor: COLOR_CYCLE[i % COLOR_CYCLE.length] }}
              />
            ))}
          </div>

          <ul className="flex flex-col gap-[13px]">
            {stats.map((stat, i) => (
              <li key={stat.role.id}>
                <button
                  type="button"
                  onClick={() => onSelectRole?.(stat)}
                  className="flex w-full flex-col gap-1.5 text-left"
                >
                  <span className="flex items-baseline justify-between">
                    <span className="font-body text-[13px] text-career-text-tertiary">{stat.role.name}</span>
                    <span className="font-display text-[13px] font-bold text-career-text-primary">{stat.percent}%</span>
                  </span>
                  <span className="block h-[5px] w-full rounded-pill bg-career-table-header">
                    <span
                      className="block h-full rounded-pill"
                      style={{ width: `${stat.percent}%`, backgroundColor: COLOR_CYCLE[i % COLOR_CYCLE.length] }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {topRole && (
            <div className="flex flex-col gap-1.5 border-t border-career-border pt-3.5">
              <span className="font-body text-[11px] tracking-wide text-career-purple">Reading</span>
              <p className="font-body text-[13px] text-career-text-tertiary">
                가장 많이 나타나는 성향은 "{topRole.role.name}"({topRole.percent}%)입니다.
              </p>
            </div>
          )}
        </div>
      )}
    </CareerCard>
  );
}
