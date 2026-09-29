import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { attemptRepo, categoryRepo, questionRepo, sessionRepo, statsRepo, themeRepo } from "@/db/repositories";

async function clearAllTables() {
  await db.transaction(
    "rw",
    [db.categories, db.themes, db.tags, db.questions, db.questionRecords, db.sessions, db.attempts, db.settings],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.themes.clear(),
        db.tags.clear(),
        db.questions.clear(),
        db.questionRecords.clear(),
        db.sessions.clear(),
        db.attempts.clear(),
        db.settings.clear(),
      ]);
    },
  );
}

beforeEach(async () => {
  await clearAllTables();
});

describe("statsRepo", () => {
  it("데이터가 없으면 0/빈 배열을 반환한다", async () => {
    const overall = await statsRepo.getOverallStats();
    expect(overall).toEqual({ totalDurationMs: 0, totalAttempts: 0, correctCount: 0, wrongCount: 0, accuracy: 0 });
    expect(await statsRepo.getRecentSessions()).toEqual([]);
    expect(await statsRepo.getThemeStats()).toEqual([]);
  });

  it("Session/Attempt를 반영해 누적/최근/테마별 통계를 계산한다", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: false });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: true,
    });
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1+1=?", answer: "2" },
    });

    const session = await sessionRepo.create({
      startedAt: Date.now(),
      endedAt: Date.now(),
      totalDurationMs: 60_000,
      themeIds: [theme.id],
      tagIds: [],
      questionTypes: ["answer-input"],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
    });

    await attemptRepo.record({
      sessionId: session.id,
      questionId: question.id,
      questionType: "answer-input",
      isCorrect: true,
      userAnswer: "2",
      attemptedAt: Date.now(),
    });
    await attemptRepo.record({
      sessionId: session.id,
      questionId: question.id,
      questionType: "answer-input",
      isCorrect: false,
      userAnswer: "3",
      attemptedAt: Date.now(),
    });

    const overall = await statsRepo.getOverallStats();
    expect(overall.totalDurationMs).toBe(60_000);
    expect(overall.totalAttempts).toBe(2);
    expect(overall.correctCount).toBe(1);
    expect(overall.accuracy).toBeCloseTo(0.5);

    const recent = await statsRepo.getRecentSessions();
    expect(recent).toHaveLength(1);
    expect(recent[0].themeNames).toEqual(["SQL"]);
    expect(recent[0].totalAttempts).toBe(2);

    const themeStats = await statsRepo.getThemeStats();
    expect(themeStats).toHaveLength(1);
    expect(themeStats[0].themeName).toBe("SQL");
    expect(themeStats[0].totalAttempts).toBe(2);
    expect(themeStats[0].correctCount).toBe(1);
    expect(themeStats[0].todayAttempts).toBe(2);
  });
});
