// Career Dashboard 데모/목업 데이터. 실제 Career 데이터 계층(저장 JD/역량 추출/Evidence 연결 등)은
// 아직 없으므로, 화면을 보여주기 위한 최소한의 하드코딩 값만 여기에 모아둔다.
// Figma node 22:838("Career dashboard")의 값을 그대로 옮겼다 — 숫자/이름은 전부 예시다.
import type { CareerPillTone } from "@/features/career/components/CareerPill";

export interface OverviewMetric {
  id: string;
  icon: "bookmark" | "scan-search" | "link" | "alert-triangle";
  tone: "blue" | "purple" | "green" | "amber";
  label: string;
  value: string;
  note: string;
}

export const overviewMetrics: OverviewMetric[] = [
  { id: "saved-jd", icon: "bookmark", tone: "blue", label: "저장 JD", value: "14", note: "+3 이번 주" },
  { id: "competencies", icon: "scan-search", tone: "purple", label: "추출 Competency", value: "38", note: "7개 카테고리" },
  { id: "evidence", icon: "link", tone: "green", label: "연결 Evidence", value: "21", note: "연결률 55%" },
  { id: "gap", icon: "alert-triangle", tone: "amber", label: "Preparation Gap", value: "11", note: "우선순위 4" },
];

export type CompetencyCategory = "data" | "business" | "product" | "tools";

export const competencyCategoryLabel: Record<CompetencyCategory, string> = {
  data: "Data",
  business: "Business",
  product: "Product",
  tools: "Tools",
};

export const competencyCategoryTone: Record<CompetencyCategory, CareerPillTone> = {
  data: "blue",
  business: "green",
  product: "purple",
  tools: "amber",
};

export interface CompetencyBubble {
  id: string;
  name: string;
  category: CompetencyCategory;
  demandCount: number;
  totalJd: number;
  /**
   * 데모용 고정 좌표(버블 플롯 영역 기준 %, size는 지름 %). Figma의 손으로 배치한 좌표를 그대로
   * 옮긴 값이다. 실제 데이터가 생기면 수요 빈도 기반 패킹/배치 알고리즘으로 교체해야 한다
   * (지금은 데이터 계층을 크게 만들지 않기 위해 좌표를 데이터의 일부로만 둔다).
   */
  x: number;
  y: number;
  size: number;
}

export const competencyBubbles: CompetencyBubble[] = [
  { id: "sql", name: "SQL", category: "data", demandCount: 12, totalJd: 14, x: 12, y: 60, size: 32 },
  { id: "python", name: "Python", category: "data", demandCount: 10, totalJd: 14, x: 25, y: 55, size: 28 },
  { id: "stakeholder", name: "Stakeholder communication", category: "business", demandCount: 8, totalJd: 14, x: 38, y: 50, size: 29 },
  { id: "data-modeling", name: "Data modeling", category: "data", demandCount: 9, totalJd: 14, x: 27, y: 62, size: 26 },
  { id: "tableau", name: "Tableau / BI", category: "tools", demandCount: 7, totalJd: 14, x: 47, y: 61, size: 24 },
  { id: "experiment-design", name: "Experiment design", category: "product", demandCount: 6, totalJd: 14, x: 66, y: 50, size: 25 },
  { id: "product-metrics", name: "Product metrics", category: "product", demandCount: 5, totalJd: 14, x: 78, y: 62, size: 22 },
  { id: "business-insight", name: "Business insight", category: "business", demandCount: 6, totalJd: 14, x: 14, y: 74, size: 24 },
  { id: "etl", name: "ETL", category: "data", demandCount: 5, totalJd: 14, x: 27, y: 75, size: 19 },
  { id: "ab-testing", name: "A/B testing", category: "product", demandCount: 4, totalJd: 14, x: 39, y: 77, size: 21 },
  { id: "presentation", name: "Presentation", category: "business", demandCount: 4, totalJd: 14, x: 49, y: 74, size: 19 },
  { id: "ga4", name: "GA4", category: "tools", demandCount: 3, totalJd: 14, x: 57, y: 75, size: 17 },
  { id: "strategic-thinking", name: "Strategic thinking", category: "business", demandCount: 4, totalJd: 14, x: 67, y: 73, size: 21 },
];

export const competencyMapInsight = "SQL·Python 수요가 높고, Product 역량은 Evidence 연결이 낮습니다.";
export const competencyMapSizeGuide = "버블 크기 = 요구 JD 빈도 · 14개 저장 JD 기준";

export interface RoleMixEntry {
  id: string;
  name: string;
  percent: number;
  tone: CareerPillTone;
  colorVar: string; // bar/segment에 직접 쓰는 CSS color (tone과 매핑되는 solid 색)
}

export const roleMixEntries: RoleMixEntry[] = [
  { id: "business-da", name: "Business DA", percent: 24, tone: "blue", colorVar: "var(--color-career-blue)" },
  { id: "product-da", name: "Product DA", percent: 21, tone: "purple", colorVar: "var(--color-career-purple)" },
  { id: "bi-analyst", name: "BI Analyst", percent: 18, tone: "amber", colorVar: "var(--color-career-amber)" },
  { id: "pm", name: "PM", percent: 15, tone: "green", colorVar: "var(--color-career-green)" },
  { id: "planning", name: "기획", percent: 12, tone: "neutral", colorVar: "var(--color-career-navy)" },
  { id: "it-consultant", name: "IT Consultant", percent: 10, tone: "neutral", colorVar: "var(--color-career-text-secondary)" },
];

