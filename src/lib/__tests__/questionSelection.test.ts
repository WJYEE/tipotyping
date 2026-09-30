import { describe, expect, it } from "vitest";
import {
  buildCycleQueue,
  filterQuestions,
  getDifficultyThemeIds,
  type GameConfig,
} from "@/lib/questionSelection";
import type { Question, QuestionRecord } from "@/types/domain";

function makeQuestion(
  id: string,
  themeId: string,
  type: Question["type"],
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    categoryId: "c1",
    themeId,
    tagIds: [],
    flagged: false,
    favorite: false,
    createdAt: Number(id.replace(/\D/g, "")) || 0,
    updatedAt: 0,
    type,
    payload: { prompt: id, answer: "x" },
    ...overrides,
  } as Question;
}

describe("filterQuestions", () => {
  it("themeId/type/tag/difficulty 조건을 모두 만족하는 문제만 남긴다", () => {
    const questions = [
      makeQuestion("q1", "t1", "answer-input", { difficulty: "beginner", tagIds: ["JOIN"] }),
      makeQuestion("q2", "t2", "answer-input"),
      makeQuestion("q3", "t1", "essay"),
      makeQuestion("q4", "t1", "answer-input", { difficulty: "advanced" }),
    ];

    const result = filterQuestions(questions, {
      themeIds: ["t1"],
      questionTypes: ["answer-input"],
      tagIds: ["JOIN"],
      difficulties: ["beginner"],
      difficultyThemeIds: ["t1"],
    });

    expect(result.map((q) => q.id)).toEqual(["q1"]);
  });

  it("tagIds/difficulties가 비어있으면 필터를 적용하지 않는다", () => {
    const questions = [makeQuestion("q1", "t1", "answer-input"), makeQuestion("q2", "t1", "essay")];
    const result = filterQuestions(questions, {
      themeIds: ["t1"],
      questionTypes: ["answer-input", "essay"],
      tagIds: [],
      difficulties: [],
      difficultyThemeIds: ["t1"],
    });
    expect(result).toHaveLength(2);
  });

  describe("난이도 사용/미사용 Theme 혼합 선택", () => {
    // sql: useDifficulty=true, fin: useDifficulty=false (예: SQL + 금융기초)
    const themes = [
      { id: "sql", useDifficulty: true },
      { id: "fin", useDifficulty: false },
      { id: "py", useDifficulty: true },
    ];
    const questions = [
      makeQuestion("q1", "sql", "answer-input", { difficulty: "intermediate" }),
      makeQuestion("q2", "sql", "answer-input", { difficulty: "beginner" }),
      makeQuestion("q3", "sql", "answer-input", { difficulty: "advanced" }),
      makeQuestion("q4", "sql", "answer-input"), // 난이도 미지정
      makeQuestion("q5", "fin", "answer-input"),
      makeQuestion("q6", "fin", "multiple-choice"),
      makeQuestion("q7", "fin", "answer-input", { difficulty: "beginner" }), // 비코딩인데 값이 남아 있는 경우
    ];
    const selected = ["sql", "fin"];
    const filters = {
      themeIds: selected,
      questionTypes: ["answer-input", "multiple-choice"] as Question["type"][],
      tagIds: [],
      difficulties: ["intermediate"] as const,
      difficultyThemeIds: getDifficultyThemeIds(themes, selected),
    };

    it("선택한 Theme 중 useDifficulty=true인 Theme만 난이도 적용 대상이다", () => {
      expect(getDifficultyThemeIds(themes, selected)).toEqual(["sql"]);
    });

    it("난이도 사용 Theme은 선택한 난이도만, 미사용 Theme은 난이도와 무관하게 전부 포함한다", () => {
      const result = filterQuestions(questions, { ...filters, difficulties: ["intermediate"] });
      expect(result.map((q) => q.id)).toEqual(["q1", "q5", "q6", "q7"]);
    });

    it("미사용 Theme에도 유형/태그 필터는 그대로 적용된다", () => {
      const result = filterQuestions(questions, {
        ...filters,
        difficulties: ["intermediate"],
        questionTypes: ["multiple-choice"],
      });
      expect(result.map((q) => q.id)).toEqual(["q6"]);
    });

    it("Game Setup 출제 가능 수와 Game Typing 첫 사이클 문제 수가 같다 (같은 config 사용)", () => {
      const config: GameConfig = { ...filters, difficulties: ["intermediate"], orderMode: "random" };
      const setupCount = filterQuestions(questions, config).length;
      const queue = buildCycleQueue(
        filterQuestions(questions, config),
        config.themeIds,
        config.questionTypes,
        config.orderMode,
        new Map(),
      );
      expect(queue).toHaveLength(setupCount);
      expect(new Set(queue.map((q) => q.id))).toEqual(new Set(["q1", "q5", "q6", "q7"]));
    });
  });
});

