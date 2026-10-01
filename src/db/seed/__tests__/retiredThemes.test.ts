// 기본 제공 목록에서 폐기된 Theme(면접·직무지식)을 기존 사용자 DB에서 정리하는 동기화 시나리오 테스트.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { syncDefaultContent } from "@/db/seed/seed";
import type { Attempt, Question, Session } from "@/types/domain";

beforeEach(async () => {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
});

function question(id: string, themeId: string, categoryId: string, extra: Partial<Question> = {}): Question {
  return {
    id,
    displayCode: `X-${id}`,
    categoryId,
    themeId,
    type: "answer-input",
    tagIds: [],
    flagged: false,
    favorite: false,
    payload: { prompt: id, answer: id },
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  } as Question;
}

async function seedRetiredThemes() {
  await db.categories.add({ id: "cat-job", name: "취업", order: 0, isCustom: false });
  await db.themes.bulkAdd([
    { id: "t-intv", categoryId: "cat-job", name: "면접", order: 0, isCustom: false, useDifficulty: false, seedKey: "INTV" },
    { id: "t-job", categoryId: "cat-job", name: "직무지식", order: 1, isCustom: false, useDifficulty: false },
    { id: "t-ncs", categoryId: "cat-job", name: "NCS", order: 2, isCustom: false, useDifficulty: false, seedKey: "NCS" },
    { id: "t-apti", categoryId: "cat-job", name: "인적성", order: 3, isCustom: false, useDifficulty: false, seedKey: "APTI" },
  ]);
}

describe("폐기된 기본 Theme 정리", () => {
  it("번들 문제·학습 기록·Attempt를 지우고 Session 통계를 다시 계산하며, 비게 된 Theme은 삭제한다", async () => {
    await seedRetiredThemes();
    await db.questions.bulkAdd([
      question("q-intv", "t-intv", "cat-job", { seedId: "intv-0001" }),
      question("q-job", "t-job", "cat-job", { seedId: "job-0001" }),
    ]);
    await db.questionRecords.bulkAdd(
      ["q-intv", "q-job"].map((questionId) => ({
        questionId,
        totalAttempts: 1,
        correctCount: 1,
        wrongCount: 0,
        lastResult: "correct" as const,
        lastAttemptAt: 1,
      })),
    );
    const session: Session = {
      id: "s1",
      startedAt: 0,
      endedAt: 1,
      totalDurationMs: 1,
      themeIds: ["t-intv"],
      tagIds: [],
      questionTypes: [],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 2,
      correctCount: 2,
      wrongCount: 0,
      accuracy: 1,
    };
    await db.sessions.add(session);
    const attempt = (id: string, questionId: string): Attempt => ({
      id,
      sessionId: "s1",
      questionId,
      questionType: "answer-input",
      isCorrect: true,
      userAnswer: "x",
      attemptedAt: 1,
    });
    await db.attempts.bulkAdd([attempt("a1", "q-intv"), attempt("a2", "q-job")]);

    const result = await syncDefaultContent();

    expect(result.retiredQuestions).toBe(2);
    expect(result.retiredThemes).toBe(2);
    expect(await db.questions.get("q-intv")).toBeUndefined();
    expect(await db.questions.get("q-job")).toBeUndefined();
    expect(await db.questionRecords.get("q-intv")).toBeUndefined();
    expect(await db.attempts.where("questionId").anyOf(["q-intv", "q-job"]).count()).toBe(0);
    expect(await db.themes.get("t-intv")).toBeUndefined();
    expect(await db.themes.get("t-job")).toBeUndefined();

    // Session은 남기고 통계만 0으로 정리된다
    expect(await db.sessions.get("s1")).toMatchObject({ totalAttempts: 0, correctCount: 0, wrongCount: 0, accuracy: 0 });

    // 남은 취업 Theme(NCS·인적성)은 유지되고, 폐기 Theme은 다시 만들어지지 않는다
    const names = (await db.themes.toArray()).map((t) => t.name);
    expect(names).toContain("NCS");
    expect(names).toContain("인적성");
    expect(names).not.toContain("면접");
    expect(names).not.toContain("직무지식");
    expect((await db.categories.toArray()).filter((c) => c.name === "취업")).toHaveLength(1);

    // 다시 실행해도 변화가 없다
    const again = await syncDefaultContent({ force: true });
    expect(again.retiredQuestions).toBe(0);
    expect(again.retiredThemes).toBe(0);
  });

  it("사용자가 직접 만든 문제가 있는 Theme은 번들 문제만 지우고 Theme과 사용자 문제를 보존한다", async () => {
    await seedRetiredThemes();
    await db.questions.bulkAdd([
      question("q-bundled", "t-intv", "cat-job", { seedId: "intv-0002" }),
      question("q-mine", "t-intv", "cat-job"),
    ]);
    await db.questionRecords.bulkAdd(
      ["q-bundled", "q-mine"].map((questionId) => ({
        questionId,
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        lastResult: null,
        lastAttemptAt: null,
      })),
    );

    const result = await syncDefaultContent();

    expect(result.retiredQuestions).toBe(1);
    expect(await db.questions.get("q-bundled")).toBeUndefined();
    expect(await db.questions.get("q-mine")).toBeDefined();
    expect(await db.themes.get("t-intv")).toBeDefined(); // 사용자 문제가 남아 있어 유지
    expect(await db.themes.get("t-job")).toBeUndefined(); // 비어 있어 삭제
  });
});
