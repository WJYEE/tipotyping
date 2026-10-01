import { db } from "@/db/db";
import type { Competency, Requirement, Role } from "@/types/career";

export const requirementRepo = {
  listByJobPosting(jobPostingId: string): Promise<Requirement[]> {
    return db.requirements.where("jobPostingId").equals(jobPostingId).sortBy("createdAt");
  },

  get(id: string): Promise<Requirement | undefined> {
    return db.requirements.get(id);
  },

  async create(data: Omit<Requirement, "id" | "createdAt">): Promise<Requirement> {
    const requirement: Requirement = { id: crypto.randomUUID(), ...data, createdAt: Date.now() };
    await db.requirements.add(requirement);
    return requirement;
  },

  async update(id: string, patch: Partial<Omit<Requirement, "id" | "jobPostingId" | "createdAt">>): Promise<void> {
    await db.requirements.update(id, patch);
  },

  /** Requirement 삭제 시 연결된 RequirementCompetency/RequirementRole도 함께 지운다. */
  async remove(id: string): Promise<void> {
    await db.transaction("rw", db.requirements, db.requirementCompetencies, db.requirementRoles, async () => {
      await db.requirementCompetencies.where("requirementId").equals(id).delete();
      await db.requirementRoles.where("requirementId").equals(id).delete();
      await db.requirements.delete(id);
    });
  },

  async listCompetencies(requirementId: string): Promise<Competency[]> {
    const links = await db.requirementCompetencies.where("requirementId").equals(requirementId).toArray();
    const competencies = await db.competencies.bulkGet(links.map((l) => l.competencyId));
    return competencies.filter((c): c is Competency => !!c);
  },

  async listRoles(requirementId: string): Promise<Role[]> {
    const links = await db.requirementRoles.where("requirementId").equals(requirementId).toArray();
    const roles = await db.roles.bulkGet(links.map((l) => l.roleId));
    return roles.filter((r): r is Role => !!r);
  },

  /** 이미 연결돼 있으면 아무것도 하지 않는다 (중복 방지). */
  async linkCompetency(requirementId: string, competencyId: string): Promise<void> {
    const existing = await db.requirementCompetencies
      .where("requirementId")
      .equals(requirementId)
      .and((l) => l.competencyId === competencyId)
      .first();
    if (existing) return;
    await db.requirementCompetencies.add({ id: crypto.randomUUID(), requirementId, competencyId });
  },

  async unlinkCompetency(requirementId: string, competencyId: string): Promise<void> {
    await db.requirementCompetencies
      .where("requirementId")
      .equals(requirementId)
      .and((l) => l.competencyId === competencyId)
      .delete();
  },

  /** 이미 연결돼 있으면 아무것도 하지 않는다 (중복 방지). */
  async linkRole(requirementId: string, roleId: string): Promise<void> {
    const existing = await db.requirementRoles
      .where("requirementId")
      .equals(requirementId)
      .and((l) => l.roleId === roleId)
      .first();
    if (existing) return;
    await db.requirementRoles.add({ id: crypto.randomUUID(), requirementId, roleId });
  },

  async unlinkRole(requirementId: string, roleId: string): Promise<void> {
    await db.requirementRoles
      .where("requirementId")
      .equals(requirementId)
      .and((l) => l.roleId === roleId)
      .delete();
  },
};
