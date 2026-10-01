import { useState } from "react";
import { companyRepo, jobPostingRepo } from "@/db/repositories";
import { employmentTypeLabel, experienceLevelLabel } from "@/features/career/jobPostingLabels";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, type EmploymentType, type ExperienceLevel, type JobPosting } from "@/types/career";

const inputClass =
  "rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-sm text-career-text-primary outline-none focus:border-career-blue";

interface JdFormProps {
  /** 수정 대상. id가 있으면 수정 모드로 동작한다(QuestionForm.tsx와 같은 패턴). */
  initial?: JobPosting & { companyName: string };
  /**
   * 생성 모드에서 일부 필드만 미리 채워둘 때 쓴다(JD 원문 붙여넣기 파싱 결과).
   * initial과 달리 "수정"으로 취급하지 않는다 — 새 JD를 만들되 담당업무/자격요건/우대사항만 미리 채운다.
   */
  prefill?: Partial<Pick<JobPosting, "responsibilities" | "qualifications" | "preferredQualifications">>;
  onClose: () => void;
}

/** JD 추가/수정 폼. 생성과 수정이 같은 폼을 공유한다(QuestionForm.tsx와 같은 패턴). */
export function JdForm({ initial, prefill, onClose }: JdFormProps) {
  const isEdit = !!initial;

  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [postingTitle, setPostingTitle] = useState(initial?.postingTitle ?? "");
  const [positionTitle, setPositionTitle] = useState(initial?.positionTitle ?? "");
  const [jdUrl, setJdUrl] = useState(initial?.jdUrl ?? "");
  const [responsibilities, setResponsibilities] = useState(initial?.responsibilities ?? prefill?.responsibilities ?? "");
  const [qualifications, setQualifications] = useState(initial?.qualifications ?? prefill?.qualifications ?? "");
  const [preferredQualifications, setPreferredQualifications] = useState(
    initial?.preferredQualifications ?? prefill?.preferredQualifications ?? "",
  );
  const [applicationStartDate, setApplicationStartDate] = useState(initial?.applicationStartDate ?? "");
  const [applicationEndDate, setApplicationEndDate] = useState(initial?.applicationEndDate ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">(initial?.employmentType ?? "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(initial?.experienceLevel ?? "");
  const [workLocation, setWorkLocation] = useState(initial?.workLocation ?? "");
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
        applicationStartDate: applicationStartDate || undefined,
        applicationEndDate: applicationEndDate || undefined,
        employmentType: employmentType || undefined,
        experienceLevel: experienceLevel || undefined,
        workLocation: workLocation.trim() || undefined,
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
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <span className="font-body text-[13px] font-semibold text-career-text-secondary">
            JD URL (선택 — 원문 이동용, 자동 수집하지 않음)
          </span>
          <input value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} className={inputClass} placeholder="https://..." />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">채용 시작일</span>
            <input
              type="date"
              value={applicationStartDate}
              onChange={(e) => setApplicationStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">채용 마감일</span>
            <input
              type="date"
              value={applicationEndDate}
              onChange={(e) => setApplicationEndDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">고용형태</span>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType | "")}
              className={inputClass}
            >
              <option value="">선택 안 함</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {employmentTypeLabel[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">신입/경력</span>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel | "")}
              className={inputClass}
            >
              <option value="">선택 안 함</option>
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {experienceLevelLabel[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-career-text-secondary">근무지역</span>
            <input
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              className={inputClass}
              placeholder="예: 서울 강남구"
            />
          </label>
        </div>

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
    </>
  );
}
