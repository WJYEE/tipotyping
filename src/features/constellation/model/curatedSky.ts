// Phase 1 전용 curated mock sky. 일부러 4개 별자리만 사용해 "별의 사실감"을 확인한다.
// 이름은 실제 Category / Theme / 개념 태그를 따르고, 학습 수치는 합성값이다. DB를 읽거나 쓰지 않는다.
// 좌표는 손으로 배치했다(결정적). 월드 단위: 카메라 z=100, fov 40 기준 화면 높이 ≈ 73, 16:9 너비 ≈ 129.
import type { CategoryRegion, ConstellationNode, SkyData, StarNode, Vec3 } from "@/features/constellation/model/types";

/** 합성 학습 기록의 기준 시각(결정성을 위해 고정). */
const NOW = Date.UTC(2026, 9, 2, 12);
const DAY = 24 * 60 * 60 * 1000;

interface StarSpec {
  label: string;
  at: Vec3;
  questions: number;
  studied: number;
  attempts: number;
  correct: number;
  mastered?: boolean;
  favorite?: boolean;
  daysAgo?: number;
}

interface ConstellationSpec {
  themeId: string;
  label: string;
  categoryId: string;
  stars: StarSpec[];
  /** stars 배열의 인덱스 쌍 */
  edges: [number, number][];
  labelAt: Vec3;
}

