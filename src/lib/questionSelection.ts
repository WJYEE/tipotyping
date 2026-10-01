// 6장 Question Selection: 복수 테마/유형/태그/난이도 필터 + 4개 출제모드 + 테마·유형 균등 출제.
import type { Difficulty, Question, QuestionRecord, QuestionType, Theme } from "@/types/domain";
import type { OrderMode } from "@/types/domain";

export interface SelectionFilters {
  themeIds: string[];
  questionTypes: QuestionType[];
  tagIds: string[];
  difficulties: Difficulty[];
  /**
   * 선택한 Theme 중 난이도를 사용하는(useDifficulty=true) Theme id.
   * 난이도 필터는 이 Theme의 문제에만 적용하고, 나머지 Theme 문제는 난이도와 무관하게 포함한다.
   */
  difficultyThemeIds: string[];
}

export interface GameConfig extends SelectionFilters {
  orderMode: OrderMode;
}

/** 선택한 Theme 중 난이도 필터를 적용할 Theme id 목록. Game Setup에서 GameConfig를 만들 때 사용한다. */
export function getDifficultyThemeIds(
  themes: Pick<Theme, "id" | "useDifficulty">[],
  themeIds: string[],
): string[] {
  return themes.filter((t) => t.useDifficulty && themeIds.includes(t.id)).map((t) => t.id);
}

export function filterQuestions(questions: Question[], filters: SelectionFilters): Question[] {
  // 이전 버전에서 만들어진 config에는 difficultyThemeIds가 없을 수 있다.
  const difficultyThemeIds = filters.difficultyThemeIds ?? [];
  return questions.filter((q) => {
    if (!filters.themeIds.includes(q.themeId)) return false;
    if (!filters.questionTypes.includes(q.type)) return false;
    if (filters.tagIds.length > 0 && !q.tagIds.some((id) => filters.tagIds.includes(id))) {
      return false;
    }
    if (filters.difficulties.length > 0 && difficultyThemeIds.includes(q.themeId)) {
      if (!q.difficulty || !filters.difficulties.includes(q.difficulty)) return false;
    }
    return true;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 한 사이클 분량의 출제 순서를 만든다.
 * themeId × questionType 버킷으로 나눈 뒤 라운드로빈으로 뽑아 테마/유형이 균등하게 섞이게 하고,
 * 각 버킷 내부는 orderMode에 따라 정렬(순서대로/새 문제 우선/오답 우선) 또는 셔플(랜덤)한다.
 */
export function buildCycleQueue(
  eligible: Question[],
  themeIds: string[],
  questionTypes: QuestionType[],
  orderMode: OrderMode,
  records: Map<string, QuestionRecord>,
): Question[] {
  const buckets = new Map<string, Map<QuestionType, Question[]>>();
  for (const themeId of themeIds) buckets.set(themeId, new Map());

  for (const q of eligible) {
    const themeBucket = buckets.get(q.themeId);
    if (!themeBucket) continue;
    const arr = themeBucket.get(q.type) ?? [];
    arr.push(q);
    themeBucket.set(q.type, arr);
  }

  function byRecency(a: Question, b: Question): number {
    return a.createdAt - b.createdAt;
  }

  for (const themeBucket of buckets.values()) {
    for (const [type, arr] of themeBucket) {
      if (orderMode === "random") {
        themeBucket.set(type, shuffle(arr));
      } else if (orderMode === "new-first") {
        arr.sort((a, b) => {
          const aNew = (records.get(a.id)?.totalAttempts ?? 0) === 0;
          const bNew = (records.get(b.id)?.totalAttempts ?? 0) === 0;
          if (aNew !== bNew) return aNew ? -1 : 1;
          return byRecency(a, b);
        });
      } else if (orderMode === "wrong-first") {
        arr.sort((a, b) => {
          const aWrong = records.get(a.id)?.lastResult === "wrong";
          const bWrong = records.get(b.id)?.lastResult === "wrong";
          if (aWrong !== bWrong) return aWrong ? -1 : 1;
          return byRecency(a, b);
        });
      } else {
        arr.sort(byRecency);
      }
    }
  }

  const queue: Question[] = [];
  let remaining = eligible.length;
  while (remaining > 0) {
    for (const themeId of themeIds) {
      const themeBucket = buckets.get(themeId);
      if (!themeBucket) continue;
      for (const type of questionTypes) {
        const arr = themeBucket.get(type);
        if (arr && arr.length > 0) {
          queue.push(arr.shift()!);
          remaining--;
        }
      }
    }
  }

  return queue;
}

export interface QueueAfterRemoval {
  queue: Question[];
  /** 삭제된 문제가 큐의 마지막 항목이어서 더 이상 "다음 문제"가 없으면 true (새 사이클 필요). */
  needsNewCycle: boolean;
}

/**
 * Game Typing에서 현재 문제를 바로 삭제할 때 사용한다.
 * cursor는 그대로 둬도 된다 — 삭제된 문제를 빼면 다음 문제가 같은 인덱스로 당겨지기 때문이다.
 * 단, 삭제된 문제가 큐의 마지막이었다면(cursor가 새 큐 길이 이상) 더 보여줄 문제가 없어 새 사이클이 필요하다.
 */
export function removeFromCycleQueue(
  queue: Question[],
  cursor: number,
  idToRemove: string,
): QueueAfterRemoval {
  const next = queue.filter((q) => q.id !== idToRemove);
  return { queue: next, needsNewCycle: cursor >= next.length };
}