export const roleMixInsight = "분석 실행형 63% · 제품·기획형 27% · 컨설팅형 10%";

export type GapType = "knowledge" | "experience" | "evidence" | "qualification";

export const gapTypeLabel: Record<GapType, string> = {
  knowledge: "지식 부족",
  experience: "경험 부족",
  evidence: "Evidence 부족",
  qualification: "자격요건 부족",
};

export const gapTypeTone: Record<GapType, CareerPillTone> = {
  knowledge: "amber",
  experience: "green",
  evidence: "blue",
  qualification: "red",
};

export interface PreparationGapRow {
  id: string;
  competency: string;
  category: string;
  demandCount: number;
  totalJd: number;
  evidenceStatus: { label: string; tone: CareerPillTone };
  gapType: GapType;
  recommendedAction: string;
}

export const preparationGapRows: PreparationGapRow[] = [
  {
    id: "ab-testing",
    competency: "실험 설계 · A/B Testing",
    category: "Product",
    demandCount: 6,
    totalJd: 14,
    evidenceStatus: { label: "연결 없음", tone: "red" },
    gapType: "experience",
    recommendedAction: "작은 실험 프로젝트로 가설–검증 사례 만들기",
  },
  {
    id: "data-modeling",
    competency: "데이터 모델링",
    category: "Data",
    demandCount: 9,
    totalJd: 14,
    evidenceStatus: { label: "1개 · 약함", tone: "amber" },
    gapType: "evidence",
    recommendedAction: "커머스 DW 프로젝트의 모델링 의사결정 보강",
  },
  {
    id: "tableau",
    competency: "Tableau / BI 시각화",
    category: "Tools",
    demandCount: 7,
    totalJd: 14,
    evidenceStatus: { label: "2개 연결", tone: "green" },
    gapType: "knowledge",
    recommendedAction: "LOD·파라미터 심화 학습 후 대시보드 개선",
  },
  {
    id: "stakeholder",
    competency: "Stakeholder Communication",
    category: "Business",
    demandCount: 8,
    totalJd: 14,
    evidenceStatus: { label: "1개 · 약함", tone: "amber" },
    gapType: "evidence",
    recommendedAction: "협업 조율 과정과 결과 지표를 STAR로 기록",
  },
  {
    id: "sql-advanced",
    competency: "SQL Advanced",
    category: "Data",
    demandCount: 12,
    totalJd: 14,
    evidenceStatus: { label: "3개 연결", tone: "green" },
    gapType: "qualification",
    recommendedAction: "SQLD 자격 일정 확인 · 11월 시험 목표",
  },
  {
    id: "product-metrics",
    competency: "Product Metrics",
    category: "Product",
    demandCount: 5,
    totalJd: 14,
    evidenceStatus: { label: "연결 없음", tone: "red" },
    gapType: "experience",
    recommendedAction: "Activation·Retention 지표 정의 케이스 작성",
  },
];

export type AnalysisStatus = "done" | "in-progress" | "pending";

export const analysisStatusLabel: Record<AnalysisStatus, string> = {
  done: "분석 완료",
  "in-progress": "분석 중",
  pending: "분석 대기",
};

export const analysisStatusTone: Record<AnalysisStatus, CareerPillTone> = {
  done: "green",
  "in-progress": "blue",
  pending: "neutral",
};

export interface SavedJdRow {
  id: string;
  companyInitials: string;
  companyTone: CareerPillTone;
  companyName: string;
  positionTitle: string;
  positionMeta: string;
  savedTime: string;
  status: AnalysisStatus;
}

export const savedJdRows: SavedJdRow[] = [
  {
    id: "toss",
    companyInitials: "T",
    companyTone: "blue",
    companyName: "Toss",
    positionTitle: "Business Data Analyst",
    positionMeta: "Fintech · 경력 3–7년",
    savedTime: "오늘 10:42",
    status: "done",
  },
  {
    id: "kurly",
    companyInitials: "K",
    companyTone: "purple",
    companyName: "Kurly",
    positionTitle: "Product Data Analyst",
    positionMeta: "Commerce · 경력 3년 이상",
    savedTime: "어제 18:16",
    status: "done",
  },
  {
    id: "kakao-mobility",
    companyInitials: "KM",
    companyTone: "amber",
    companyName: "Kakao Mobility",
    positionTitle: "BI Analyst",
    positionMeta: "Mobility · 경력 2–5년",
    savedTime: "9월 29일",
    status: "done",
  },
  {
    id: "musinsa",
    companyInitials: "M",
    companyTone: "green",
    companyName: "MUSINSA",
    positionTitle: "Data Analyst · Product",
    positionMeta: "Fashion platform · 경력 3년 이상",
    savedTime: "9월 28일",
    status: "in-progress",
  },
  {
    id: "deloitte",
    companyInitials: "D",
    companyTone: "neutral",
    companyName: "Deloitte",
    positionTitle: "Technology Strategy Consultant",
    positionMeta: "Consulting · 신입/경력",
    savedTime: "9월 27일",
    status: "pending",
  },
];
