import { db } from "@/db/db";
import type { Theme } from "@/types/domain";

export const themeRepo = {
  list(): Promise<Theme[]> {
    return db.themes.orderBy("order").toArray();
  },

  listByCategory(categoryId: string): Promise<Theme[]> {
    return db.themes.where("categoryId").equals(categoryId).sortBy("order");
  },

  get(id: string): Promise<Theme | undefined> {
    return db.themes.get(id);
  },

  async create(data: Omit<Theme, "id">): Promise<Theme> {
    const theme: Theme = { id: crypto.randomUUID(), ...data };
    await db.themes.add(theme);
    return theme;
  },

  async update(id: string, patch: Partial<Omit<Theme, "id">>): Promise<void> {
    await db.themes.update(id, patch);
  },

  /**
   * Theme에 속한 Question이 있으면 삭제하지 않는다.
   * (Question 삭제는 questionRepo.remove를 통해 명시적으로 처리)
   */
  async remove(id: string): Promise<void> {
    const questionCount = await db.questions.where("themeId").equals(id).count();
    if (questionCount > 0) {
      throw new Error("문제가 남아있는 Theme은 삭제할 수 없습니다.");
    }
    await db.themes.delete(id);
  },
};
