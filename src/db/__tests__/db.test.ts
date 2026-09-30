import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
  attemptRepo,
  categoryRepo,
  questionRecordRepo,
  questionRepo,
  sessionRepo,
  settingsRepo,
  tagRepo,
  themeRepo,
} from "@/db/repositories";
import { syncDefaultContent } from "@/db/seed/seed";
import { defaultQuestions } from "@/db/seed/defaultQuestions";

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

describe("syncDefaultContent (최초 설치)", () => {
  it("기본 Category/Theme과 기본 문제은행을 생성한다", async () => {
    await syncDefaultContent();

    const categories = await categoryRepo.list();
    expect(categories.length).toBe(8); // PRODUCT_SPEC 2장 대분류 8개

    const questions = await questionRepo.list();
    expect(questions.length).toBe(defaultQuestions.length);

    // 6개 문제 유형이 모두 등장하는지 확인
    const types = new Set(questions.map((q) => q.type));
    expect(types.size).toBe(6);

    // 모든 문제가 displayCode를 부여받았는지 확인
    expect(questions.every((q) => !!q.displayCode)).toBe(true);
  });

  it("두 번째 호출은 아무 것도 하지 않는다 (idempotent)", async () => {
    await syncDefaultContent();
    await syncDefaultContent();
    const categories = await categoryRepo.list();
    expect(categories.length).toBe(8);
  });

  it("Question 생성 시 QuestionRecord가 1:1로 자동 생성된다", async () => {
    await syncDefaultContent();
    const questions = await questionRepo.list();
    for (const q of questions) {
      const record = await questionRecordRepo.get(q.id);
      expect(record).toBeDefined();
      expect(record?.totalAttempts).toBe(0);
    }
  });
});

describe("Category → Theme → Question 관계", () => {
  it("themeRepo.listByCategory / questionRepo.listByTheme가 관계를 따라간다", async () => {
    const category = await categoryRepo.create({ name: "테스트 카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테스트 테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
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

    const themesOfCategory = await themeRepo.listByCategory(category.id);
    expect(themesOfCategory.map((t) => t.id)).toEqual([theme.id]);

    const questionsOfTheme = await questionRepo.listByTheme(theme.id);
    expect(questionsOfTheme.map((q) => q.id)).toEqual([question.id]);
  });

  it("하위 Theme이 있는 Category는 삭제할 수 없다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    await expect(categoryRepo.remove(category.id)).rejects.toThrow();
  });
});

describe("Tag 참조", () => {
  it("getOrCreate는 동일 이름 Tag를 재사용한다", async () => {
    const a = await tagRepo.getOrCreate("SQL");
    const b = await tagRepo.getOrCreate("SQL");
    expect(a.id).toBe(b.id);
    expect(await tagRepo.list()).toHaveLength(1);
  });

  it("questionRepo.listByTag가 tagIds[] 참조로 문제를 찾는다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    const tag = await tagRepo.getOrCreate("JOIN");
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [tag.id],
      flagged: false,
      favorite: false,
      payload: { prompt: "p", answer: "a" },
    });

    const found = await questionRepo.listByTag(tag.id);
    expect(found.map((q) => q.id)).toEqual([question.id]);
  });

  it("Tag 삭제 시 참조하는 Question의 tagIds에서도 제거된다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    const tag = await tagRepo.getOrCreate("WHERE");
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [tag.id],
      flagged: false,
      favorite: false,
      payload: { prompt: "p", answer: "a" },
    });

    await tagRepo.remove(tag.id);

    const updated = await questionRepo.get(question.id);
    expect(updated?.tagIds).toEqual([]);
  });
});

