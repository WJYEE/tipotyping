// docs/PRODUCT_SPEC.md 2장 "기본 대분류 / 하위테마"를 그대로 반영한 초기 시드 데이터.
// 대분류/하위테마는 초기값일 뿐이며 사용자가 이후 자유롭게 추가/수정할 수 있다.

export interface SeedTheme {
  name: string;
  /** 난이도 개념이 의미 있는 테마만 true (코딩 계열) — 6장 "테마별 난이도 사용 여부" */
  useDifficulty: boolean;
}

export interface SeedCategory {
  name: string;
  themes: SeedTheme[];
}

export const defaultCategories: SeedCategory[] = [
  {
    name: "코딩",
    themes: [
      { name: "SQL", useDifficulty: true },
      { name: "Python", useDifficulty: true },
      { name: "자료구조", useDifficulty: true },
      { name: "알고리즘", useDifficulty: true },
    ],
  },
  {
    name: "데이터",
    themes: [
      { name: "데이터분석", useDifficulty: false },
      { name: "통계", useDifficulty: false },
      { name: "Product Analytics", useDifficulty: false },
      { name: "Business Analytics", useDifficulty: false },
      { name: "A/B Test", useDifficulty: false },
      { name: "데이터 시각화", useDifficulty: false },
    ],
  },
  {
    name: "금융",
    themes: [
      { name: "금융기초", useDifficulty: false },
      { name: "은행", useDifficulty: false },
      { name: "카드", useDifficulty: false },
      { name: "핀테크·결제", useDifficulty: false },
      { name: "신용·여신", useDifficulty: false },
      { name: "투자·증권", useDifficulty: false },
      { name: "금융규제", useDifficulty: false },
    ],
  },
  {
    name: "비즈니스",
    themes: [
      { name: "이커머스", useDifficulty: false },
      { name: "플랫폼", useDifficulty: false },
      { name: "비즈니스모델", useDifficulty: false },
      { name: "KPI·지표", useDifficulty: false },
      { name: "마케팅", useDifficulty: false },
    ],
  },
  {
    name: "CS·IT",
    themes: [
      { name: "데이터베이스", useDifficulty: false },
      { name: "네트워크", useDifficulty: false },
      { name: "운영체제", useDifficulty: false },
      { name: "API·Web", useDifficulty: false },
      { name: "Cloud", useDifficulty: false },
      { name: "Git", useDifficulty: false },
    ],
  },
  {
    name: "AI",
    themes: [
      { name: "ML", useDifficulty: false },
      { name: "DL", useDifficulty: false },
      { name: "LLM", useDifficulty: false },
      { name: "RAG", useDifficulty: false },
      { name: "AI Agent", useDifficulty: false },
      { name: "AI 기초", useDifficulty: false },
    ],
  },
  {
    name: "취업",
    themes: [
      { name: "NCS", useDifficulty: false },
      { name: "인적성", useDifficulty: false },
      { name: "면접", useDifficulty: false },
      { name: "직무지식", useDifficulty: false },
    ],
  },
  {
    name: "언어",
    themes: [
      { name: "영어", useDifficulty: false },
      { name: "OPIc", useDifficulty: false },
      { name: "일본어", useDifficulty: false },
      { name: "스페인어", useDifficulty: false },
    ],
  },
];
