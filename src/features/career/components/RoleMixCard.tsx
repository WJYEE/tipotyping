import { CareerCard } from "@/features/career/components/CareerCard";
import { roleMixInsight, type RoleMixEntry } from "@/features/career/mockData";

interface RoleMixCardProps {
  entries: RoleMixEntry[];
  /**
   * Role Mix 항목 drill-down 지점. 아직 근거 Requirement/Competency → JD 원문 화면이 없어
   * 지금은 연결하지 않고 자리만 잡아둔다 — Phase 2에서 이 prop에 실제 네비게이션을 붙이면 된다.
   */
  onSelectRole?: (role: RoleMixEntry) => void;
}

export function RoleMixCard({ entries, onSelectRole }: RoleMixCardProps) {
  return (
    <CareerCard className="flex w-full flex-col lg:w-[478px] lg:shrink-0">
      <div className="flex flex-col gap-1 border-b border-career-border px-6 py-[18px]">
        <span className="font-body text-[11px] tracking-wide text-career-purple">Actual work character</span>
        <h2 className="font-display text-xl font-bold text-career-text-primary">Role Mix</h2>
        <p className="font-body text-xs text-career-text-secondary">
          공고 제목이 아닌 실제 요구사항의 성격을 분류했습니다.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-6 py-6">
        <div className="flex h-[14px] w-full overflow-hidden rounded-[2px]">
          {entries.map((entry) => (
            <span key={entry.id} style={{ width: `${entry.percent}%`, backgroundColor: entry.colorVar }} />
          ))}
        </div>

        <ul className="flex flex-col gap-[13px]">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelectRole?.(entry)}
                className="flex w-full flex-col gap-1.5 text-left"
              >
                <span className="flex items-baseline justify-between">
                  <span className="font-body text-[13px] text-career-text-tertiary">{entry.name}</span>
                  <span className="font-display text-[13px] font-bold text-career-text-primary">{entry.percent}%</span>
                </span>
                <span className="block h-[5px] w-full rounded-pill bg-career-table-header">
                  <span
                    className="block h-full rounded-pill"
                    style={{ width: `${entry.percent}%`, backgroundColor: entry.colorVar }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1.5 border-t border-career-border pt-3.5">
          <span className="font-body text-[11px] tracking-wide text-career-purple">Reading</span>
          <p className="font-body text-[13px] text-career-text-tertiary">{roleMixInsight}</p>
        </div>
      </div>
    </CareerCard>
  );
}
