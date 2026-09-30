// Category > Theme > Question 관계 및 Tag 참조를 표현하는 도메인 타입.
// docs/PRODUCT_SPEC.md 2~4장, 9장 기준.

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type QuestionType =
  | "blank"
  | "term-to-def"
  | "def-to-term"
  | "answer-input"
  | "multiple-choice"
  | "essay";

export type OrderMode = "sequential" | "random" | "new-first" | "wrong-first";

export type AnswerResult = "correct" | "wrong";

export interface Category {
  id: string;
  name: string;
  order: number;
  isCustom: boolean;
}

export interface Theme {
  id: string;
  categoryId: string;
  name: string;
  order: number;
  isCustom: boolean;
  /** 난이도 속성을 사용하는 테마인지 (PRODUCT_SPEC 6장) */
  useDifficulty: boolean;
  /** 기본 제공 Theme의 고정 식별자 (예: SQL). 이름을 바꿔도 기본 문제은행 동기화 대상으로 유지된다. */
  seedKey?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface BlankPayload {
  /** 빈칸 자리를 {{blankId}} 형태로 포함하는 원본 코드/문장 */
  template: string;
  blanks: { id: string; answer: string }[];
}

export interface TermDefPayload {
  term: string;
  definition: string;
}

export interface AnswerInputPayload {
  prompt: string;
  answer: string;
}

export interface MultipleChoicePayload {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface EssayPayload {
  prompt: string;
  /** MVP는 전체 Exact Match이므로 서술형도 참고용이 아닌 채점 기준 정답을 가진다 */
  answer: string;
}

interface QuestionBase {
  id: string;
  /** 사용자에게 노출되는 고유 식별자 (예: SQL-0001). 동일 Theme 내에서만 유일하면 된다. */
  displayCode: string;
  categoryId: string;
  themeId: string;
  tagIds: string[];
  difficulty?: Difficulty;
  explanation?: string;
  flagged: boolean;
  favorite: boolean;
  memo?: string;
  /** 번들 기본 문제에서 온 경우 그 seedId. 사용자 생성/Import 문제에는 없다. */
  seedId?: string;
  /** 마지막으로 번들 내용을 반영했을 때의 내용 해시. 현재 내용과 다르면 사용자가 수정한 것으로 본다. */
  seedHash?: string;
  createdAt: number;
  updatedAt: number;
}

export type Question =
  | (QuestionBase & { type: "blank"; payload: BlankPayload })
  | (QuestionBase & { type: "term-to-def"; payload: TermDefPayload })
  | (QuestionBase & { type: "def-to-term"; payload: TermDefPayload })
  | (QuestionBase & { type: "answer-input"; payload: AnswerInputPayload })
  | (QuestionBase & { type: "multiple-choice"; payload: MultipleChoicePayload })
  | (QuestionBase & { type: "essay"; payload: EssayPayload });

export interface BlankStat {
  blankId: string;
  totalAttempts: number;
  correctCount: number;
}

export interface QuestionRecord {
  questionId: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  lastResult: AnswerResult | null;
  lastAttemptAt: number | null;
  blankStats?: BlankStat[];
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  totalDurationMs: number;
  themeIds: string[];
  tagIds: string[];
  questionTypes: QuestionType[];
  difficulties: Difficulty[];
  orderMode: OrderMode;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
}

export interface BlankAttemptResult {
  blankId: string;
  isCorrect: boolean;
}

export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  questionType: QuestionType;
  isCorrect: boolean;
  userAnswer: string;
  blankResults?: BlankAttemptResult[];
  attemptedAt: number;
}

export interface SettingsRecord {
  id: string;
  value: unknown;
}
