// Career Dashboard용 집계. statsRepo.ts(Learning)와 같은 자리에서, 같은 "개인 규모 가정 +
// in-memory join" 방식을 쓴다. 숫자는 전부 실제 테이블에서 계산하고, 아직 계산할 수 없는 값은
// 0 그대로 보여주거나(Evidence) 해당 섹션을 빈 상태로 둔다(Preparation Gap) — 임의로 만들지 않는다.
import { companyRepo } from "@/db/repositories/companyRepo";
import { db } from "@/db/db";
import {
  countCompetencyDemand,
  countRoleMix,
  deriveJobPostingStatus,
  type JobPostingStatus,
} from "@/lib/careerAggregation";
import type { Competency, JobPosting, Role } from "@/types/career";

export interface CareerOverviewStats {
  savedJdCount: number;
  /** 연결된 Competency 종류 수. Competency가 생성만 되고 아직 어떤 Requirement에도 안 묶였으면 세지 않는다. */
  extractedCompetencyCount: number;
  /** Evidence 테이블이 아직 없어 항상 0이다 — 숨기지 않고 실제 현재값(0)을 그대로 보여준다. */
  connectedEvidenceCount: number;
  /** Evidence가 없어 Gap을 계산할 수 없으므로 항상 0이다. Preparation Gap 섹션 자체는 별도로 빈 상태 처리한다. */
  preparationGapCount: number;
  lastUpdatedAt: number | null;
}

export interface CompetencyBubbleStat {
  competency: Competency;
  demandCount: number;
  totalJd: number;
}

export interface RoleMixStat {
  role: Role;
  count: number;
  percent: number;
}

export interface JobPostingSummary {
  jobPosting: JobPosting;
  companyName: string;
  requirementCount: number;
  status: JobPostingStatus;
}

async function competencyIdToJobPostingLinks() {
  const [requirements, links] = await Promise.all([
    db.requirements.toArray(),
    db.requirementCompetencies.toArray(),
  ]);
  const jobPostingIdByRequirement = new Map(requirements.map((r) => [r.id, r.jobPostingId]));
  return links
    .map((l) => ({ competencyId: l.competencyId, jobPostingId: jobPostingIdByRequirement.get(l.requirementId) }))
    .filter((l): l is { competencyId: string; jobPostingId: string } => !!l.jobPostingId);
}

export const careerStatsRepo = {
  async getOverviewStats(): Promise<CareerOverviewStats> {
    const [jobPostings, links] = await Promise.all([db.jobPostings.toArray(), competencyIdToJobPostingLinks()]);
    const demand = countCompetencyDemand(links);
    const lastUpdatedAt = jobPostings.length === 0 ? null : Math.max(...jobPostings.map((jp) => jp.updatedAt));
    return {
      savedJdCount: jobPostings.length,
      extractedCompetencyCount: demand.size,
      connectedEvidenceCount: 0,
      preparationGapCount: 0,
      lastUpdatedAt,
    };
  },

  async getCompetencyBubbleStats(): Promise<CompetencyBubbleStat[]> {
    const [competencies, jobPostings, links] = await Promise.all([
      db.competencies.toArray(),
      db.jobPostings.toArray(),
      competencyIdToJobPostingLinks(),
    ]);
    const demand = countCompetencyDemand(links);
    const totalJd = jobPostings.length;
    return competencies
      .filter((c) => demand.has(c.id))
      .map((c) => ({ competency: c, demandCount: demand.get(c.id) ?? 0, totalJd }))
      .sort((a, b) => b.demandCount - a.demandCount);
  },

  async getRoleMixStats(): Promise<RoleMixStat[]> {
    const [roles, roleLinks] = await Promise.all([db.roles.toArray(), db.requirementRoles.toArray()]);
    const mix = countRoleMix(roleLinks.map((l) => l.roleId));
    const roleById = new Map(roles.map((r) => [r.id, r]));
    return mix
      .map((m) => {
        const role = roleById.get(m.roleId);
        return role ? { role, count: m.count, percent: m.percent } : null;
      })
      .filter((m): m is RoleMixStat => !!m);
  },

  async getRecentJobPostings(limit = 5): Promise<JobPostingSummary[]> {
    const jobPostings = await db.jobPostings.orderBy("createdAt").reverse().limit(limit).toArray();
    return summarizeJobPostings(jobPostings);
  },
};

/** JobPosting 목록에 회사명/Requirement 개수/상태를 붙인다. jobPostingRepo·JdLibraryScreen에서도 쓴다. */
export async function summarizeJobPostings(jobPostings: JobPosting[]): Promise<JobPostingSummary[]> {
  if (jobPostings.length === 0) return [];
  const jobPostingIds = jobPostings.map((jp) => jp.id);
  const [companies, requirements] = await Promise.all([companyRepo.list(), db.requirements.where("jobPostingId").anyOf(jobPostingIds).toArray()]);
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  const requirementsByJobPosting = new Map<string, string[]>();
  for (const r of requirements) {
    const list = requirementsByJobPosting.get(r.jobPostingId) ?? [];
    list.push(r.id);
    requirementsByJobPosting.set(r.jobPostingId, list);
  }

  const requirementIds = requirements.map((r) => r.id);
  const [competencyLinks, roleLinks] = await Promise.all([
    db.requirementCompetencies.where("requirementId").anyOf(requirementIds).toArray(),
    db.requirementRoles.where("requirementId").anyOf(requirementIds).toArray(),
  ]);
  const taggedWithCompetency = new Set(competencyLinks.map((l) => l.requirementId));
  const taggedWithRole = new Set(roleLinks.map((l) => l.requirementId));

  return jobPostings.map((jobPosting) => {
    const reqIds = requirementsByJobPosting.get(jobPosting.id) ?? [];
    const fullyTaggedCount = reqIds.filter((id) => taggedWithCompetency.has(id) && taggedWithRole.has(id)).length;
    return {
      jobPosting,
      companyName: companyNameById.get(jobPosting.companyId) ?? "알 수 없음",
      requirementCount: reqIds.length,
      status: deriveJobPostingStatus(reqIds.length, fullyTaggedCount),
    };
  });
}
