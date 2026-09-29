import { db } from "@/db/db";
import type { BlankAttemptResult, QuestionRecord } from "@/types/domain";

function emptyRecord(questionId: string): QuestionRecord {
  return {
    questionId,
    totalAttempts: 0,
    correctCount: 0,
    wrongCount: 0,
    lastResult: null,
    lastAttemptAt: null,
  };
}

export const questionRecordRepo = {
  get(questionId: string): Promise<QuestionRecord | undefined> {
    return db.questionRecords.get(questionId);
  },

  /** 출제 알고리즘의 "새 문제 우선/오답 우선" 정렬에 사용 */
  list(): Promise<QuestionRecord[]> {
    return db.questionRecords.toArray();
  },

  async ensure(questionId: string): Promise<QuestionRecord> {
    const existing = await db.questionRecords.get(questionId);
    if (existing) return existing;
    const record = emptyRecord(questionId);
    await db.questionRecords.add(record);
    return record;
  },

  /** 문제 수정 시 "학습기록 초기화"를 선택했을 때 사용 (12장) */
  async reset(questionId: string): Promise<void> {
    await db.questionRecords.put(emptyRecord(questionId));
  },

  /** Attempt 저장과 같은 트랜잭션 안에서 호출되어 누적 통계를 갱신한다. */
  async applyAttempt(
    questionId: string,
    isCorrect: boolean,
    attemptedAt: number,
    blankResults?: BlankAttemptResult[],
  ): Promise<void> {
    const current = (await db.questionRecords.get(questionId)) ?? emptyRecord(questionId);

    const blankStats = current.blankStats ? [...current.blankStats] : [];
    if (blankResults) {
      for (const { blankId, isCorrect: blankCorrect } of blankResults) {
        const stat = blankStats.find((s) => s.blankId === blankId);
        if (stat) {
          stat.totalAttempts += 1;
          if (blankCorrect) stat.correctCount += 1;
        } else {
          blankStats.push({ blankId, totalAttempts: 1, correctCount: blankCorrect ? 1 : 0 });
        }
      }
    }

    const updated: QuestionRecord = {
      questionId,
      totalAttempts: current.totalAttempts + 1,
      correctCount: current.correctCount + (isCorrect ? 1 : 0),
      wrongCount: current.wrongCount + (isCorrect ? 0 : 1),
      lastResult: isCorrect ? "correct" : "wrong",
      lastAttemptAt: attemptedAt,
      ...(blankStats.length > 0 ? { blankStats } : {}),
    };

    await db.questionRecords.put(updated);
  },
};