const SPECS: ConstellationSpec[] = [
  {
    themeId: "SQL",
    label: "SQL",
    categoryId: "coding",
    labelAt: [-35, -3.5, 0],
    stars: [
      { label: "JOIN", at: [-46, 15, 1.5], questions: 9, studied: 9, attempts: 74, correct: 66, mastered: true, favorite: true, daysAgo: 1 },
      { label: "GROUP BY", at: [-38.5, 9.5, -1], questions: 7, studied: 7, attempts: 46, correct: 39, mastered: true, daysAgo: 2 },
      { label: "서브쿼리", at: [-31, 16.5, 0.5], questions: 6, studied: 5, attempts: 24, correct: 17, daysAgo: 4 },
      { label: "윈도우함수", at: [-24.5, 8, -1.5], questions: 8, studied: 4, attempts: 15, correct: 9, daysAgo: 6 },
      { label: "CTE", at: [-35.5, 22, -0.5], questions: 4, studied: 2, attempts: 5, correct: 3, daysAgo: 12 },
      { label: "인덱스", at: [-44, 2.5, 1], questions: 5, studied: 4, attempts: 18, correct: 15, daysAgo: 3 },
      { label: "NULL", at: [-29, -0.5, 0], questions: 5, studied: 0, attempts: 0, correct: 0 },
    ],
    edges: [
      [5, 1],
      [1, 0],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 6],
    ],
  },
  {
    themeId: "Python",
    label: "Python",
    categoryId: "coding",
    labelAt: [-8, -26.5, 0],
    stars: [
      { label: "리스트", at: [-19, -9.5, -1], questions: 8, studied: 8, attempts: 40, correct: 31, daysAgo: 5 },
      { label: "슬라이싱", at: [-12.5, -15, 1], questions: 5, studied: 4, attempts: 17, correct: 14, daysAgo: 3 },
      { label: "Pandas", at: [-3.5, -10, 0], questions: 10, studied: 6, attempts: 28, correct: 20, favorite: true, daysAgo: 2 },
      { label: "groupby", at: [3.5, -16.5, -1.5], questions: 5, studied: 3, attempts: 9, correct: 5, daysAgo: 9 },
      { label: "얕은 복사", at: [-9, -22, 0.5], questions: 4, studied: 0, attempts: 0, correct: 0 },
      { label: "컴프리헨션", at: [-17.5, -19, 1.5], questions: 6, studied: 5, attempts: 21, correct: 16, daysAgo: 7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [0, 5],
    ],
  },
  {
    themeId: "금융기초",
    label: "금융기초",
    categoryId: "finance",
    labelAt: [31, 25.5, 0],
    stars: [
      { label: "기준금리", at: [21.5, 15, 0.5], questions: 7, studied: 7, attempts: 52, correct: 47, mastered: true, daysAgo: 1 },
      { label: "DSR", at: [29.5, 9, -1.5], questions: 5, studied: 4, attempts: 19, correct: 13, daysAgo: 4 },
      { label: "LTV", at: [38, 13.5, 1], questions: 5, studied: 3, attempts: 11, correct: 7, daysAgo: 8 },
      { label: "예금자보호", at: [35, 20, -0.5], questions: 4, studied: 4, attempts: 22, correct: 20, favorite: true, daysAgo: 6 },
      { label: "복리", at: [27.5, 20.5, 1], questions: 4, studied: 2, attempts: 6, correct: 4, daysAgo: 15 },
      { label: "환율", at: [42, 4.5, 0], questions: 5, studied: 0, attempts: 0, correct: 0 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 4],
      [4, 3],
      [2, 5],
    ],
  },
  {
    themeId: "RAG",
    label: "RAG",
    categoryId: "ai",
    labelAt: [32, -23.5, 0],
    stars: [
      { label: "Chunking", at: [18, -12, 1], questions: 6, studied: 6, attempts: 33, correct: 25, daysAgo: 1 },
      { label: "Embedding", at: [26.5, -17, -1], questions: 6, studied: 6, attempts: 61, correct: 54, mastered: true, favorite: true, daysAgo: 0 },
      { label: "Vector", at: [34.5, -13, 0], questions: 5, studied: 5, attempts: 29, correct: 23, daysAgo: 2 },
      { label: "Vector DB", at: [43, -18.5, 1.5], questions: 6, studied: 4, attempts: 16, correct: 10, daysAgo: 5 },
      { label: "Metadata", at: [41, -7.5, -1], questions: 5, studied: 3, attempts: 10, correct: 6, daysAgo: 9 },
      { label: "Retrieval", at: [31, -5.5, 0.5], questions: 5, studied: 3, attempts: 8, correct: 4, daysAgo: 11 },
      { label: "Semantic Search", at: [23.5, -6, 0], questions: 4, studied: 1, attempts: 2, correct: 1, daysAgo: 20 },
      { label: "Namespace", at: [49, -12.5, 0], questions: 4, studied: 0, attempts: 0, correct: 0 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [5, 6],
      [3, 7],
      [0, 6],
    ],
  },
];

const CATEGORIES: CategoryRegion[] = [
  { id: "coding", label: "코딩", anchor: [-29, 29, 0] },
  { id: "finance", label: "금융", anchor: [31, 31, 0] },
  { id: "ai", label: "AI", anchor: [33, -30, 0] },
];

export function buildCuratedSky(): SkyData {
  const stars: StarNode[] = [];
  const constellations: ConstellationNode[] = [];

  for (const spec of SPECS) {
    const ids = spec.stars.map((s) => `${spec.themeId}:${s.label}`);
    spec.stars.forEach((s, i) => {
      stars.push({
        id: ids[i],
        label: s.label,
        categoryId: spec.categoryId,
        themeId: spec.themeId,
        position: s.at,
        questionCount: s.questions,
        studiedCount: s.studied,
        attemptCount: s.attempts,
        correctCount: s.correct,
        accuracy: s.attempts > 0 ? s.correct / s.attempts : null,
        lastStudiedAt: s.daysAgo === undefined ? null : NOW - s.daysAgo * DAY,
        mastered: s.mastered ?? false,
        favorite: s.favorite ?? false,
      });
    });
    constellations.push({
      id: `constellation:${spec.themeId}`,
      themeId: spec.themeId,
      label: spec.label,
      categoryId: spec.categoryId,
      starIds: ids,
      edges: spec.edges.map(([a, b]) => [ids[a], ids[b]] as const),
      labelAnchor: spec.labelAt,
    });
  }

  return { categories: CATEGORIES, constellations, stars };
}
