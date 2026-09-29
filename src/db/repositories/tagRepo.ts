import { db } from "@/db/db";
import type { Tag } from "@/types/domain";

export const tagRepo = {
  list(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  get(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  findByName(name: string): Promise<Tag | undefined> {
    return db.tags.where("name").equals(name).first();
  },

  /** 동일 이름 Tag가 있으면 재사용하고, 없으면 새로 만든다. */
  async getOrCreate(name: string): Promise<Tag> {
    const existing = await tagRepo.findByName(name);
    if (existing) return existing;
    const tag: Tag = { id: crypto.randomUUID(), name };
    await db.tags.add(tag);
    return tag;
  },

  async create(data: Omit<Tag, "id">): Promise<Tag> {
    const tag: Tag = { id: crypto.randomUUID(), ...data };
    await db.tags.add(tag);
    return tag;
  },

  async rename(id: string, name: string): Promise<void> {
    await db.tags.update(id, { name });
  },

  /** 이 Tag를 참조하는 모든 Question에서 tagIds를 정리한 뒤 Tag를 삭제한다. */
  async remove(id: string): Promise<void> {
    await db.transaction("rw", db.tags, db.questions, async () => {
      const questions = await db.questions.where("tagIds").equals(id).toArray();
      await Promise.all(
        questions.map((q) =>
          db.questions.update(q.id, { tagIds: q.tagIds.filter((t) => t !== id) }),
        ),
      );
      await db.tags.delete(id);
    });
  },
};
