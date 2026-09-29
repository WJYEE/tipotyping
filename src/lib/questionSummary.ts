import type { Question, QuestionType } from "@/types/domain";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  blank: "빈칸 블록",
  "term-to-def": "용어 → 정의",
  "def-to-term": "정의 → 용어",
  "answer-input": "정답 입력",
  "multiple-choice": "객관식",
  essay: "서술형",
};

/** 문제 목록에서 유형별 payload를 한 줄로 요약한다. */
export function getQuestionSummary(question: Question): string {
  switch (question.type) {
    case "blank":
      return question.payload.template;
    case "term-to-def":
    case "def-to-term":
      return `${question.payload.term} / ${question.payload.definition}`;
    case "answer-input":
      return question.payload.prompt;
    case "multiple-choice":
      return question.payload.prompt;
    case "essay":
      return question.payload.prompt;
    default:
      return "";
  }
}
