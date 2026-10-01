import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { competencyRepo } from "@/db/repositories";
import { CareerModal } from "@/features/career/components/CareerModal";
import { competencyCategoryLabel } from "@/features/career/competencyLabels";

interface CompetencyDetailModalProps {
  competencyId: string;
  onClose: () => void;
}

/**
 * Competency → 그 Competency를 요구한 JD → 실제 Requirement 원문(rawText)까지 역추적하는 화면.
 * learningThemeKey(향후 TipoTyping Theme 연결용)도 여기서 보고 수정한다 — 실제 이동 기능은 아직 없다.
 */
export function CompetencyDetailModal({ competencyId, onClose }: CompetencyDetailModalProps) {
  const competency = useLiveQuery(() => competencyRepo.get(competencyId), [competencyId]);
  const trace = useLiveQuery(() => competencyRepo.getDemandTrace(competencyId), [competencyId]) ?? [];

  const [learningThemeKeyDraft, setLearningThemeKeyDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!competency) {
    return (
      <CareerModal title="Competency" onClose={onClose}>
        <p className="font-body text-sm text-career-text-secondary">불러오는 중...</p>
      </CareerModal>
    );
  }

  const currentKey = learningThemeKeyDraft ?? competency.learningThemeKey ?? "";

  async function handleSaveThemeKey() {
    setSaving(true);
    try {
      await competencyRepo.update(competencyId, { learningThemeKey: currentKey.trim() || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CareerModal title={competency.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-career-text-secondary">카테고리</span>
          <span className="font-body text-xs font-semibold text-career-text-primary">
            {competencyCategoryLabel[competency.category]}
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[13px] font-semibold text-career-text-secondary">
            Learning Theme 연결 키 (선택 — 추후 TipoTyping 학습 이동용. 지금은 저장만 하고 이동 기능은 없습니다)
          </span>
          <div className="flex gap-2">
            <input
              value={currentKey}
              onChange={(e) => setLearningThemeKeyDraft(e.target.value)}
              placeholder="예: SQL"
              className="flex-1 rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-sm text-career-text-primary outline-none focus:border-career-blue"
            />
            <button
              type="button"
              onClick={handleSaveThemeKey}
              disabled={saving}
              className="rounded-[6px] border border-career-border px-3 py-2 font-body text-xs font-semibold text-career-text-primary disabled:opacity-60"
            >
              저장
            </button>
          </div>
        </label>

        <div className="flex flex-col gap-2">
          <h3 className="font-body text-[13px] font-semibold text-career-text-secondary">
            이 Competency를 요구한 JD ({trace.length}건)
          </h3>
          {trace.length === 0 ? (
            <p className="font-body text-xs text-career-text-muted">아직 연결된 Requirement가 없습니다.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {trace.map(({ requirement, jobPosting, companyName }) => (
                <li key={requirement.id} className="rounded-[6px] border border-career-border p-2.5">
                  <Link
                    to={`/career/jd-library/${jobPosting.id}`}
                    onClick={onClose}
                    className="font-body text-xs font-bold text-career-blue"
                  >
                    {companyName} · {jobPosting.positionTitle}
                  </Link>
                  <p className="mt-1 font-body text-xs text-career-text-tertiary">{requirement.rawText}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CareerModal>
  );
}
