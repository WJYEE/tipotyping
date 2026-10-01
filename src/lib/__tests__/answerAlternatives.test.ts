import { describe, expect, it } from "vitest";
import {
  formatAnswerAlternatives,
  formatAnswerForEditing,
  isAnswerInputCorrect,
  parseAnswerFromEditing,
  splitIfAlternativeAnswers,
  toAnswerAlternatives,
} from "@/lib/answerAlternatives";

describe("toAnswerAlternatives", () => {
  it("string은 1개짜리 배열로 정규화한다 (하위 호환)", () => {
    expect(toAnswerAlternatives("2")).toEqual(["2"]);
  });

  it("string[]은 그대로 반환한다", () => {
    expect(toAnswerAlternatives(["미루다", "연기하다"])).toEqual(["미루다", "연기하다"]);
  });
});

describe("isAnswerInputCorrect", () => {
  it("단일 정답(string): exact match만 정답", () => {
    expect(isAnswerInputCorrect("2", "2")).toBe(true);
    expect(isAnswerInputCorrect("2.0", "2")).toBe(false);
  });

  it("복수 정답(string[]): 하나만 맞아도 정답 (OR)", () => {
    const answer = ["미루다", "연기하다"];
    expect(isAnswerInputCorrect("미루다", answer)).toBe(true);
    expect(isAnswerInputCorrect("연기하다", answer)).toBe(true);
    expect(isAnswerInputCorrect("다른말", answer)).toBe(false);
  });

  it("복수 정답을 모두 이어 적은 형태도 정답으로 인정한다", () => {
    expect(isAnswerInputCorrect("미루다, 연기하다", ["미루다", "연기하다"])).toBe(true);
  });

  it("대소문자/공백까지 완전 일치해야 한다", () => {
    expect(isAnswerInputCorrect("미루다 ", ["미루다", "연기하다"])).toBe(false);
  });
});

describe("formatAnswerAlternatives / formatAnswerForEditing", () => {
  it("복수 정답을 쉼표로 이어 보여준다 (Feedback 표시용)", () => {
    expect(formatAnswerAlternatives(["미루다", "연기하다"])).toBe("미루다, 연기하다");
  });

  it("단일 정답은 그대로 보여준다", () => {
    expect(formatAnswerAlternatives("2")).toBe("2");
  });

  it("편집용 텍스트는 줄바꿈으로 이어준다", () => {
    expect(formatAnswerForEditing(["미루다", "연기하다"])).toBe("미루다\n연기하다");
  });
});

describe("parseAnswerFromEditing", () => {
  it("한 줄이면 string(하위 호환)으로 되돌린다", () => {
    expect(parseAnswerFromEditing("2")).toBe("2");
  });

  it("여러 줄이면 배열로 저장한다 (빈 줄 제거)", () => {
    expect(parseAnswerFromEditing("미루다\n\n연기하다\n")).toEqual(["미루다", "연기하다"]);
  });

  it("빈 입력은 빈 문자열을 반환한다", () => {
    expect(parseAnswerFromEditing("")).toBe("");
  });
});

describe("splitIfAlternativeAnswers (마이그레이션 판별)", () => {
  it("독립된 단어들을 쉼표로 이어 적은 경우 배열로 분리한다", () => {
    expect(splitIfAlternativeAnswers("미루다, 연기하다")).toEqual(["미루다", "연기하다"]);
  });

  it("쉼표가 없으면 그대로 둔다", () => {
    expect(splitIfAlternativeAnswers("PRIMARY KEY")).toBe("PRIMARY KEY");
  });

  it("숫자의 천단위 구분 쉼표는 분리하지 않는다", () => {
    expect(splitIfAlternativeAnswers("10,000")).toBe("10,000");
  });

  it("Big-O 표기의 쉼표는 분리하지 않는다", () => {
    expect(splitIfAlternativeAnswers("O(n), O(log n)")).toBe("O(n), O(log n)");
  });

  it("빈 조각이 섞여 있으면(트레일링 쉼표 등) 의도가 불명확하므로 보존한다", () => {
    expect(splitIfAlternativeAnswers("미루다,")).toBe("미루다,");
  });
});
