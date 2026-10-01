// answer-input의 복수 정답(동의어, OR 채점) 처리를 한 곳에 모은 순수 함수들.

/** payload.answer를 항상 배열로 정규화한다 (단일 string 하위 호환 포함). */
export function toAnswerAlternatives(answer: string | string[]): string[] {
  return Array.isArray(answer) ? answer : [answer];
}

/**
 * 사용자 입력이 정답으로 인정되는지 판단한다.
 * - 복수 정답 중 하나와 정확히 일치하면 정답 (OR)
 * - 모든 대체 정답을 ", "로 이어 적은 형태로 입력해도 정답 (기존 "A, B" 표기 하위 호환)
 */
export function isAnswerInputCorrect(userAnswer: string, answer: string | string[]): boolean {
  const alternatives = toAnswerAlternatives(answer);
  if (alternatives.includes(userAnswer)) return true;
  return alternatives.length > 1 && alternatives.join(", ") === userAnswer;
}

/** Feedback 등에 보여줄 "실제 정답" 텍스트: 복수 정답은 쉼표로 이어 보여준다. */
export function formatAnswerAlternatives(answer: string | string[]): string {
  return toAnswerAlternatives(answer).join(", ");
}

/** QuestionForm 편집용: 배열 정답을 줄 단위 텍스트로 보여준다. */
export function formatAnswerForEditing(answer: string | string[]): string {
  return toAnswerAlternatives(answer).join("\n");
}

/**
 * QuestionForm 저장용: 줄바꿈으로 입력된 텍스트를 다시 string | string[]로 되돌린다.
 * 줄이 하나뿐이면 string(하위 호환), 여러 줄이면 배열로 저장한다.
 */
export function parseAnswerFromEditing(text: string): string | string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? "";
  return lines;
}

/** 쉼표로 이은 한 세그먼트가 "독립된 정답"처럼 보이는지. 숫자(천단위 구분)·Big-O 표기는 제외한다. */
function looksLikeStandaloneAnswer(segment: string): boolean {
  if (segment.length === 0) return false;
  if (/^-?[\d.]+$/.test(segment)) return false; // 순수 숫자 (예: "10,000"의 조각)
  if (/^O\(/i.test(segment)) return false; // Big-O 표기 (예: "O(n), O(log n)")
  return true;
}

/**
 * 마이그레이션용: 기존에 쉼표로 복수 정답을 한 문자열에 넣어둔 경우(예: "미루다, 연기하다")만
 * 배열로 분리한다. 쉼표가 있다는 이유만으로 무조건 분리하지 않고, 모든 조각이 독립된 정답처럼
 * 보일 때만 분리한다 (숫자/Big-O 표기 등 하나의 값을 쉼표로 표기한 경우는 보존).
 */
export function splitIfAlternativeAnswers(answer: string): string | string[] {
  const segments = answer.split(",").map((s) => s.trim());
  if (segments.length < 2) return answer;
  if (!segments.every(looksLikeStandaloneAnswer)) return answer;
  return segments;
}
