import type { Difficulty, Question, QuestionType } from "@/types/domain";

export interface SeedQuestion {
  /**
   * 번들 기본 문제의 고정 식별자 (예: sql-0042). 한 번 부여하면 절대 바꾸거나 재사용하지 않는다.
   * 기존 사용자 DB와 동기화할 때 이 값으로 같은 문제를 찾는다. 새 문제는 해당 Theme의 다음 번호를 쓴다.
   */
  seedId: string;
  themeName: string;
  type: QuestionType;
  difficulty?: Difficulty;
  tagNames: string[];
  explanation?: string;
  payload: Question["payload"];
}
