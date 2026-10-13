// 패키지 화면에서 쓰는 순수 계산(필터·진행률). React/DB에 의존하지 않아 테스트하기 쉽다.
import type { Difficulty, Question, QuestionRecord } from "@/types/domain";
import type { DerivedQuestion, PracticeTask } from "@/types/package";

export interface QuestionViewFilter {
  /** 빈 문자열이면 전체 */
  categoryKey: string;
  search: string;
  difficulty: Difficulty | "";
  onlyWrong: boolean;
  /** false면 검수 전(needs_human_review)·반려(rejected) 문제를 목록과 연습에서 뺀다 */
  includeUnreviewed: boolean;
}

export const EMPTY_QUESTION_VIEW_FILTER: QuestionViewFilter = {
  categoryKey: "",
  search: "",
  difficulty: "",
  onlyWrong: false,
  includeUnreviewed: true,
};

/** 문제가 속한 카테고리 키: Theme id(kbb-theme-sql → sql). 패키지가 지정한 categoryKeyOf로 계산한다. */
export function filterQuestions(
  questions: Question[],
  records: Map<string, QuestionRecord>,
  filter: QuestionViewFilter,
  categoryKeyOf: (q: Question) => string,
): Question[] {
  const needle = filter.search.trim().toLowerCase();
  return questions.filter((q) => {
    if (!filter.includeUnreviewed && q.reviewStatus && q.reviewStatus !== "reviewed") return false;
    if (q.reviewStatus === "rejected") return false; // 반려된 문제는 어떤 경우에도 공개 풀이에서 제외
    if (filter.categoryKey && categoryKeyOf(q) !== filter.categoryKey) return false;
    if (filter.difficulty && q.difficulty !== filter.difficulty) return false;
    if (filter.onlyWrong && records.get(q.id)?.lastResult !== "wrong") return false;
    if (needle) {
      const text = [q.displayCode, "prompt" in q.payload ? q.payload.prompt : "", q.explanation ?? ""]
        .join(" ")
        .toLowerCase();
      if (!text.includes(needle)) return false;
    }
    return true;
  });
}

export interface QuestionProgress {
  total: number;
  attempted: number;
  /** 마지막 시도가 정답인 문제 수 */
  lastCorrect: number;
  /** 마지막 시도가 오답인 문제 수(오답 복습 대상) */
  lastWrong: number;
}

export function computeQuestionProgress(
  questions: Question[],
  records: Map<string, QuestionRecord>,
): QuestionProgress {
  let attempted = 0;
  let lastCorrect = 0;
  let lastWrong = 0;
  for (const q of questions) {
    const r = records.get(q.id);
    if (!r || r.totalAttempts === 0) continue;
    attempted++;
    if (r.lastResult === "correct") lastCorrect++;
    if (r.lastResult === "wrong") lastWrong++;
  }
  return { total: questions.length, attempted, lastCorrect, lastWrong };
}

export function computeTaskProgress(tasks: PracticeTask[]): { total: number; done: number } {
  return { total: tasks.length, done: tasks.filter((t) => t.completedAt !== null).length };
}

/** 원본 문제 id → 파생질문 목록 */
export function groupDerivedByParent(derived: DerivedQuestion[]): Map<string, DerivedQuestion[]> {
  const map = new Map<string, DerivedQuestion[]>();
  for (const d of derived) {
    const list = map.get(d.parentQuestionId) ?? [];
    list.push(d);
    map.set(d.parentQuestionId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  return map;
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
