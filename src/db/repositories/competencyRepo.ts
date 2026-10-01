import { db } from "@/db/db";
import type { Competency, CompetencyCategory } from "@/types/career";

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

  /** 동일 이름 Competency가 있으면 재사용하고, 없으면 새로 만든다 (tagRepo.getOrCreate와 동일 패턴). */
  async getOrCreate(name: string, category: CompetencyCategory): Promise<Competency> {
    const existing = await competencyRepo.findByName(name);
    if (existing) return existing;
    const competency: Competency = { id: crypto.randomUUID(), name, category, createdAt: Date.now() };
    await db.competencies.add(competency);
    return competency;
  },
};
