import { db } from "@/db/db";
import { themeRepo } from "@/db/repositories/themeRepo";
import type { Session } from "@/types/domain";

// Home Dashboard(11장)에서 필요한 누적/최근/테마별 집계만 제공한다.
// 개별 문제 통계는 메인 Dashboard에서 다루지 않는다.

export interface OverallStats {
  totalDurationMs: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
}

export interface RecentSessionSummary {
  id: string;
  startedAt: number;
  themeNames: string[];
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
}

export interface ThemeStatRow {
  themeId: string;
  themeName: string;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  todayAttempts: number;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const statsRepo = {
  /** 누적 학습시간/시도/정답/오답/정확도 (Session 전체 합산) */
  async getOverallStats(): Promise<OverallStats> {
    const sessions = await db.sessions.toArray();
    const totalDurationMs = sessions.reduce((sum, s) => sum + s.totalDurationMs, 0);
    const totalAttempts = sessions.reduce((sum, s) => sum + s.totalAttempts, 0);
    const correctCount = sessions.reduce((sum, s) => sum + s.correctCount, 0);
    const wrongCount = sessions.reduce((sum, s) => sum + s.wrongCount, 0);
    const accuracy = totalAttempts === 0 ? 0 : correctCount / totalAttempts;
    return { totalDurationMs, totalAttempts, correctCount, wrongCount, accuracy };
  },

  /** 최근 Session N개 (테마명 포함) */
  async getRecentSessions(limit = 5): Promise<RecentSessionSummary[]> {
    const sessions: Session[] = await db.sessions
      .orderBy("startedAt")
      .reverse()
      .limit(limit)
      .toArray();
    if (sessions.length === 0) return [];

    const themes = await themeRepo.list();
    const themeNameById = new Map(themes.map((t) => [t.id, t.name]));

    return sessions.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      themeNames: s.themeIds.map((id) => themeNameById.get(id) ?? "삭제된 테마"),
      totalAttempts: s.totalAttempts,
      correctCount: s.correctCount,
      accuracy: s.accuracy,
    }));
  },

  /**
   * 테마별 현황: Attempt를 Question.themeId 기준으로 집계한다.
   * 개인용 데이터 규모를 가정해 in-memory join으로 처리(별도 비정규화 없이).
   * "정확도"는 완료율/진행률이 아니므로 ProgressBar 없이 텍스트로만 노출한다.
   */
  async getThemeStats(limit = 5): Promise<ThemeStatRow[]> {
    const [attempts, questions, themes] = await Promise.all([
      db.attempts.toArray(),
      db.questions.toArray(),
      themeRepo.list(),
    ]);
    if (attempts.length === 0) return [];

    const themeIdByQuestionId = new Map(questions.map((q) => [q.id, q.themeId]));
    const themeNameById = new Map(themes.map((t) => [t.id, t.name]));
    const todayStart = startOfToday();

    const byTheme = new Map<
      string,
      { totalAttempts: number; correctCount: number; todayAttempts: number }
    >();

    for (const attempt of attempts) {
      const themeId = themeIdByQuestionId.get(attempt.questionId);
      if (!themeId) continue; // 문제가 삭제된 Attempt는 테마별 현황에서 제외

      const row = byTheme.get(themeId) ?? { totalAttempts: 0, correctCount: 0, todayAttempts: 0 };
      row.totalAttempts += 1;
      if (attempt.isCorrect) row.correctCount += 1;
      if (attempt.attemptedAt >= todayStart) row.todayAttempts += 1;
      byTheme.set(themeId, row);
    }

    return [...byTheme.entries()]
      .map(([themeId, row]) => ({
        themeId,
        themeName: themeNameById.get(themeId) ?? "삭제된 테마",
        totalAttempts: row.totalAttempts,
        correctCount: row.correctCount,
        accuracy: row.totalAttempts === 0 ? 0 : row.correctCount / row.totalAttempts,
        todayAttempts: row.todayAttempts,
      }))
      .sort((a, b) => b.totalAttempts - a.totalAttempts)
      .slice(0, limit);
  },
};
