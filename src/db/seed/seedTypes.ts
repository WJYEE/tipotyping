import type { Difficulty, Question, QuestionType } from "@/types/domain";

export interface SeedQuestion {
  themeName: string;
  type: QuestionType;
  difficulty?: Difficulty;
  tagNames: string[];
  explanation?: string;
  payload: Question["payload"];
}
