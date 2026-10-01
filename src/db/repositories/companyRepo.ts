import { db } from "@/db/db";
import type { Company } from "@/types/career";

export const companyRepo = {
  list(): Promise<Company[]> {
    return db.companies.toArray();
  },

  get(id: string): Promise<Company | undefined> {
    return db.companies.get(id);
  },

  findByName(name: string): Promise<Company | undefined> {
    return db.companies.where("name").equals(name).first();
  },

  /** 동일 이름 Company가 있으면 재사용하고, 없으면 새로 만든다 (tagRepo.getOrCreate와 동일 패턴). */
  async getOrCreate(name: string): Promise<Company> {
    const existing = await companyRepo.findByName(name);
    if (existing) return existing;
    const company: Company = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    await db.companies.add(company);
    return company;
  },
};
