import { describe, expect, it } from "vitest";
import { formatUserAnswerText, getQuestionPromptText } from "@/lib/questionSummary";
import type { Question } from "@/types/domain";

function base(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    displayCode: "T-0001",
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

describe("getQuestionPromptText (Feedback에 보여줄 문제 텍스트)", () => {
  it("blank: template을 그대로 보여준다", () => {
    const q = base({
      type: "blank",
      payload: { template: "SELECT * {{b1}} t", blanks: [{ id: "b1", answer: "FROM" }] },
    });
    expect(getQuestionPromptText(q)).toBe("SELECT * {{b1}} t");
  });

  it("term-to-def: 답변 중 실제로 보여준 쪽인 term만 보여준다 (definition 아님)", () => {
    const q = base({ type: "term-to-def", payload: { term: "INDEX", definition: "조회 속도 향상" } });
    expect(getQuestionPromptText(q)).toBe("INDEX");
  });

  it("def-to-term: 답변 중 실제로 보여준 쪽인 definition만 보여준다 (term 아님)", () => {
    const q = base({ type: "def-to-term", payload: { term: "INDEX", definition: "조회 속도 향상" } });
    expect(getQuestionPromptText(q)).toBe("조회 속도 향상");
  });

  it("answer-input/multiple-choice/essay: prompt를 보여준다", () => {
    const answerInput = base({ type: "answer-input", payload: { prompt: "1+1=?", answer: "2" } });
    const mc = base({
      type: "multiple-choice",
      payload: { prompt: "수도는?", options: ["서울", "부산"], correctIndex: 0 },
    });
    const essay = base({ type: "essay", payload: { prompt: "설명하시오", answer: "정답" } });
    expect(getQuestionPromptText(answerInput)).toBe("1+1=?");
    expect(getQuestionPromptText(mc)).toBe("수도는?");
    expect(getQuestionPromptText(essay)).toBe("설명하시오");
  });
});

describe("formatUserAnswerText (Feedback에 보여줄 '내가 입력한 답')", () => {
  it("blank: 빈칸 id별 입력값을 나열한다", () => {
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
    expect(formatUserAnswerText(q, { b1: "x", b2: "y" })).toBe("b1: x, b2: y");
  });

  it("multiple-choice: 선택한 index를 보기 텍스트로 바꿔 보여준다", () => {
    const q = base({
      type: "multiple-choice",
      payload: { prompt: "p", options: ["a", "b", "c"], correctIndex: 2 },
    });
    expect(formatUserAnswerText(q, "1")).toBe("b");
  });

  it("나머지 유형은 입력한 문자열을 그대로 보여준다", () => {
    const answerInput = base({ type: "answer-input", payload: { prompt: "p", answer: "2" } });
    expect(formatUserAnswerText(answerInput, "2")).toBe("2");

    const termToDef = base({ type: "term-to-def", payload: { term: "t", definition: "d" } });
    expect(formatUserAnswerText(termToDef, "내 대답")).toBe("내 대답");
  });
});
