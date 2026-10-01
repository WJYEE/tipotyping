import { db } from "@/db/db";
import type { JobPosting } from "@/types/career";

export const jobPostingRepo = {
  list(): Promise<JobPosting[]> {
    return db.jobPostings.orderBy("createdAt").reverse().toArray();
  },

  get(id: string): Promise<JobPosting | undefined> {
    return db.jobPostings.get(id);
  },

  async create(data: Omit<JobPosting, "id" | "createdAt" | "updatedAt">): Promise<JobPosting> {
    const now = Date.now();
    const jobPosting: JobPosting = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    await db.jobPostings.add(jobPosting);
    return jobPosting;
  },

  async update(id: string, patch: Partial<Omit<JobPosting, "id" | "createdAt">>): Promise<void> {
    await db.jobPostings.update(id, { ...patch, updatedAt: Date.now() });
  },

  /**
   * JobPosting 삭제 시 그 Requirement들과, 각 Requirement에 연결된 RequirementCompetency/
   * RequirementRole도 함께 지운다. Company/Competency/Role 자체는(다른 JD에서도 재사용되는
   * 공용 데이터이므로) 지우지 않는다 — questionRepo.remove가 Question만 지우고 Tag는 남기는 것과 같다.
   */
  async remove(id: string): Promise<void> {
    await db.transaction(
      "rw",
      [db.jobPostings, db.requirements, db.requirementCompetencies, db.requirementRoles],
      async () => {
        const requirementIds = (await db.requirements.where("jobPostingId").equals(id).toArray()).map(
          (r) => r.id,
        );
        await db.requirementCompetencies.where("requirementId").anyOf(requirementIds).delete();
        await db.requirementRoles.where("requirementId").anyOf(requirementIds).delete();
        await db.requirements.where("jobPostingId").equals(id).delete();
        await db.jobPostings.delete(id);
      },
    );
  },
};
