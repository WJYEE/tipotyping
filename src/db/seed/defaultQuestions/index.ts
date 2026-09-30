// 14장 Default Content: 8개 대분류 42개 테마 전체에 걸친 기본 문제은행.
// 공식 문서/공개 학습자료의 핵심 개념을 참고해 TipoTyping에 맞는 짧은 자체 문제로 새로 작성했다.
// (외부 사이트 문제를 그대로 복제하지 않음). 카테고리별 파일 + extra/ 확장 파일로 나눠 관리한다.
import { defaultCategories } from "@/db/seed/defaultCategories";
import { aiQuestions } from "@/db/seed/defaultQuestions/ai";
import { businessQuestions } from "@/db/seed/defaultQuestions/business";
import { careerQuestions } from "@/db/seed/defaultQuestions/career";
import { codingQuestions } from "@/db/seed/defaultQuestions/coding";
import { csitQuestions } from "@/db/seed/defaultQuestions/csit";
import { dataQuestions } from "@/db/seed/defaultQuestions/data";
import { extraQuestions } from "@/db/seed/defaultQuestions/extra";
import { financeQuestions } from "@/db/seed/defaultQuestions/finance";
import { languageQuestions } from "@/db/seed/defaultQuestions/language";
import type { SeedQuestion } from "@/db/seed/seedTypes";

export type { SeedQuestion } from "@/db/seed/seedTypes";

/**
 * 번들 기본 문제은행 버전. 문제를 추가·수정·삭제하면 1 올린다.
 * (올리지 않아도 번들 내용 해시로 변경이 감지되지만, 릴리스 이력 추적을 위해 함께 관리한다.)
 */
export const DEFAULT_CONTENT_VERSION = 1;

const DIFFICULTY_THEMES = new Set(
  defaultCategories.flatMap((c) => c.themes.filter((t) => t.useDifficulty).map((t) => t.name)),
);

/**
 * 난이도를 쓰지 않는 Theme(PRODUCT_SPEC 6장)의 문제에는 difficulty를 남기지 않는다.
 * 해당 Theme은 문제 편집 화면에서도 난이도를 숨기므로 시드 데이터도 같은 규칙을 따른다.
 */
function normalizeDifficulty(q: SeedQuestion): SeedQuestion {
  if (DIFFICULTY_THEMES.has(q.themeName) || q.difficulty === undefined) return q;
  const { difficulty: _omit, ...rest } = q;
  return rest;
}

export const defaultQuestions: SeedQuestion[] = [
  ...codingQuestions,
  ...dataQuestions,
  ...financeQuestions,
  ...businessQuestions,
  ...csitQuestions,
  ...aiQuestions,
  ...careerQuestions,
  ...languageQuestions,
  ...extraQuestions,
].map(normalizeDifficulty);
