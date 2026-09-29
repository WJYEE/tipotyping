import { db } from "@/db/db";
import { questionRecordRepo } from "@/db/repositories/questionRecordRepo";
import type { Attempt } from "@/types/domain";

export const attemptRepo = {
  listBySession(sessionId: string): Promise<Attempt[]> {
    return db.attempts.where("sessionId").equals(sessionId).sortBy("attemptedAt");
  },

  listByQuestion(questionId: string): Promise<Attempt[]> {
    return db.attempts.where("questionId").equals(questionId).sortBy("attemptedAt");
  },

  /**
   * Attempt 기록 + Session 누적치 갱신 + QuestionRecord 누적치 갱신을 한 트랜잭션으로 처리한다.
   * (9장: Session 성적과 Question별 학습기록은 분리 저장되지만 항상 함께 갱신되어야 함)
   */
  async record(data: Omit<Attempt, "id">): Promise<Attempt> {
    const attempt: Attempt = { id: crypto.randomUUID(), ...data };

    await db.transaction("rw", db.attempts, db.sessions, db.questionRecords, async () => {
      await db.attempts.add(attempt);

      const session = await db.sessions.get(attempt.sessionId);
      if (session) {
        await db.sessions.update(attempt.sessionId, {
          totalAttempts: session.totalAttempts + 1,
          correctCount: session.correctCount + (attempt.isCorrect ? 1 : 0),
          wrongCount: session.wrongCount + (attempt.isCorrect ? 0 : 1),
          accuracy:
            (session.correctCount + (attempt.isCorrect ? 1 : 0)) / (session.totalAttempts + 1),
        });
      }

      await questionRecordRepo.applyAttempt(
        attempt.questionId,
        attempt.isCorrect,
        attempt.attemptedAt,
        attempt.blankResults,
      );
    });

    return attempt;
  },
};
