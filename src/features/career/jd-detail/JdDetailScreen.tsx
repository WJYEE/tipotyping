import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { db } from "@/db/db";
import { companyRepo, competencyRepo, jobPostingRepo, requirementRepo, roleRepo } from "@/db/repositories";
import { CareerCard } from "@/features/career/components/CareerCard";
import { CareerPill } from "@/features/career/components/CareerPill";
import { CompetencyDetailModal } from "@/features/career/components/CompetencyDetailModal";
import { COMPETENCY_CATEGORIES, competencyCategoryLabel, competencyCategoryTone } from "@/features/career/competencyLabels";
import { requirementSourceSectionLabel } from "@/features/career/jobPostingLabels";
import type { Competency, CompetencyCategory, JobPosting, Requirement, RequirementSourceSection, Role } from "@/types/career";

const SECTIONS: RequirementSourceSection[] = ["responsibility", "qualification", "preferred"];

function sectionText(jobPosting: JobPosting, section: RequirementSourceSection): string {
  if (section === "responsibility") return jobPosting.responsibilities;
  if (section === "qualification") return jobPosting.qualifications;
  return jobPosting.preferredQualifications;
}

export function JdDetailScreen() {
  const { jobPostingId } = useParams<{ jobPostingId: string }>();
  const navigate = useNavigate();

  const jobPosting = useLiveQuery(
    () => (jobPostingId ? jobPostingRepo.get(jobPostingId) : undefined),
    [jobPostingId],
  );
  const company = useLiveQuery(
    () => (jobPosting ? companyRepo.get(jobPosting.companyId) : undefined),
    [jobPosting?.companyId],
  );
  const requirements =
    useLiveQuery(() => (jobPostingId ? requirementRepo.listByJobPosting(jobPostingId) : []), [jobPostingId]) ?? [];
  const competencies = useLiveQuery(() => competencyRepo.list(), []) ?? [];
  const roles = useLiveQuery(() => roleRepo.list(), []) ?? [];
  const competencyLinks = useLiveQuery(() => db.requirementCompetencies.toArray(), []) ?? [];
  const roleLinks = useLiveQuery(() => db.requirementRoles.toArray(), []) ?? [];

  const [newRequirementRawText, setNewRequirementRawText] = useState("");
  const [newRequirementSection, setNewRequirementSection] = useState<RequirementSourceSection>("qualification");
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(null);

  // useLiveQuery는 "아직 로딩 중"과 "조회 결과 없음(삭제된 JD 등)"을 둘 다 undefined로 돌려주므로
  // 구분하지 않고 한 화면으로 처리한다 — 어차피 로딩은 짧고, 없는 JD면 자연히 이 문구로 멈춘다.
  if (!jobPosting || !jobPostingId) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-10">
        <p className="font-body text-sm text-career-text-secondary">JD를 불러오는 중이거나 찾을 수 없습니다.</p>
      </div>
    );
  }

  const competencyById = new Map(competencies.map((c) => [c.id, c]));
  const roleById = new Map(roles.map((r) => [r.id, r]));

  async function handleAddRequirement() {
    if (!newRequirementRawText.trim() || !jobPostingId) return;
    await requirementRepo.create({
      jobPostingId,
      rawText: newRequirementRawText.trim(),
      sourceSection: newRequirementSection,
    });
    setNewRequirementRawText("");
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 md:px-11">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => navigate("/career/jd-library")}
          className="w-fit font-body text-xs text-career-text-secondary hover:text-career-text-primary"
        >
          ← JD Library
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-career-text-primary">{jobPosting.positionTitle}</h1>
          {jobPosting.jdUrl && (
            <a
              href={jobPosting.jdUrl}
              target="_blank"
              rel="noreferrer"
              className="font-body text-xs font-semibold text-career-blue"
            >
              원본 JD 보기 ↗
            </a>
          )}
        </div>
        <p className="font-body text-sm text-career-text-secondary">
          {company?.name ?? "알 수 없음"} · {jobPosting.postingTitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <CareerCard key={section} className="flex flex-col gap-2 p-5">
            <h2 className="font-body text-[13px] font-bold text-career-text-primary">{requirementSourceSectionLabel[section]}</h2>
            <p className="whitespace-pre-wrap font-body text-[13px] text-career-text-tertiary">
              {sectionText(jobPosting, section) || "입력된 내용이 없습니다."}
            </p>
          </CareerCard>
        ))}
      </div>

      <CareerCard className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-lg font-bold text-career-text-primary">Requirement</h2>

        <div className="flex flex-col gap-2 border-b border-career-border pb-4 sm:flex-row sm:items-center">
          <select
            value={newRequirementSection}
            onChange={(e) => setNewRequirementSection(e.target.value as RequirementSourceSection)}
            className="rounded-[6px] border border-career-border bg-career-surface px-2 py-2 font-body text-sm text-career-text-primary"
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {requirementSourceSectionLabel[s]}
              </option>
            ))}
          </select>
          <input
            value={newRequirementRawText}
            onChange={(e) => setNewRequirementRawText(e.target.value)}
            placeholder="예: SQL을 활용한 데이터 추출 및 분석 경험 (JD 원문 그대로)"
            className="flex-1 rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-sm text-career-text-primary outline-none focus:border-career-blue"
          />
          <button
            type="button"
            onClick={handleAddRequirement}
            className="flex items-center justify-center gap-1.5 rounded-[6px] bg-career-text-primary px-4 py-2 font-body text-[13px] font-bold text-white"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            추가
          </button>
        </div>

        {requirements.length === 0 ? (
          <p className="py-6 text-center font-body text-sm text-career-text-secondary">
            아직 등록한 Requirement가 없습니다.
          </p>
        ) : (
          SECTIONS.map((section) => {
            const rows = requirements.filter((r) => r.sourceSection === section);
            if (rows.length === 0) return null;
            return (
              <div key={section} className="flex flex-col gap-3">
                <span className="font-body text-xs font-semibold text-career-text-secondary">
                  {requirementSourceSectionLabel[section]}
                </span>
                {rows.map((r) => (
                  <RequirementRow
                    key={r.id}
                    requirement={r}
                    competencies={
                      competencyLinks
                        .filter((l) => l.requirementId === r.id)
                        .map((l) => competencyById.get(l.competencyId))
                        .filter((c): c is Competency => !!c)
                    }
                    roles={
                      roleLinks
                        .filter((l) => l.requirementId === r.id)
                        .map((l) => roleById.get(l.roleId))
                        .filter((r2): r2 is Role => !!r2)
                    }
                    onSelectCompetency={setSelectedCompetencyId}
                  />
                ))}
              </div>
            );
          })
        )}
      </CareerCard>

      {selectedCompetencyId && (
        <CompetencyDetailModal competencyId={selectedCompetencyId} onClose={() => setSelectedCompetencyId(null)} />
      )}
    </div>
  );
}

