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

/** Feedback 화면에 보여줄 "실제 정답" 텍스트 */
export function getCorrectAnswerText(question: Question): string {
  switch (question.type) {
    case "blank":
      return question.payload.blanks.map((b) => `${b.id}: ${b.answer}`).join(", ");
    case "term-to-def":
      return question.payload.definition;
    case "def-to-term":
      return question.payload.term;
    case "answer-input":
      return question.payload.answer;
    case "essay":
      return question.payload.answer;
    case "multiple-choice":
      return question.payload.options[question.payload.correctIndex];
    default:
      return "";
  }
}
