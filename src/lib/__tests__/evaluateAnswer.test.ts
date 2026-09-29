import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "@/lib/evaluateAnswer";
import type { Question } from "@/types/domain";

function base(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    categoryId: "c1",
    themeId: "t1",
    tagIds: [],
    flagged: false,
    favorite: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as Question;
}

describe("evaluateAnswer", () => {
  it("blank: 모든 빈칸이 정확히 일치해야 정답", () => {
    const q = base({
      type: "blank",
      payload: {
        template: "SELECT * FROM t {{b1}} 1=1;",
        blanks: [{ id: "b1", answer: "WHERE" }],
      },
    });
    expect(evaluateAnswer(q, { b1: "WHERE" }).isCorrect).toBe(true);
    expect(evaluateAnswer(q, { b1: "where" }).isCorrect).toBe(false); // 대소문자 구분
  });

  it("blank: 복수 빈칸 중 하나라도 틀리면 전체 오답, blankResults는 개별 결과를 담는다", () => {
    const q = base({
      type: "blank",
      payload: {
        template: "{{b1}} {{b2}}",
        blanks: [
          { id: "b1", answer: "A" },
          { id: "b2", answer: "B" },
        ],
      },
    });
    const result = evaluateAnswer(q, { b1: "A", b2: "X" });
    expect(result.isCorrect).toBe(false);
    expect(result.blankResults).toEqual([
      { blankId: "b1", isCorrect: true },
      { blankId: "b2", isCorrect: false },
    ]);
  });

  it("term-to-def: definition과 정확히 일치해야 정답", () => {
    const q = base({ type: "term-to-def", payload: { term: "INDEX", definition: "조회 속도 향상" } });
    expect(evaluateAnswer(q, "조회 속도 향상").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "조회 속도 향상 ").isCorrect).toBe(false); // 공백 포함 완전 일치
  });

  it("def-to-term: term과 정확히 일치해야 정답", () => {
    const q = base({ type: "def-to-term", payload: { term: "PRIMARY KEY", definition: "d" } });
    expect(evaluateAnswer(q, "PRIMARY KEY").isCorrect).toBe(true);
  });

  it("answer-input: exact match", () => {
    const q = base({ type: "answer-input", payload: { prompt: "1+1=?", answer: "2" } });
    expect(evaluateAnswer(q, "2").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "2.0").isCorrect).toBe(false);
  });

  it("essay: referenceAnswer가 아닌 answer로 exact match 채점한다", () => {
    const q = base({ type: "essay", payload: { prompt: "설명하시오", answer: "정답 문장" } });
    expect(evaluateAnswer(q, "정답 문장").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "다른 문장").isCorrect).toBe(false);
  });

  it("multiple-choice: correctIndex와 선택 index가 같아야 정답", () => {
    const q = base({
      type: "multiple-choice",
      payload: { prompt: "p", options: ["a", "b", "c"], correctIndex: 2 },
    });
    expect(evaluateAnswer(q, "2").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "0").isCorrect).toBe(false);
  });
});
