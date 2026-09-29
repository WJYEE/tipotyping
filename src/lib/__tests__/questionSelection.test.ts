import { describe, expect, it } from "vitest";
import { buildCycleQueue, filterQuestions } from "@/lib/questionSelection";
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
    });
    expect(result).toHaveLength(2);
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
