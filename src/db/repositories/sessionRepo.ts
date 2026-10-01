import { db } from "@/db/db";
import type { Session } from "@/types/domain";

/** 5장: "10초 이상 학습한 Session만 기록". */
export const MIN_SESSION_MS = 10_000;

/**
 * Session을 정식 기록으로 남길지 판단한다. 두 조건을 모두(AND) 만족해야 한다:
 * - 10초 이상 학습 (기존 정책)
 * - 실제 제출한 Attempt가 1개 이상 (한 문제도 풀지 않고 종료한 빈 Session은 기록하지 않음)
 */
export function sessionQualifies(totalAttempts: number, elapsedMs: number): boolean {
  return totalAttempts > 0 && elapsedMs >= MIN_SESSION_MS;
}

export const sessionRepo = {
  list(): Promise<Session[]> {
    return db.sessions.orderBy("startedAt").reverse().toArray();
  },

  get(id: string): Promise<Session | undefined> {
    return db.sessions.get(id);
  },

  async create(data: Omit<Session, "id">): Promise<Session> {
    const session: Session = { id: crypto.randomUUID(), ...data };
    await db.sessions.add(session);
    return session;
  },

  async update(id: string, patch: Partial<Omit<Session, "id">>): Promise<void> {
    await db.sessions.update(id, patch);
  },

  /**
   * 해당 Session에 남아있는 Attempt들을 기준으로 통계를 다시 계산한다.
   * 문제 삭제로 Attempt가 사라졌을 때(12장) Session 통계 일관성을 유지하기 위해 사용.
   */
  async recomputeStats(sessionId: string): Promise<void> {
    const attempts = await db.attempts.where("sessionId").equals(sessionId).toArray();
    const totalAttempts = attempts.length;
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const wrongCount = totalAttempts - correctCount;
    const accuracy = totalAttempts === 0 ? 0 : correctCount / totalAttempts;
    await db.sessions.update(sessionId, { totalAttempts, correctCount, wrongCount, accuracy });
  },

  /** sessionQualifies 기준 미달(10초 미만 또는 Attempt 0개) 시 Session과 그 Attempt를 함께 버린다. */
  async discard(sessionId: string): Promise<void> {
    await db.transaction("rw", db.sessions, db.attempts, async () => {
      await db.attempts.where("sessionId").equals(sessionId).delete();
      await db.sessions.delete(sessionId);
    });
  },
};
