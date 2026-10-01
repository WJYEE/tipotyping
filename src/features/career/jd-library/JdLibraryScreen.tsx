import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { companyRepo, jobPostingRepo } from "@/db/repositories";
import { summarizeJobPostings, type JobPostingSummary } from "@/db/repositories/careerStatsRepo";
import { CareerCard } from "@/features/career/components/CareerCard";
import { CareerPill } from "@/features/career/components/CareerPill";
import { JdForm } from "@/features/career/jd-library/JdForm";
import { analysisStatusLabel, analysisStatusTone } from "@/features/career/statusLabels";
import type { JobPosting } from "@/types/career";

export function JdLibraryScreen() {
  const navigate = useNavigate();
  const jobPostings = useLiveQuery(() => jobPostingRepo.list(), []) ?? [];
  const companies = useLiveQuery(() => companyRepo.list(), []) ?? [];
  const summaries = useLiveQuery(() => summarizeJobPostings(jobPostings), [jobPostings]) ?? [];

  const [editing, setEditing] = useState<"new" | JobPostingSummary | null>(null);

  async function handleDelete(e: React.MouseEvent, jobPosting: JobPosting) {
    e.stopPropagation();
    if (!confirm("이 JD를 삭제할까요? 연결된 Requirement/Competency/Role 태그도 함께 삭제됩니다.")) return;
    await jobPostingRepo.remove(jobPosting.id);
  }

  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 md:px-11">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-career-text-primary">JD Library</h1>
          <p className="font-body text-sm text-career-text-secondary">저장한 JD를 관리하고, JD Detail에서 Requirement를 정리하세요.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-[6px] bg-career-text-primary px-4 py-2.5 font-body text-[13px] font-bold text-white"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          JD 추가
        </button>
      </div>

      <CareerCard className="flex flex-col">
        {summaries.length === 0 ? (
          <p className="px-6 py-10 text-center font-body text-sm text-career-text-secondary">
            아직 저장한 JD가 없습니다. "JD 추가"로 첫 JD를 등록해보세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[200px_1fr_150px_150px_90px] gap-4 bg-career-table-header px-6 py-2.5">
                {["회사", "포지션", "Requirement", "상태", ""].map((h) => (
                  <span key={h} className="font-body text-[11px] tracking-wide text-career-text-secondary">
                    {h}
                  </span>
                ))}
              </div>
              {summaries.map(({ jobPosting, companyName, requirementCount, status }) => (
                <div
                  key={jobPosting.id}
                  onClick={() => navigate(`/career/jd-library/${jobPosting.id}`)}
                  className="grid cursor-pointer grid-cols-[200px_1fr_150px_150px_90px] items-center gap-4 border-b border-career-border px-6 py-3 last:border-b-0 hover:bg-career-bg"
                >
                  <span className="font-body text-[13px] font-bold text-career-text-primary">{companyName}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body text-[13px] font-bold text-career-text-primary">{jobPosting.positionTitle}</span>
                    <span className="font-body text-[11px] text-career-text-secondary">{jobPosting.postingTitle}</span>
                  </div>
                  <span className="font-body text-[13px] text-career-text-tertiary">{requirementCount}개</span>
                  <CareerPill tone={analysisStatusTone[status]} className="w-fit">
                    {analysisStatusLabel[status]}
                  </CareerPill>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing({ jobPosting, companyName, requirementCount, status });
                      }}
                      aria-label="JD 수정"
                    >
                      <EditIcon className="h-4 w-4 text-career-text-muted hover:text-career-blue" />
                    </button>
                    <button type="button" onClick={(e) => handleDelete(e, jobPosting)} aria-label="JD 삭제">
                      <TrashIcon className="h-4 w-4 text-career-text-muted hover:text-career-red" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CareerCard>

      {editing && (
        <JdForm
          initial={
            editing === "new"
              ? undefined
              : { ...editing.jobPosting, companyName: companyNameById.get(editing.jobPosting.companyId) ?? "" }
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
