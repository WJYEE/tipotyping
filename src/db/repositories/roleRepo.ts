import { db } from "@/db/db";
import type { Role } from "@/types/career";

export const roleRepo = {
  list(): Promise<Role[]> {
    return db.roles.toArray();
  },

  get(id: string): Promise<Role | undefined> {
    return db.roles.get(id);
  },

  findByName(name: string): Promise<Role | undefined> {
    return db.roles.where("name").equals(name).first();
  },

  /** 동일 이름 Role이 있으면 재사용하고, 없으면 새로 만든다 (tagRepo.getOrCreate와 동일 패턴). */
  async getOrCreate(name: string): Promise<Role> {
    const existing = await roleRepo.findByName(name);
    if (existing) return existing;
    const role: Role = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    await db.roles.add(role);
    return role;
  },
};