describe("buildCycleQueue", () => {
  it("모든 eligible 문제를 정확히 한 번씩만 포함한다 (사이클 내 중복 없음)", () => {
    const questions = [
      makeQuestion("q1", "t1", "answer-input"),
      makeQuestion("q2", "t1", "essay"),
      makeQuestion("q3", "t2", "answer-input"),
      makeQuestion("q4", "t2", "essay"),
      makeQuestion("q5", "t1", "answer-input"),
    ];
    const queue = buildCycleQueue(
      questions,
      ["t1", "t2"],
      ["answer-input", "essay"],
      "sequential",
      new Map(),
    );
    expect(queue).toHaveLength(5);
    expect(new Set(queue.map((q) => q.id)).size).toBe(5);
  });

  it("테마와 유형을 라운드로빈으로 섞어 균등하게 배치한다", () => {
    const questions = [
      makeQuestion("a1", "t1", "answer-input"),
      makeQuestion("a2", "t1", "answer-input"),
      makeQuestion("b1", "t2", "essay"),
      makeQuestion("b2", "t2", "essay"),
    ];
    const queue = buildCycleQueue(questions, ["t1", "t2"], ["answer-input", "essay"], "sequential", new Map());
    // 라운드로빈이므로 t1 문제와 t2 문제가 번갈아 나와야 한다 (연속으로 같은 테마만 나오지 않음)
    const themeSeq = queue.map((q) => q.themeId);
    expect(themeSeq).toEqual(["t1", "t2", "t1", "t2"]);
  });

  it("sequential은 createdAt 오름차순으로 정렬한다", () => {
    const questions = [
      makeQuestion("q3", "t1", "answer-input", { createdAt: 3 }),
      makeQuestion("q1", "t1", "answer-input", { createdAt: 1 }),
      makeQuestion("q2", "t1", "answer-input", { createdAt: 2 }),
    ];
    const queue = buildCycleQueue(questions, ["t1"], ["answer-input"], "sequential", new Map());
    expect(queue.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("new-first는 한 번도 풀지 않은 문제를 먼저 배치한다", () => {
    const questions = [
      makeQuestion("attempted", "t1", "answer-input", { createdAt: 1 }),
      makeQuestion("fresh", "t1", "answer-input", { createdAt: 2 }),
    ];
    const records = new Map<string, QuestionRecord>([
      [
        "attempted",
        { questionId: "attempted", totalAttempts: 3, correctCount: 2, wrongCount: 1, lastResult: "correct", lastAttemptAt: 1 },
      ],
    ]);
    const queue = buildCycleQueue(questions, ["t1"], ["answer-input"], "new-first", records);
    expect(queue[0].id).toBe("fresh");
  });

  it("wrong-first는 최근 결과가 오답인 문제를 먼저 배치한다", () => {
    const questions = [
      makeQuestion("correctOne", "t1", "answer-input", { createdAt: 1 }),
      makeQuestion("wrongOne", "t1", "answer-input", { createdAt: 2 }),
    ];
    const records = new Map<string, QuestionRecord>([
      [
        "correctOne",
        { questionId: "correctOne", totalAttempts: 1, correctCount: 1, wrongCount: 0, lastResult: "correct", lastAttemptAt: 1 },
      ],
      [
        "wrongOne",
        { questionId: "wrongOne", totalAttempts: 1, correctCount: 0, wrongCount: 1, lastResult: "wrong", lastAttemptAt: 2 },
      ],
    ]);
    const queue = buildCycleQueue(questions, ["t1"], ["answer-input"], "wrong-first", records);
    expect(queue[0].id).toBe("wrongOne");
  });

  it("random도 eligible 전체를 정확히 한 번씩 포함한다", () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`, "t1", "answer-input"));
    const queue = buildCycleQueue(questions, ["t1"], ["answer-input"], "random", new Map());
    expect(new Set(queue.map((q) => q.id)).size).toBe(10);
  });
});
