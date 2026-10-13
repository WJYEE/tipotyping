// Knowledge Constellation 데이터 타입. 실제 Category / Theme / QuestionRecord에서 만들어질 값과 호환되게 정의한다.
// (Phase 1은 curated mock만 사용하며 IndexedDB를 읽거나 쓰지 않는다.)

export type Vec3 = readonly [number, number, number];

/** 개념 별 하나 = (themeId, 대표 주제 태그) 묶음. Question 하나가 아니다. */
export interface StarNode {
  id: string;
  label: string;
  categoryId: string;
  themeId: string;
  /** 하늘 좌표(월드 단위). 결정적 레이아웃이 만든다. */
  position: Vec3;
  /** 이 개념에 속한 문제 수 / 한 번이라도 푼 문제 수 */
  questionCount: number;
  studiedCount: number;
  attemptCount: number;
  correctCount: number;
  /** 시도가 없으면 null */
  accuracy: number | null;
  lastStudiedAt: number | null;
  mastered: boolean;
  favorite: boolean;
}

export interface ConstellationNode {
  id: string;
  themeId: string;
  label: string;
  categoryId: string;
  starIds: string[];
  /** 별 id 쌍. 닫힌 도형이 아니라 트리에 가까운 얇은 연결선 */
  edges: readonly (readonly [string, string])[];
  /** 별자리 이름을 놓을 위치 */
  labelAnchor: Vec3;
}

export interface CategoryRegion {
  id: string;
  label: string;
  anchor: Vec3;
}

export interface SkyData {
  categories: CategoryRegion[];
  constellations: ConstellationNode[];
  stars: StarNode[];
}
