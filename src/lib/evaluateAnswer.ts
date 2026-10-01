// 4장: MVP는 모든 문제를 Exact Match로만 채점한다. 대소문자/공백/문장부호 포함 완전 일치.
// 단, answer-input은 복수 정답(동의어)을 지원해 하나만 맞아도 정답으로 인정한다(OR).
import { isAnswerInputCorrect } from "@/lib/answerAlternatives";
import type { BlankAttemptResult, Question } from "@/types/domain";

export interface EvaluationResult {
  isCorrect: boolean;
  blankResults?: BlankAttemptResult[];
}

function exact(a: string, b: string): boolean {
  return a === b;
}

/**
 * userAnswer 형태는 문제 유형에 따라 다르다.
 * - blank: 빈칸 id → 입력값 Record
 * - multiple-choice: 선택한 보기 index(문자열)
 * - 나머지: 입력한 문자열 그대로
 */
export function evaluateAnswer(
  question: Question,
  userAnswer: string | Record<string, string>,
): EvaluationResult {
  switch (question.type) {
    case "blank": {
      const answers = userAnswer as Record<string, string>;
      const blankResults: BlankAttemptResult[] = question.payload.blanks.map((b) => ({
        blankId: b.id,
        isCorrect: exact(answers[b.id] ?? "", b.answer),
      }));
      return { isCorrect: blankResults.every((r) => r.isCorrect), blankResults };
    }
    case "term-to-def":
      return { isCorrect: exact(userAnswer as string, question.payload.definition) };
    case "def-to-term":
      return { isCorrect: exact(userAnswer as string, question.payload.term) };
    case "answer-input":
      return { isCorrect: isAnswerInputCorrect(userAnswer as string, question.payload.answer) };
    case "essay":
      return { isCorrect: exact(userAnswer as string, question.payload.answer) };
    case "multiple-choice":
      return { isCorrect: Number(userAnswer) === question.payload.correctIndex };
  }
}
