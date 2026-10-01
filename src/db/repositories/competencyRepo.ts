import { db } from "@/db/db";
import type { Competency, CompetencyCategory, JobPosting, Requirement } from "@/types/career";

export interface CompetencyDemandTraceItem {
  requirement: Requirement;
  jobPosting: JobPosting;
  companyName: string;
}

export const competencyRepo = {
  list(): Promise<Competency[]> {
    return db.competencies.toArray();
  },

  get(id: string): Promise<Competency | undefined> {
    return db.competencies.get(id);
  },

  findByName(name: string): Promise<Competency | undefined> {
    return db.competencies.where("name").equals(name).first();
  },

  /**
   * 동일 이름 Competency가 있으면 재사용하고, 없으면 새로 만든다 (tagRepo.getOrCreate와 동일 패턴).
   * JD마다 새로 만들지 않고 재사용해야 여러 JD를 하나의 표준 Competency로 통합 집계할 수 있다.
   * 이미 있는 Competency를 재사용할 때는 learningThemeKey를 덮어쓰지 않는다 — 필요하면 update로 따로 바꾼다.
   */
  async getOrCreate(name: string, category: CompetencyCategory, learningThemeKey?: string): Promise<Competency> {
    const existing = await competencyRepo.findByName(name);
    if (existing) return existing;
    const competency: Competency = {
      id: crypto.randomUUID(),
      name,
      category,
      learningThemeKey,
      createdAt: Date.now(),
    };
    await db.competencies.add(competency);
    return competency;
  },

  async update(id: string, patch: Partial<Omit<Competency, "id" | "createdAt">>): Promise<void> {
    await db.competencies.update(id, patch);
  },

  /**
   * Competency → 그것을 요구한 Requirement → 그 Requirement가 속한 JobPosting/회사까지 역추적한다.
   * JD 원문(rawText)까지 그대로 들고 있으므로 "이 역량을 어떤 JD의 어떤 문장에서 요구했는지" 바로 확인할 수 있다.
   */
  async getDemandTrace(competencyId: string): Promise<CompetencyDemandTraceItem[]> {
    const links = await db.requirementCompetencies.where("competencyId").equals(competencyId).toArray();
    if (links.length === 0) return [];

    const requirements = (await db.requirements.bulkGet(links.map((l) => l.requirementId))).filter(
      (r): r is Requirement => !!r,
    );
    const jobPostingIds = [...new Set(requirements.map((r) => r.jobPostingId))];
    const jobPostingById = new Map(
      (await db.jobPostings.bulkGet(jobPostingIds)).filter((jp): jp is JobPosting => !!jp).map((jp) => [jp.id, jp]),
    );
    const companies = await db.companies.toArray();
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

    return requirements
      .map((requirement) => {
        const jobPosting = jobPostingById.get(requirement.jobPostingId);
        if (!jobPosting) return null;
        return { requirement, jobPosting, companyName: companyNameById.get(jobPosting.companyId) ?? "알 수 없음" };
      })
      .filter((item): item is CompetencyDemandTraceItem => !!item)
      .sort((a, b) => b.jobPosting.createdAt - a.jobPosting.createdAt);
  },
};
