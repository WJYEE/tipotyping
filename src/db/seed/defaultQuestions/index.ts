// 14장 Default Content: 8개 대분류 42개 테마 전체에 걸친 기본 문제은행.
// 공식 문서/공개 학습자료의 핵심 개념을 참고해 TipoTyping에 맞는 짧은 자체 문제로 새로 작성했다.
// (외부 사이트 문제를 그대로 복제하지 않음). 카테고리별 파일로 나눠 관리한다.
import { aiQuestions } from "@/db/seed/defaultQuestions/ai";
import { businessQuestions } from "@/db/seed/defaultQuestions/business";
import { careerQuestions } from "@/db/seed/defaultQuestions/career";
import { codingQuestions } from "@/db/seed/defaultQuestions/coding";
import { csitQuestions } from "@/db/seed/defaultQuestions/csit";
import { dataQuestions } from "@/db/seed/defaultQuestions/data";
import { financeQuestions } from "@/db/seed/defaultQuestions/finance";
import { languageQuestions } from "@/db/seed/defaultQuestions/language";
import type { SeedQuestion } from "@/db/seed/seedTypes";

export type { SeedQuestion } from "@/db/seed/seedTypes";

export const defaultQuestions: SeedQuestion[] = [
  ...codingQuestions,
  ...dataQuestions,
  ...financeQuestions,
  ...businessQuestions,
  ...csitQuestions,
  ...aiQuestions,
  ...careerQuestions,
  ...languageQuestions,
];
