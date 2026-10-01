import { useState } from "react";
import { companyRepo, jobPostingRepo } from "@/db/repositories";
import type { JobPosting } from "@/types/career";

const inputClass =
  "rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-sm text-career-text-primary outline-none focus:border-career-blue";

interface JdFormProps {
  initial?: JobPosting & { companyName: string };
  onClose: () => void;
}

/** JD 추가/수정 모달. 생성과 수정이 같은 폼을 공유한다(QuestionForm.tsx와 같은 패턴). */
export function JdForm({ initial, onClose }: JdFormProps) {
  const isEdit = !!initial;

  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [postingTitle, setPostingTitle] = useState(initial?.postingTitle ?? "");
  const [positionTitle, setPositionTitle] = useState(initial?.positionTitle ?? "");
  const [jdUrl, setJdUrl] = useState(initial?.jdUrl ?? "");
  const [responsibilities, setResponsibilities] = useState(initial?.responsibilities ?? "");
  const [qualifications, setQualifications] = useState(initial?.qualifications ?? "");
  const [preferredQualifications, setPreferredQualifications] = useState(initial?.preferredQualifications ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !positionTitle.trim()) {
      setError("회사명과 직무명은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const company = await companyRepo.getOrCreate(companyName.trim());
      const data = {
        companyId: company.id,
        postingTitle: postingTitle.trim(),
        positionTitle: positionTitle.trim(),
        jdUrl: jdUrl.trim() || undefined,
        responsibilities,
        qualifications,
        preferredQualifications,
      };
      if (isEdit && initial) {
        await jobPostingRepo.update(initial.id, data);
      } else {
        await jobPostingRepo.create(data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-career-text-primary/40 p-6">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[8px] border border-career-border bg-career-surface p-6">
        <h2 className="font-display text-lg font-bold text-career-text-primary">{isEdit ? "JD 수정" : "JD 추가"}</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-career-text-secondary">회사명</span>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="예: Toss" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-career-text-secondary">직무명</span>
              <input
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                className={inputClass}
                placeholder="예: Business Data Analyst"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">공고명</span>
            <input
              value={postingTitle}
              onChange={(e) => setPostingTitle(e.target.value)}
              className={inputClass}
              placeholder="예: 2026년 상반기 신입/경력 공개채용"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">JD URL (선택)</span>
            <input value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">담당업무</span>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className={`${inputClass} min-h-20`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">자격요건</span>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className={`${inputClass} min-h-20`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">우대사항</span>
            <textarea
              value={preferredQualifications}
              onChange={(e) => setPreferredQualifications(e.target.value)}
              className={`${inputClass} min-h-20`}
            />
          </label>

          {error && <p className="font-body text-xs text-career-red">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] border border-career-border px-4 py-2 font-body text-sm font-semibold text-career-text-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[6px] bg-career-text-primary px-4 py-2 font-body text-sm font-bold text-white disabled:opacity-60"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
