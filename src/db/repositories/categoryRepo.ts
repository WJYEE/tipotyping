import { db } from "@/db/db";
import type { Category } from "@/types/domain";

export const categoryRepo = {
  list(): Promise<Category[]> {
    return db.categories.orderBy("order").toArray();
  },

  get(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async create(data: Omit<Category, "id">): Promise<Category> {
    const category: Category = { id: crypto.randomUUID(), ...data };
    await db.categories.add(category);
    return category;
  },

  async update(id: string, patch: Partial<Omit<Category, "id">>): Promise<void> {
    await db.categories.update(id, patch);
  },

  /** Theme이 남아있는 Category는 삭제하지 않는다 (고아 Theme 방지). */
  async remove(id: string): Promise<void> {
    const themeCount = await db.themes.where("categoryId").equals(id).count();
    if (themeCount > 0) {
      throw new Error("하위 Theme이 존재하는 Category는 삭제할 수 없습니다.");
    }
    await db.categories.delete(id);
  },
};
