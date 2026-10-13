// 학습 패키지(WJYEE / KB-Bridge / Self-Study) 도메인 타입.
// 패키지는 별도 앱이 아니라 하나의 Tipo 안에서 고르는 "학습 공간"이다. 콘텐츠 행은 패키지를 직접
// 참조하지 않고 PackageContentMapping으로 연결되므로, 같은 콘텐츠를 여러 패키지가 중복 저장 없이 쓴다.

export type PackageId = "wjyee" | "kb-bridge" | "self-study";

/** 패키지에 연결할 수 있는 콘텐츠 종류. question은 기존 questions 테이블(Category>Theme>Question)을 그대로 쓴다. */
export type PackageContentKind = "question" | "derived" | "concept" | "task" | "memo" | "resource";

/** 문항·콘텐츠 검수 상태. 가져온 초안은 항상 needs_human_review로 시작하며 자동으로 승격하지 않는다. */
export type ReviewStatus = "needs_human_review" | "reviewed" | "rejected";

export type ContentOrigin = "bundled" | "user";

export interface PackageContentMapping {
  /** `${packageId}:${kind}:${contentId}` — 결정적 id라 재가져오기가 중복을 만들지 않는다. */
  id: string;
  packageId: PackageId;
  kind: PackageContentKind;
  contentId: string;
  /** 패키지 안 카테고리 키(KB-Bridge는 oa_ai, sql ... ). 카테고리 없는 항목은 없다. */
  categoryKey?: string;
}

/** 원본 문제에 연결된 추가 복습 질문. 자동채점 문제가 아니라 "생각해보기" 질문이다. */
export interface DerivedQuestion {
  id: string;
  /** 원본 Question의 id (questions 테이블) */
  parentQuestionId: string;
  categoryKey: string;
  topic: string;
  prompt: string;
  learningObjective?: string;
  /** 검수 전 채점 가이드. 정답이 확정된 값이 아니다. */
  answerGuide?: string;
  reviewStatus: ReviewStatus;
}

export interface ConceptNote {
  id: string;
  categoryKey: string;
  title: string;
  summary?: string;
  /** 마크다운 본문 */
  body: string;
  reviewStatus: ReviewStatus;
}

export interface PracticeTask {
  id: string;
  categoryKey: string;
  title: string;
  task: string;
  tools: string;
  evaluation: string[];
  /** 사용자가 완료 표시한 시각. 재가져오기가 이 값을 덮어쓰지 않는다. */
  completedAt: number | null;
}

export interface MemoLink {
  label: string;
  url: string;
}

export interface Memo {
  id: string;
  /** 자유 문자열 카테고리 라벨 (예: 취업·커리어). 하드코딩된 목록이 아니라 데이터에서 모은다. */
  category: string;
  title: string;
  body: string;
  tags: string[];
  source: string;
  verified: boolean;
  links: MemoLink[];
  origin: ContentOrigin;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceLink {
  id: string;
  category: string;
  title: string;
  url: string;
  whenToUse: string;
  verification: string;
  origin: ContentOrigin;
}

export interface PackageDefinition {
  id: PackageId;
  name: string;
  description: string;
}

export interface PackageCategory {
  key: string;
  name: string;
  themeId: string;
  group: string;
}