interface RequirementRowProps {
  requirement: Requirement;
  competencies: Competency[];
  roles: Role[];
  onSelectCompetency: (competencyId: string) => void;
}

function RequirementRow({ requirement, competencies, roles, onSelectCompetency }: RequirementRowProps) {
  const [competencyCategory, setCompetencyCategory] = useState<CompetencyCategory>("data");
  const [competencyName, setCompetencyName] = useState("");
  const [roleName, setRoleName] = useState("");

  async function handleDeleteRequirement() {
    if (!confirm("이 Requirement를 삭제할까요?")) return;
    await requirementRepo.remove(requirement.id);
  }

  async function handleAddCompetency() {
    if (!competencyName.trim()) return;
    const competency = await competencyRepo.getOrCreate(competencyName.trim(), competencyCategory);
    await requirementRepo.linkCompetency(requirement.id, competency.id);
    setCompetencyName("");
  }

  async function handleAddRole() {
    if (!roleName.trim()) return;
    const role = await roleRepo.getOrCreate(roleName.trim());
    await requirementRepo.linkRole(requirement.id, role.id);
    setRoleName("");
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[6px] border border-career-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 font-body text-sm text-career-text-primary">{requirement.rawText}</p>
        <button type="button" onClick={handleDeleteRequirement} aria-label="Requirement 삭제">
          <TrashIcon className="h-4 w-4 text-career-text-muted hover:text-career-red" />
        </button>
      </div>

      {(competencies.length > 0 || roles.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {competencies.map((c) => (
            <CareerPill key={c.id} tone={competencyCategoryTone[c.category]} className="gap-1">
              <button type="button" onClick={() => onSelectCompetency(c.id)} className="hover:underline">
                {c.name}
              </button>
              <button
                type="button"
                onClick={() => requirementRepo.unlinkCompetency(requirement.id, c.id)}
                aria-label={`${c.name} 제거`}
              >
                <XIcon className="h-2.5 w-2.5" />
              </button>
            </CareerPill>
          ))}
          {roles.map((r) => (
            <CareerPill key={r.id} tone="neutral" className="gap-1">
              {r.name}
              <button
                type="button"
                onClick={() => requirementRepo.unlinkRole(requirement.id, r.id)}
                aria-label={`${r.name} 제거`}
              >
                <XIcon className="h-2.5 w-2.5" />
              </button>
            </CareerPill>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={competencyCategory}
          onChange={(e) => setCompetencyCategory(e.target.value as CompetencyCategory)}
          className="rounded-[6px] border border-career-border bg-career-surface px-2 py-1 font-body text-xs text-career-text-primary"
        >
          {COMPETENCY_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {competencyCategoryLabel[cat]}
            </option>
          ))}
        </select>
        <input
          value={competencyName}
          onChange={(e) => setCompetencyName(e.target.value)}
          placeholder="Competency 추가"
          className="w-32 rounded-[6px] border border-career-border bg-career-surface px-2 py-1 font-body text-xs text-career-text-primary outline-none focus:border-career-blue"
        />
        <button type="button" onClick={handleAddCompetency} className="font-body text-xs font-semibold text-career-blue">
          + Competency
        </button>

        <input
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="Role 추가"
          className="w-32 rounded-[6px] border border-career-border bg-career-surface px-2 py-1 font-body text-xs text-career-text-primary outline-none focus:border-career-blue"
        />
        <button type="button" onClick={handleAddRole} className="font-body text-xs font-semibold text-career-purple">
          + Role
        </button>
      </div>
    </div>
  );
}
