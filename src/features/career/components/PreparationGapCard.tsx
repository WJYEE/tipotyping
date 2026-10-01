import { CareerCard } from "@/features/career/components/CareerCard";

/**
 * Preparation Gap은 "요구 대비 Evidence 연결 상태"를 보여주는 섹션인데, Evidence 데이터 모델이
 * 아직 없다(이번 단계 범위 밖). 실제로 계산할 수 없는 값을 임의로 만들지 않고, 다음 단계에서
 * Evidence가 생기면 채워질 자리라는 것만 명확히 보여준다.
 */
export function PreparationGapCard() {
  return (
    <CareerCard className="flex flex-col border-career-border-strong">
      <div className="flex flex-col gap-1 px-6 py-4">
        <span className="font-body text-[11px] tracking-wide text-career-amber">Priority worklist</span>
        <h2 className="font-display text-xl font-bold text-career-text-primary">Preparation Gap</h2>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="font-body text-sm text-career-text-secondary">Evidence 연결 기능은 다음 단계에서 제공됩니다.</p>
        <p className="font-body text-xs text-career-text-muted">
          Competency별 요구 대비 보유 Evidence를 비교해 우선순위를 보여줄 예정입니다.
        </p>
      </div>
    </CareerCard>
  );
}