describe("Session / Attempt / QuestionRecord", () => {
  it("attemptRepo.record가 Session 누적치와 QuestionRecord를 함께 갱신한다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
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
      endedAt: null,
      totalDurationMs: 0,
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

    const updatedSession = await sessionRepo.get(session.id);
    expect(updatedSession?.totalAttempts).toBe(2);
    expect(updatedSession?.correctCount).toBe(1);
    expect(updatedSession?.wrongCount).toBe(1);
    expect(updatedSession?.accuracy).toBeCloseTo(0.5);

    const record = await questionRecordRepo.get(question.id);
    expect(record?.totalAttempts).toBe(2);
    expect(record?.correctCount).toBe(1);
    expect(record?.lastResult).toBe("wrong");

    const attempts = await attemptRepo.listBySession(session.id);
    expect(attempts).toHaveLength(2);
  });

  it("빈칸 문제 Attempt는 blankStats를 누적한다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "blank",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { template: "SELECT * FROM t {{b1}} 1=1;", blanks: [{ id: "b1", answer: "WHERE" }] },
    });
    const session = await sessionRepo.create({
      startedAt: Date.now(),
      endedAt: null,
      totalDurationMs: 0,
      themeIds: [theme.id],
      tagIds: [],
      questionTypes: ["blank"],
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
      questionType: "blank",
      isCorrect: true,
      userAnswer: "WHERE",
      blankResults: [{ blankId: "b1", isCorrect: true }],
      attemptedAt: Date.now(),
    });

    const record = await questionRecordRepo.get(question.id);
    expect(record?.blankStats).toEqual([{ blankId: "b1", totalAttempts: 1, correctCount: 1 }]);
  });

  it("Question 삭제 시 QuestionRecord/Attempt가 함께 삭제되고 Session 통계가 재계산된다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    const questionA = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "a", answer: "a" },
    });
    const questionB = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "b", answer: "b" },
    });
    const session = await sessionRepo.create({
      startedAt: Date.now(),
      endedAt: null,
      totalDurationMs: 0,
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
      questionId: questionA.id,
      questionType: "answer-input",
      isCorrect: true,
      userAnswer: "a",
      attemptedAt: Date.now(),
    });
    await attemptRepo.record({
      sessionId: session.id,
      questionId: questionB.id,
      questionType: "answer-input",
      isCorrect: false,
      userAnswer: "x",
      attemptedAt: Date.now(),
    });

    await questionRepo.remove(questionA.id);

    expect(await questionRepo.get(questionA.id)).toBeUndefined();
    expect(await questionRecordRepo.get(questionA.id)).toBeUndefined();
    expect(await attemptRepo.listByQuestion(questionA.id)).toHaveLength(0);

    const updatedSession = await sessionRepo.get(session.id);
    expect(updatedSession?.totalAttempts).toBe(1);
    expect(updatedSession?.correctCount).toBe(0);
    expect(updatedSession?.wrongCount).toBe(1);
  });

  it("questionRepo.update는 기본적으로 QuestionRecord를 유지하고, resetRecord 옵션을 주면 초기화한다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
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
      endedAt: null,
      totalDurationMs: 0,
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

    await questionRepo.update(question.id, { payload: { prompt: "수정됨", answer: "2" } });
    let record = await questionRecordRepo.get(question.id);
    expect(record?.totalAttempts).toBe(1);

    await questionRepo.update(
      question.id,
      { payload: { prompt: "다시 수정", answer: "2" } },
      { resetRecord: true },
    );
    record = await questionRecordRepo.get(question.id);
    expect(record?.totalAttempts).toBe(0);
    expect(record?.lastResult).toBeNull();
  });
});

describe("Settings", () => {
  it("임의의 key-value를 저장/조회한다", async () => {
    await settingsRepo.set("dashboardRange", "30d");
    expect(await settingsRepo.get("dashboardRange")).toBe("30d");
  });
});

describe("sessionRepo.discard", () => {
  it("5장: 10초 미만 Session은 discard로 Session과 Attempt를 함께 제거한다", async () => {
    const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "테마",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "p", answer: "a" },
    });
    const session = await sessionRepo.create({
      startedAt: Date.now(),
      endedAt: null,
      totalDurationMs: 3000,
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
      userAnswer: "a",
      attemptedAt: Date.now(),
    });

    await sessionRepo.discard(session.id);

    expect(await sessionRepo.get(session.id)).toBeUndefined();
    expect(await attemptRepo.listBySession(session.id)).toHaveLength(0);
  });
});

describe("Question.displayCode", () => {
  it("같은 Theme 안에서 생성 순서대로 순번이 매겨진다", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });

    const q1 = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
    });
    const q2 = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "2", answer: "2" },
    });

    expect(q1.displayCode).toBe("SQL-0001");
    expect(q2.displayCode).toBe("SQL-0002");
  });

  it("다른 Theme는 독립적으로 0001부터 시작한다", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
    const sql = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });
    const python = await themeRepo.create({
      categoryId: category.id,
      name: "Python",
      order: 1,
      isCustom: false,
      useDifficulty: false,
    });

    const q1 = await questionRepo.create({
      categoryId: category.id,
      themeId: sql.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
    });
    const q2 = await questionRepo.create({
      categoryId: category.id,
      themeId: python.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
    });

    expect(q1.displayCode).toBe("SQL-0001");
    expect(q2.displayCode).toBe("PY-0001");
  });

  it("options.displayCode가 같은 Theme에서 이미 사용 중이면 자동으로 새 코드를 발급한다", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });
    const base = {
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input" as const,
      tagIds: [],
      flagged: false,
      favorite: false,
    };

    await questionRepo.create({ ...base, payload: { prompt: "1", answer: "1" } }, { displayCode: "SQL-0001" });
    const dup = await questionRepo.create(
      { ...base, payload: { prompt: "2", answer: "2" } },
      { displayCode: "SQL-0001" },
    );

    expect(dup.displayCode).not.toBe("SQL-0001");
    expect(dup.displayCode).toBe("SQL-0002");
  });

  it("update는 displayCode를 변경하지 않는다 (patch 타입에서 제외됨)", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
    });

    await questionRepo.update(question.id, { payload: { prompt: "수정", answer: "1" } });
    const updated = await questionRepo.get(question.id);
    expect(updated?.displayCode).toBe(question.displayCode);
  });

  it("findByDisplayCode로 문제를 찾을 수 있다", async () => {
    const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
    const theme = await themeRepo.create({
      categoryId: category.id,
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });
    const question = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
    });

    const found = await questionRepo.findByDisplayCode(question.displayCode);
    expect(found?.id).toBe(question.id);
  });
});
