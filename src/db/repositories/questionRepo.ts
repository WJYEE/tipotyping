import { db } from "@/db/db";
import { sessionRepo } from "@/db/repositories/sessionRepo";
import type { Question } from "@/types/domain";

export const questionRepo = {
  list(): Promise<Question[]> {
    return db.questions.toArray();
  },

  get(id: string): Promise<Question | undefined> {
    return db.questions.get(id);
  },

  listByTheme(themeId: string): Promise<Question[]> {
    return db.questions.where("themeId").equals(themeId).toArray();
  },

  listByTag(tagId: string): Promise<Question[]> {
    return db.questions.where("tagIds").equals(tagId).toArray();
  },

  /** Question 생성과 동시에 비어있는 QuestionRecord를 함께 만들어 1:1 관계를 항상 보장한다. */
  async create(data: Omit<Question, "id" | "createdAt" | "updatedAt">): Promise<Question> {
    const now = Date.now();
    const question = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now } as Question;

    await db.transaction("rw", db.questions, db.questionRecords, async () => {
      await db.questions.add(question);
      await db.questionRecords.add({
        questionId: question.id,
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        lastResult: null,
        lastAttemptAt: null,
      });
    });

    return question;
  },

  async update(
    id: string,
    patch: Partial<Omit<Question, "id" | "createdAt">>,
  ): Promise<void> {
    await db.questions.update(id, { ...patch, updatedAt: Date.now() });
  },

  /**
   * 12장: 문제 삭제 시 Question + QuestionRecord + 관련 Attempt를 모두 삭제하고,
   * 영향받은 Session들의 집계값을 재계산한다 (Session 자체는 유지).
   */
  async remove(id: string): Promise<void> {
    let affectedSessionIds: string[] = [];

    await db.transaction("rw", db.questions, db.questionRecords, db.attempts, async () => {
      const attempts = await db.attempts.where("questionId").equals(id).toArray();
      affectedSessionIds = [...new Set(attempts.map((a) => a.sessionId))];

      await db.attempts.where("questionId").equals(id).delete();
      await db.questionRecords.delete(id);
      await db.questions.delete(id);
    });

    for (const sessionId of affectedSessionIds) {
      await sessionRepo.recomputeStats(sessionId);
    }
  },
};
