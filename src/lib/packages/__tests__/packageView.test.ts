import { describe, expect, it } from "vitest";
import {
  computeQuestionProgress,
  EMPTY_QUESTION_VIEW_FILTER,
  filterQuestions,
  groupDerivedByParent,
} from "@/lib/packages/packageView";
import { filterQuestions as selectForPlay } from "@/lib/questionSelection";
import type { Question, QuestionRecord } from "@/types/domain";
import type { DerivedQuestion } from "@/types/package";

function mq(id: string, over: Partial<Question> = {}): Question {
  return {
    id,
    displayCode: `KBB-${id}`,
    categoryId: "c",
    themeId: `kbb-theme-${id.startsWith("s") ? "sql" : "python"}`,
    tagIds: [],
    flagged: false,
    favorite: false,
    createdAt: 1,
    updatedAt: 1,
    type: "multiple-choice",
    payload: { prompt: `문제 ${id} JOIN`, options: ["a", "b"], correctIndex: 0 },
    ...over,
  } as Question;
}
const rec = (questionId: string, lastResult: "correct" | "wrong" | null, totalAttempts = 1): QuestionRecord => ({
  questionId, totalAttempts, correctCount: 0, wrongCount: 0, lastResult, lastAttemptAt: 1,
});
const catOf = (q: Question) => q.themeId.replace("kbb-theme-", "");

describe("filterQuestions (패키지 문제은행)", () => {
  const qs = [
    mq("s1", { reviewStatus: "needs_human_review", difficulty: "beginner" }),
    mq("s2", { reviewStatus: "reviewed" }),
    mq("p1", { reviewStatus: "needs_human_review" }),
    mq("p2", { reviewStatus: "rejected" }),
  ];
  const records = new Map([rec("s1", "wrong"), rec("s2", "correct")].map((r) => [r.questionId, r]));

  it("카테고리·검색·난이도·오답만으로 거른다", () => {
    expect(filterQuestions(qs, records, { ...EMPTY_QUESTION_VIEW_FILTER, categoryKey: "sql" }, catOf).map((q) => q.id)).toEqual(["s1", "s2"]);
    expect(filterQuestions(qs, records, { ...EMPTY_QUESTION_VIEW_FILTER, search: "p1" }, catOf).map((q) => q.id)).toEqual(["p1"]);
    expect(filterQuestions(qs, records, { ...EMPTY_QUESTION_VIEW_FILTER, difficulty: "beginner" }, catOf).map((q) => q.id)).toEqual(["s1"]);
    expect(filterQuestions(qs, records, { ...EMPTY_QUESTION_VIEW_FILTER, onlyWrong: true }, catOf).map((q) => q.id)).toEqual(["s1"]);
  });

  it("반려 문제는 항상 제외, 검수 전 초안은 옵션으로 제외", () => {
    expect(filterQuestions(qs, records, EMPTY_QUESTION_VIEW_FILTER, catOf).map((q) => q.id)).toEqual(["s1", "s2", "p1"]);
    expect(filterQuestions(qs, records, { ...EMPTY_QUESTION_VIEW_FILTER, includeUnreviewed: false }, catOf).map((q) => q.id)).toEqual(["s2"]);
  });

  it("검수 상태가 없는 일반 문제는 검수 옵션의 영향을 받지 않는다", () => {
    expect(filterQuestions([mq("s9")], records, { ...EMPTY_QUESTION_VIEW_FILTER, includeUnreviewed: false }, catOf)).toHaveLength(1);
  });
});

describe("연습(questionSelection)의 reviewStatuses 필터", () => {
  const base = { themeIds: ["kbb-theme-sql"], questionTypes: ["multiple-choice" as const], tagIds: [], difficulties: [], difficultyThemeIds: [] };
  const qs = [mq("s1", { reviewStatus: "needs_human_review" }), mq("s2", { reviewStatus: "reviewed" }), mq("s3")];
  it("지정하지 않으면 모두 출제", () => expect(selectForPlay(qs, base)).toHaveLength(3));
  it("reviewed만 지정하면 검수 전 초안을 빼되 검수 개념이 없는 문제는 유지", () => {
    expect(selectForPlay(qs, { ...base, reviewStatuses: ["reviewed"] }).map((q) => q.id)).toEqual(["s2", "s3"]);
  });
});

describe("진행률·파생질문 그룹", () => {
  it("시도한 문제와 마지막 결과를 센다", () => {
    const records = new Map([rec("s1", "wrong"), rec("s2", "correct"), rec("p1", null, 0)].map((r) => [r.questionId, r]));
    expect(computeQuestionProgress([mq("s1"), mq("s2"), mq("p1"), mq("p2")], records)).toEqual({ total: 4, attempted: 2, lastCorrect: 1, lastWrong: 1 });
  });
  it("파생질문을 원본 문제 기준으로 묶는다", () => {
    const d = (id: string, parent: string) => ({ id, parentQuestionId: parent }) as DerivedQuestion;
    const g = groupDerivedByParent([d("b", "q1"), d("a", "q1"), d("c", "q2")]);
    expect(g.get("q1")!.map((x) => x.id)).toEqual(["a", "b"]);
    expect(g.get("q2")).toHaveLength(1);
  });
});
